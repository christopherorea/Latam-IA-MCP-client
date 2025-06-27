import path from 'path';
import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(() => {
    return {
      define: {
        'global': 'window',
      },
      plugins: [
        commonjs(),
        nodePolyfills({
          protocolImports: true
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'node:async_hooks': path.resolve(__dirname, 'stubs/async_hooks.js'),
        }
      },
      optimizeDeps: {
        exclude: ['@langchain/core'],
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
            NodeModulesPolyfillPlugin()
          ]
        },
      },
    };
});
