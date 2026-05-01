import { fileURLToPath } from 'node:url';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

const config = defineConfig(() => {
  return {
    plugins: [
      nitro({
        rollupConfig: {
          external: [
            '@google-cloud/error-reporting',
            '@google-cloud/logging-winston',
            'winston',
          ],
        },
      }),
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tanstackStart(),
      viteReact(),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: (source, filename) => {
            const f = filename.replace(/\\/g, '/');

            // Prevent injection into global styles
            if (f.includes('/src/assets/styles/')) {
              return source;
            }

            // Inject global styles
            return `@use "~/assets/styles/main.scss" as *;\n${source}`;
          },
        },
      },
    },
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});

export default config;
