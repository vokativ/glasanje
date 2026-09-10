import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const { PREVIEW_ALLOWED_HOST: previewAllowedHost } = loadEnv(
    mode,
    process.cwd(),
    '',
  );

  return {
    plugins: [react()],
    build: {
      outDir: 'dist/glasanje',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('/node_modules/pdf-lib/') ||
              id.includes('/node_modules/@pdf-lib/fontkit/')
            ) {
              return 'pdf-engine';
            }

            if (id.includes('/node_modules/signature_pad/')) {
              return 'signature';
            }

            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/')
            ) {
              return 'react-vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
    server: {
      port: 3000,
    },
    preview: {
      allowedHosts: previewAllowedHost ? [previewAllowedHost] : undefined,
    },
  };
});
