/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Demo app and tests. The library build has its own config (vite.lib.config.ts).
export default defineConfig({
  plugins: [vue()],
  build: {
    // Firebase Hosting deploys this directory (see firebase.json).
    outDir: 'build'
  },
  test: {
    environment: 'happy-dom',
    globals: true
  }
});
