import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { GCodePreview as CorePreview } from 'gcode-preview';
import { defineComponent, h, ref } from 'vue';
import GCodePreview from './GCodePreview.vue';

vi.mock('gcode-preview', () => ({ GCodePreview: vi.fn() }));

type Mock = ReturnType<typeof vi.fn>;
interface FakePreview {
  processGCode: Mock;
  processGCodeStream: Mock;
  clear: Mock;
  dispose: Mock;
  sceneManager: { resize: Mock; [key: string]: unknown };
  [key: string]: unknown;
}

let instances: FakePreview[];
let log: string[];
let observers: { callback: () => void; observe: Mock; disconnect: Mock }[];
let wrapper: VueWrapper | undefined;
const originalFetch = globalThis.fetch;

// Records every assignment so tests can see exactly which setters ran.
function recordSets<T extends object>(target: T): T {
  return new Proxy(target, {
    set(obj, key, value) {
      log.push(`set ${String(key)}=${JSON.stringify(value)}`);
      return Reflect.set(obj, key, value);
    }
  });
}

beforeEach(() => {
  instances = [];
  log = [];
  observers = [];
  vi.mocked(CorePreview).mockImplementation(function () {
    const instance = recordSets<FakePreview>({
      processGCode: vi.fn(async () => void log.push('processGCode')),
      processGCodeStream: vi.fn(async () => void log.push('processGCodeStream')),
      clear: vi.fn(() => void log.push('clear')),
      dispose: vi.fn(),
      sceneManager: recordSets({ resize: vi.fn() })
    });
    instances.push(instance);
    return instance as unknown as CorePreview;
  });
  vi.stubGlobal('TextDecoderStream', class {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(public callback: () => void) {
        observers.push(this);
      }
    }
  );
  globalThis.fetch = vi.fn().mockResolvedValue(response());
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  globalThis.fetch = originalFetch;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function response(status = 200) {
  const body = { pipeThrough: vi.fn(() => 'decoded stream') };
  return { ok: status >= 200 && status < 300, status, body } as unknown as Response;
}

function render(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  const mounted = mount(GCodePreview, { props, attrs });
  wrapper = mounted;
  return mounted;
}

const fetchMock = () => vi.mocked(globalThis.fetch);
const constructorOptions = () => vi.mocked(CorePreview).mock.calls[0][0];

test('creates the preview with the canvas and only the given options', async () => {
  const buildVolume = { x: 200, y: 200, z: 180, smallGrid: false };
  const w = render({ src: '/a.gcode', gcode: undefined, buildVolume, droppable: true, extrusionColor: 'red' });
  await flushPromises();

  expect(CorePreview).toHaveBeenCalledTimes(1);
  // Exact match: no src/gcode/listeners, and absent options aren't passed at all.
  expect(constructorOptions()).toEqual({
    canvas: w.find('canvas').element,
    buildVolume,
    droppable: true,
    extrusionColor: 'red'
  });
  expect('renderExtrusion' in constructorOptions()).toBe(false);
  // Vue would cast an absent Boolean prop to false without the undefined default.
  expect(w.props('renderExtrusion')).toBeUndefined();
  expect(w.props('orthographic')).toBeUndefined();
  expect(w.emitted('ready')).toEqual([[instances[0]]]);
});

test('renders one canvas with a default aria-label and falls through attributes', () => {
  expect(render().html()).toBe('<canvas aria-label="G-code preview"></canvas>');
  wrapper!.unmount();
  const canvas = render({}, { class: 'viewer', style: 'height: 400px', 'aria-label': 'Benchy' }).find('canvas');
  expect(canvas.attributes()).toMatchObject({ class: 'viewer', style: 'height: 400px;', 'aria-label': 'Benchy' });
});

test('streams the decoded src and applies the layer range after loading', async () => {
  const w = render({ src: '/a.gcode', startLayer: 20, endLayer: 150 });
  await flushPromises();
  const preview = instances[0];

  const [url, init] = fetchMock().mock.calls[0];
  expect(url).toBe('/a.gcode');
  expect(init!.signal).toBeInstanceOf(AbortSignal);
  const { body } = await fetchMock().mock.results[0].value;
  expect(vi.mocked(body.pipeThrough).mock.calls[0][0]).toBeInstanceOf(TextDecoderStream);
  expect(preview.processGCodeStream).toHaveBeenCalledWith('decoded stream');
  expect(log).toEqual(['clear', 'processGCodeStream', 'set startLayer=20', 'set endLayer=150']);
  expect(w.emitted('load')).toEqual([[preview]]);
});

test('accepts a URL object as src', async () => {
  const src = new URL('https://example.com/a.gcode');
  render({ src });
  await flushPromises();
  expect(fetchMock().mock.calls[0][0]).toBe(src);
});

test('processes gcode directly, and gcode wins over src', async () => {
  const w = render({ gcode: 'G1 X10', src: '/a.gcode' });
  await flushPromises();
  const preview = instances[0];
  expect(fetchMock()).not.toHaveBeenCalled();
  expect(preview.processGCode).toHaveBeenCalledWith('G1 X10');
  expect(w.emitted('load')).toHaveLength(1);

  await w.setProps({ gcode: ['G1 X1', 'G1 X2'] });
  await flushPromises();
  expect(preview.processGCode).toHaveBeenLastCalledWith(['G1 X1', 'G1 X2']);

  log.length = 0;
  await w.setProps({ gcode: undefined, src: undefined });
  await flushPromises();
  expect(log).toEqual(['clear']);
  expect(w.emitted('load')).toHaveLength(2);
});

test('replacing src aborts the old fetch and ignores its late response', async () => {
  let resolveOld!: (value: Response) => void;
  fetchMock().mockImplementationOnce(() => new Promise(resolve => (resolveOld = resolve)));
  const w = render({ src: '/old.gcode' });
  await flushPromises();

  await w.setProps({ src: '/new.gcode' });
  await flushPromises();
  expect(fetchMock().mock.calls[0][1]!.signal!.aborted).toBe(true);
  resolveOld(response());
  await flushPromises();

  const preview = instances[0];
  expect(preview.processGCodeStream).toHaveBeenCalledTimes(1);
  expect(fetchMock().mock.calls[1][0]).toBe('/new.gcode');
  expect(w.emitted('load')).toHaveLength(1);
  expect(w.emitted('error')).toBeUndefined();
});

test('a live option change calls only that setter; mount-only changes are ignored', async () => {
  const w = render({ extrusionColor: 'red', topLayerColor: 'white', droppable: true });
  await flushPromises();
  const preview = instances[0];

  log.length = 0;
  await w.setProps({ extrusionColor: 'blue' });
  expect(log).toEqual(['set extrusionColor="blue"']);

  log.length = 0;
  await w.setProps({ droppable: false, initialCameraPosition: [0, 1, 2], keepLines: true });
  expect(log).toEqual([]);
  expect(CorePreview).toHaveBeenCalledTimes(1);

  log.length = 0;
  await w.setProps({ buildVolume: { x: 1, y: 2, z: 3, smallGrid: false } });
  await w.setProps({ buildVolume: { x: 1, y: 2, z: 3, smallGrid: false } }); // equal object, new identity
  await w.setProps({ devMode: true });
  expect(log).toEqual(['set buildVolume={"x":1,"y":2,"z":3,"smallGrid":false}', 'set devMode=true']);
  expect(preview.devMode).toBe(true);
});

test('a live option set to undefined is only passed on to setters that accept it', async () => {
  const w = render({ extrusionColor: 'red', renderTravel: true, topLayerColor: 'white', startLayer: 3 });
  await flushPromises();
  log.length = 0;
  await w.setProps({ extrusionColor: undefined, renderTravel: undefined, topLayerColor: undefined, startLayer: undefined });
  expect(log.sort()).toEqual(['set startLayer=undefined', 'set topLayerColor=undefined']);
});

test('a failed fetch emits an error and stays quiet on the console when handled', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock().mockResolvedValue(response(404));
  const onError = vi.fn();
  const w = render({ src: '/missing.gcode', onError });
  await flushPromises();

  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(onError.mock.calls[0][0].message).toBe('HTTP 404: /missing.gcode');
  expect(w.emitted('load')).toBeUndefined();
  expect(consoleError).not.toHaveBeenCalled();
});

test('a failed fetch without an error listener is logged to the console', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock().mockResolvedValue(response(404));
  render({ src: '/missing.gcode' });
  await flushPromises();
  expect(consoleError).toHaveBeenCalledTimes(1);
  expect(consoleError.mock.calls[0][0].message).toBe('HTTP 404: /missing.gcode');
});

test('resizes on ResizeObserver callbacks and cleans up on unmount', async () => {
  let resolveFetch!: (value: Response) => void;
  fetchMock().mockImplementationOnce(() => new Promise(resolve => (resolveFetch = resolve)));
  const w = render({ src: '/a.gcode' });
  await flushPromises();
  const preview = instances[0];
  const [observer] = observers;

  expect(observer.observe).toHaveBeenCalledWith(w.find('canvas').element);
  observer.callback();
  expect(preview.sceneManager.resize).toHaveBeenCalledTimes(1);

  w.unmount();
  wrapper = undefined;
  expect(fetchMock().mock.calls[0][1]!.signal!.aborted).toBe(true);
  expect(observer.disconnect).toHaveBeenCalledTimes(1);
  expect(preview.dispose).toHaveBeenCalledTimes(1);

  // A response arriving after unmount must not touch the disposed preview.
  resolveFetch(response());
  await flushPromises();
  expect(preview.processGCodeStream).not.toHaveBeenCalled();
  expect(w.emitted('load')).toBeUndefined();
});

test('exposes the preview instance through a template ref', async () => {
  const previewRef = ref<InstanceType<typeof GCodePreview>>();
  const Parent = defineComponent(() => () => h(GCodePreview, { ref: previewRef }));
  wrapper = mount(Parent);
  expect(previewRef.value!.preview).toBe(instances[0]);

  wrapper.unmount();
  wrapper = undefined;
  expect(previewRef.value).toBeNull();
});
