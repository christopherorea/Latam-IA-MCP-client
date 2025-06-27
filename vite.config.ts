import path from 'path';
import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => {
  return {
    base: './', // Ajustado para Chrome Extension
    define: {
      'global': 'window',
    },
    build: {
      outDir: 'CordovaApp/www', // Salida de build para Cordova
      emptyOutDir: true,   // Limpia la carpeta antes de cada build
    },
    plugins: [
      commonjs(),
      nodePolyfills({
        protocolImports: true
      }),
      tailwindcss(),
      viteStaticCopy({
        targets: [
          {
            src: 'icons',
            dest: 'assets'
          }
        ]
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'node:async_hooks': path.resolve(__dirname, 'stubs/async_hooks.js'),
      }
    },
    optimizeDeps: {
      exclude: [
        '@langchain/core'
      ],
      include: [
        'camelcase',
        'decamelize',
        'p-queue',
        'p-retry',
        'semver',
        'ansi-styles',
        'base64-js'
      ],
      esbuildOptions: {
        plugins: [
          NodeGlobalsPolyfillPlugin({
            process: true,
            buffer: true
          }),
          NodeModulesPolyfillPlugin(),
        ]
      },
    },
  };
});
