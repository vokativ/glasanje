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
    // Publish into the deployment's expected subdirectory; each build clears
    // that directory first so files removed from the bundle are not served later.
    build: {
      outDir: 'dist/glasanje',
      emptyOutDir: true,
      // Keep large, independently changing dependencies in stable browser-cache
      // units. These package-path checks are Rollup module IDs, not URL routes.
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
      // Surface unusually large chunks; this threshold accommodates the isolated
      // PDF engine while preserving a warning for unexpected bundle growth.
      chunkSizeWarningLimit: 800,
    },
    server: {
      port: 3000,
    },
    // A configured host restricts `vite preview` to that deployment endpoint;
    // without it, Vite keeps its default preview host policy.
    preview: {
      allowedHosts: previewAllowedHost ? [previewAllowedHost] : undefined,
    },
  };
});
