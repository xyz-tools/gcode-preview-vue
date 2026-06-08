---
hello: world
---

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const layerHeight = ref(0.2);
const lineWidth = ref(0.6);
const preview = ref();
let link;

onMounted(() => {
  link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
});

onBeforeUnmount(() => {
  link?.remove();
});

function handleExport() {
  // Instantiate an exporter
  const exporter = new STLExporter();

  // Configure export options
  const options = { binary: true }

  // Parse the input and generate the STL encoded output
  const mesh = preview.value.getModel();
  const result = exporter.parse(mesh, options);

  const file = 'model.stl';
  if (options.binary) {
    saveArrayBuffer(result, file )
  }
  else {
    saveString(result, file)
  }
}

function save( blob, filename ) {
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function saveString( text, filename ) {
  save( new Blob( [ text ], { type: 'text/plain' } ), filename );
}

function saveArrayBuffer( buffer, filename ) {
  save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
}
</script>

# Exporting

```
<input type="number" />
<input type="number" />

<GCodePreview src="benchy.gcode" />

```
<div class="mb-3">
<label>Layer height</label> <input v-model.number="layerHeight" type="number" min="0.01" step="0.05" />
</div>
<div class="">
<label>Line width</label> <input v-model.number="lineWidth" type="number" min="0.01" step="0.05" />
</div>

<GCodePreview ref="preview" src="benchy.gcode" :layerHeight="layerHeight" :lineWidth="lineWidth"  />

<button @click.prevent="handleExport">Export</button>
<style >
  input {
    border: 2px solid black;
    margin-bottom: 5px;
  }

  @media (prefers-color-scheme: dark) {
    input {
      border: 2px solid white;
    }
  }
</style>
