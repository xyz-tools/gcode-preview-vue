# gcode-preview-vue

A Vue 3 component for [gcode-preview](https://github.com/xyz-tools/gcode-preview):
it renders a 3D preview of G-code on a `<canvas>`.

## Install

```sh
npm install gcode-preview-vue gcode-preview
```

`vue` (^3.3) and `gcode-preview` (^3.0.0-alpha.6) are peer dependencies. Color
props are typed with three.js's `ColorRepresentation`; with TypeScript, install
`@types/three` so those types resolve.

## Usage

```vue
<script setup lang="ts">
import { GCodePreview } from 'gcode-preview-vue';
</script>

<template>
  <GCodePreview
    class="preview"
    src="/benchy.gcode"
    :build-volume="{ x: 250, y: 220, z: 150 }"
    extrusion-color="cyan"
    @error="error => console.warn(error.message)"
  />
</template>

<style>
.preview {
  display: block;
  width: 100%;
  height: 400px;
}
</style>
```

## Props

| prop | type | |
|---|---|---|
| `src` | `string \| URL` | URL of a G-code file; it is fetched and streamed in. |
| `gcode` | `string \| string[]` | G-code to process directly. Wins over `src` when both are set. |

Changing `src` or `gcode` starts a new load: the previous fetch is aborted and
the preview is cleared. Unsetting both clears the preview. A new `gcode` array
starts a new load even if its lines are the same.

Every other prop is an option of the core `GCodePreview` (all of
`GCodePreviewOptions` except `canvas`), with the same name and type. See the
[gcode-preview docs](https://gcode-preview.web.app/docs) for what each does.
Absent props are not passed on, so the core defaults apply.

**Live** options update the preview in place when the prop changes:

`buildVolume`, `backgroundColor`, `extrusionColor`, `travelColor`,
`topLayerColor`, `lastSegmentColor`, `boundingBoxColor`, `startLayer`,
`endLayer`, `renderExtrusion`, `renderTravel`, `renderTubes`, `lineWidth`,
`lineHeight`, `extrusionWidth`, `disableGradient`, `orthographic`, `devMode`

**Mount-only** options are read once when the preview is created; later changes
are ignored:

`initialCameraPosition`, `minLayerThreshold`, `droppable`, `keepLines`,
`liveRenderInterval`, `arcChordTolerance`

Notes:

- Only options whose value changed are applied. Plain objects and arrays are
  compared one level deep, so an inline `:build-volume="{ ... }"` doesn't
  rebuild the scene on every parent render.
- Setting a live option back to `undefined` resets it only where the core
  accepts that: `startLayer`, `endLayer`, `topLayerColor`, `lastSegmentColor`,
  `boundingBoxColor`, `buildVolume`, `lineHeight`, `extrusionWidth` and
  `devMode`. For the others the preview keeps its last value.
- `startLayer` and `endLayer` are applied again after every load, since the
  core clamps them against the loaded job.

## Events

| event | payload | |
|---|---|---|
| `@ready` | `preview: GCodePreview` | The preview was created. |
| `@load` | `preview: GCodePreview` | A load from `src` or `gcode` finished. |
| `@error` | `error: Error` | A load failed (e.g. `HTTP 404: /missing.gcode`). |

Without an `@error` listener, load errors are logged with `console.error`.
Superseded loads (aborted because `src`/`gcode` changed, or because the
component unmounted) fire no events.

## Instance access

The component exposes the core `GCodePreview` instance as `preview`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { GCodePreview } from 'gcode-preview-vue';

const previewRef = ref<InstanceType<typeof GCodePreview>>();

function scene() {
  return previewRef.value?.preview?.sceneManager.scene;
}
</script>

<template>
  <GCodePreview ref="previewRef" src="/benchy.gcode" />
</template>
```

`preview` is undefined before mount and after unmount. The `@ready` and `@load`
events also pass the instance.

## Sizing

The component renders a single `<canvas>` and ships no CSS: size the canvas
with CSS. Attributes such as `class`, `style` and `id` fall through to the
canvas. It has `aria-label="G-code preview"` unless you pass your own. A
`ResizeObserver` keeps the rendering in sync with the canvas size.

## Development

This repo also holds a small Vite demo app (`index.html`, `demo/`), which imports
the component from `src/`.

```sh
npm install
npm run dev            # demo app
npm run build:demo     # build the demo app into build/ (deployed to Firebase)
npm run build          # build the library into dist/
npm test               # unit tests (vitest)
npm run typecheck
npm run lint:package   # publint
```

The package has `"private": true`, which blocks `npm publish`. Remove it from
`package.json` to publish.
