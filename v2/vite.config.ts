import { defineConfig } from 'vite';

// Built output is committed to ../public/v2 and served by the existing Express app at /v2/.
export default defineConfig({
  base: '/v2/',
  build: {
    outDir: '../public/v2',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: { maplibre: ['maplibre-gl'] }
      }
    }
  }
});
