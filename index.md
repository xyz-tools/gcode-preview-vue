---
hello: world
---

<script setup>
import { ref } from 'vue';

const status = ref('Loading…');
const buildVolume = { x: 250, y: 220, z: 150 };
const cameraPosition = [0, 400, 450];
</script>

# GCode Preview

```vue
<GCodePreview
  class="preview"
  src="benchy.gcode"
  droppable
  render-tubes
  :build-volume="{ x: 250, y: 220, z: 150 }"
  :initial-camera-position="[0, 400, 450]"
  extrusion-color="cyan"
  @load="status = ''"
  @error="error => (status = error.message)"
/>
```

<GCodePreview
  class="preview"
  src="benchy.gcode"
  droppable
  render-tubes
  :build-volume="buildVolume"
  :initial-camera-position="cameraPosition"
  extrusion-color="cyan"
  :extrusion-width="1.1"
  :line-height="0.2"
  @load="status = ''"
  @error="error => (status = error.message)"
/>

<p v-if="status" role="status">{{ status }}</p>

<style>
.preview {
  display: block;
  width: 100%;
  height: 400px;
  outline: none;
}
</style>
