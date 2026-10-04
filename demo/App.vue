<script setup lang="ts">
import { ref } from 'vue';
import { GCodePreview } from '../src';

const src = `${import.meta.env.BASE_URL}benchy.gcode`;
const status = ref('Loading G-code…');
const buildVolume = { x: 250, y: 220, z: 150, smallGrid: true };
const cameraPosition: [number, number, number] = [0, 400, 450];
</script>

<template>
  <h1>GCode Preview Vue demo</h1>
  <p>Drop a <code>.gcode</code> file onto the canvas to preview your own print.</p>
  <GCodePreview
    class="gcode-preview"
    :src="src"
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
</template>
