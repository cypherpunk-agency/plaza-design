import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Absolute base: the app uses BrowserRouter, so a deep route like
  // /demos/gallery is served index.html by the host's SPA fallback. A
  // relative base would resolve assets against /demos/ and 404.
  base: '/',
});
