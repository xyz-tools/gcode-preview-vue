import type { GCodePreview, GCodePreviewOptions } from 'gcode-preview';

/** Every core option is a prop, except `canvas`: the component renders its own. */
export type GCodePreviewOptionProps = Omit<GCodePreviewOptions, 'canvas'>;

export type GCodePreviewProps = GCodePreviewOptionProps & {
  /** URL of a G-code file to fetch and stream in. */
  src?: string | URL;
  /** G-code to process directly. Wins over `src` when both are set. */
  gcode?: string | string[];
};

type OptionKey = keyof GCodePreviewOptionProps;

/** Options with a live setter: a prop change updates the preview in place. */
export const LIVE_OPTIONS = [
  'buildVolume',
  'backgroundColor',
  'extrusionColor',
  'travelColor',
  'topLayerColor',
  'lastSegmentColor',
  'boundingBoxColor',
  'startLayer',
  'endLayer',
  'renderExtrusion',
  'renderTravel',
  'renderTubes',
  'lineWidth',
  'lineHeight',
  'extrusionWidth',
  'disableGradient',
  'orthographic',
  'devMode'
] as const satisfies readonly OptionKey[];

/** Options the core only reads in its constructor: later prop changes are ignored. */
export const MOUNT_OPTIONS = [
  'initialCameraPosition',
  'minLayerThreshold',
  'droppable',
  'keepLines',
  'liveRenderInterval',
  'arcChordTolerance'
] as const satisfies readonly OptionKey[];

// A core option missing from both lists fails the typecheck here.
type Unlisted = Exclude<OptionKey, (typeof LIVE_OPTIONS)[number] | (typeof MOUNT_OPTIONS)[number]>;
const allListed: [Unlisted] extends [never] ? true : Unlisted = true;
void allListed;

export type LiveOption = (typeof LIVE_OPTIONS)[number];

// Setters that take `undefined` to clear or reset; for the others an undefined
// prop is skipped and the preview keeps its last value.
const UNSETTABLE = new Set<LiveOption>([
  'startLayer',
  'endLayer',
  'topLayerColor',
  'lastSegmentColor',
  'boundingBoxColor',
  'buildVolume',
  'lineHeight',
  'extrusionWidth',
  'devMode'
]);

export function applyOption(preview: GCodePreview, key: LiveOption, value: unknown) {
  if (value === undefined && !UNSETTABLE.has(key)) return;
  if (key === 'devMode') preview.devMode = value as GCodePreviewOptions['devMode'];
  else Reflect.set(preview.sceneManager, key, value);
}

export function pickOptions(props: GCodePreviewOptionProps): GCodePreviewOptionProps {
  const options: Record<string, unknown> = {};
  for (const key of [...LIVE_OPTIONS, ...MOUNT_OPTIONS]) {
    if (props[key] !== undefined) options[key] = props[key];
  }
  return options;
}

/**
 * Template literals like `:build-volume="{ x: 200, y: 200, z: 200 }"` create a new
 * object on every parent render; compare one level deep so equal values don't
 * re-run setters that rebuild geometry.
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!isPlain(a) || !isPlain(b) || Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every(key => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
  );
}

function isPlain(value: unknown): value is object {
  if (Array.isArray(value)) return true;
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
