import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        verify: resolve(__dirname, 'verify.html'),
        docs: resolve(__dirname, 'docs.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
      },
    },
  },
  publicDir: 'public',
});
