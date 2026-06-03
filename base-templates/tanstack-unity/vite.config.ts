import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

const config = defineConfig(() => {
  return {
    plugins: [
      tailwindcss(),
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

            // Shared SCSS variables are available in every module.
            // No @layer wrapping — CSS modules already scope by hashed class
            // names, and wrapping in @layer components causes Tailwind 4's
            // @layer base preflight to beat component styles (base is declared
            // after components when layers collide).
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
