import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const outputDirectory = 'dist/glasanje';
const requiredPrecacheAssets = [
  'favicon.ico',
  'assets/rotunda-serbica-envelope.webp',
  'assets/Roboto-Regular.ttf',
  'assets/Zahtev-za-glasanje-u-inostranstvu-2026-09-10.pdf',
];

export default defineConfig(({ mode }) => {
  const { PREVIEW_ALLOWED_HOST: previewAllowedHost } = loadEnv(
    mode,
    process.cwd(),
    '',
  );
  const offlineBuildId = randomUUID();
  const outputPath = resolve(process.cwd(), outputDirectory);

  return {
    define: {
      __OFFLINE_BUILD_ID__: JSON.stringify(offlineBuildId),
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        scope: '/',
        injectRegister: false,
        registerType: 'prompt',
        manifest: false,
        includeAssets: [],
        includeManifestIcons: false,
        devOptions: {
          enabled: false,
        },
        showMaximumFileSizeToCacheInBytesWarning: false,
        injectManifest: {
          rollupFormat: 'iife',
          target: ['es2022', 'safari16.4', 'chrome111'],
          globPatterns: [
            'index.html',
            'assets/**/*.{js,css,wasm}',
            ...requiredPrecacheAssets,
          ],
          globIgnores: ['**/*.map', 'sw.js', 'workbox-*.js'],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          manifestTransforms: [
            async (entries) => {
              const manifest = await Promise.all(
                entries.map(async (entry) => {
                  const assetPath = resolve(
                    outputPath,
                    entry.url.replace(/^\/+/, ''),
                  );
                  const bytes = await readFile(assetPath);

                  return {
                    ...entry,
                    integrity: `sha256-${createHash('sha256')
                      .update(bytes)
                      .digest('base64')}`,
                  };
                }),
              );
              const precachedUrls = new Set(
                manifest.map((entry) => entry.url),
              );
              const missingAssets = requiredPrecacheAssets.filter(
                (asset) => !precachedUrls.has(asset),
              );

              if (missingAssets.length > 0) {
                throw new Error(
                  `Required offline assets are missing: ${missingAssets.join(', ')}`,
                );
              }

              return { manifest, warnings: [] };
            },
          ],
        },
      }),
    ],
    build: {
      outDir: outputDirectory,
      emptyOutDir: true,
      target: ['es2022', 'safari16.4', 'chrome111'],
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
