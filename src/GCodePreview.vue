<template>
  <canvas ref="canvas" aria-label="G-code preview"></canvas>
</template>

<script setup lang="ts">
import { GCodePreview } from 'gcode-preview';
import { getCurrentInstance, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { LIVE_OPTIONS, applyOption, pickOptions, sameValue, type GCodePreviewProps } from './options';

// Boolean props default to `false` in Vue when absent; an explicit undefined
// default keeps them absent so the core's own defaults apply.
const props = withDefaults(defineProps<GCodePreviewProps>(), {
  renderExtrusion: undefined,
  renderTravel: undefined,
  renderTubes: undefined,
  disableGradient: undefined,
  orthographic: undefined,
  droppable: undefined,
  keepLines: undefined,
  devMode: undefined
});

const emit = defineEmits<{
  ready: [preview: GCodePreview];
  load: [preview: GCodePreview];
  error: [error: Error];
}>();

const canvas = shallowRef<HTMLCanvasElement | null>(null);
// shallowRef: the preview holds three.js objects that must never become deep-reactive.
const preview = shallowRef<GCodePreview>();
defineExpose({ preview });

const instance = getCurrentInstance();
let observer: ResizeObserver | undefined;
let controller: AbortController | undefined;
let loadId = 0;

onMounted(() => {
  const created = new GCodePreview({ ...pickOptions(props), canvas: canvas.value! });
  preview.value = created;
  observer = new ResizeObserver(() => created.sceneManager.resize());
  observer.observe(canvas.value!);
  emit('ready', created);
  if (props.gcode != null || props.src != null) void load();
});

onBeforeUnmount(() => {
  loadId++;
  controller?.abort();
  observer?.disconnect();
  preview.value?.dispose();
  preview.value = undefined;
});

for (const key of LIVE_OPTIONS) {
  watch(
    () => props[key],
    (value, old) => {
      if (preview.value && !sameValue(value, old)) applyOption(preview.value, key, value);
    }
  );
}

// String(src) so an equal URL object recreated on re-render doesn't refetch.
watch([() => props.gcode, () => (props.src == null ? undefined : String(props.src))], () => void load());

async function load() {
  const current = preview.value;
  if (!current) return;
  const id = ++loadId;
  controller?.abort();
  controller = undefined;
  current.clear();

  const { gcode, src } = props;
  if (gcode == null && src == null) return;
  try {
    if (gcode != null) {
      await current.processGCode(gcode);
    } else {
      controller = new AbortController();
      const response = await fetch(src!, { signal: controller.signal });
      if (id !== loadId) return;
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${src}`);
      if (!response.body) throw new Error(`Empty response body: ${src}`);
      await current.processGCodeStream(response.body.pipeThrough(new TextDecoderStream()));
    }
    if (id !== loadId) return;
    // The layer setters clamp against the loaded job, so they only stick now.
    current.sceneManager.startLayer = props.startLayer;
    current.sceneManager.endLayer = props.endLayer;
    emit('load', current);
  } catch (error) {
    // Superseded or unmounted loads (including our own aborts) stay silent.
    if (id !== loadId) return;
    const err = error instanceof Error ? error : new Error(String(error));
    emit('error', err);
    if (!hasErrorListener()) console.error(err);
  }
}

// Declared emits don't show up in attrs; the parent's listeners live on the vnode props.
function hasErrorListener() {
  const vnodeProps = instance?.vnode.props;
  return !!(vnodeProps?.onError || vnodeProps?.onErrorOnce);
}
</script>
