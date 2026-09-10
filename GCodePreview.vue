<template>
  <div>
    <canvas ref="preview"></canvas>
  </div>
</template>

<script>
import { GCodePreview } from 'gcode-preview';
const chunkSize = Infinity;

export default {
  props: {
    src: String,
    topLayerColor: String,
    lastSegmentColor: String,
    endLayer: Number,
    startLayer: Number,
    lineWidth: Number,
    layerHeight: Number
  },

  data() {
    return {
      layerCount: 0
    };
  },

  async mounted() {
    this.preview = new GCodePreview({
      droppable: true,
      renderTubes: true,
      canvas: this.$refs.preview,
      endLayer: this.endLayer,
      startLayer: this.startLayer,
      topLayerColor: this.topLayerColor,
      lastSegmentColor: this.lastSegmentColor,
      buildVolume: { x: 250, y: 220, z: 150 },
      initialCameraPosition: [0, 400, 450],
      extrusionColor: 'cyan',
      extrusionWidth: this.lineWidth ?? 1.1,
      lineHeight: this.layerHeight ?? 0.2
    });

    this.resizeHandler = () => {
      this.preview.sceneManager.resize();
    };
    window.addEventListener('resize', this.resizeHandler);

    const lines1 = await this.fetchGcode(this.src);
    this.loadPreviewChunked(lines1, 50);
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.resizeHandler);
    this.preview?.dispose();
  },

  watch: {
    layerHeight(value) {
      if (!this.preview || value == null) return;
      this.preview.sceneManager.lineHeight = value;
      this.preview.sceneManager.render();
    },
    lineWidth(value) {
      if (!this.preview || value == null) return;
      this.preview.sceneManager.extrusionWidth = value;
      this.preview.sceneManager.render();
    }
  },

  methods: {
    processGCode(gcode) {
      this.preview.processGCode(gcode);
      // this.layerCount = this.preview.layers.length;
    },
    async fetchGcode(url) {
      const response = await fetch(url);

      if (response.status !== 200) {
        throw new Error(`status code: ${response.status}`);
      }

      const file = await response.text();
      return file.split('\n');
    },

    loadPreviewChunked(lines, delay) {
      let c = 0;
      const id = '__animationTimer__' + Math.random().toString(36).substr(2, 9);
      const loadProgressive = () => {
        const start = c * chunkSize;
        const end = (c + 1) * chunkSize;
        const chunk = lines.slice(start, end);
        this.processGCode(chunk);
        c++;
        if (c * chunkSize < lines.length) {
          window[id] = setTimeout(loadProgressive, delay);
        }
      };
      // cancel loading process if one is still in progress
      // mostly when hot reloading
      window.clearTimeout(window[id]);
      loadProgressive();
    },
    getModel() {
      return this.preview.sceneManager.scene;
    }
  }
};
</script>
<style scoped>
canvas {
  outline: none;
  width: 100%;
  height: 100%;
}
</style>
