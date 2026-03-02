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
        status: resolve(__dirname, 'status.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        refund: resolve(__dirname, 'refund.html'),
      },
    },
  },
  publicDir: 'public',
});
