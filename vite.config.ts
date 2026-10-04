/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Library build. The VitePress demo has its own config (.vitepress/), which
// opts out of this file.
export default defineConfig({
  plugins: [vue()],
  // public/ holds the demo's sample files; keep them out of the package.
  publicDir: false,
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['vue', 'gcode-preview', 'three']
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true
  }
});
