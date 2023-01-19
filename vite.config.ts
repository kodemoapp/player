import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import svgr from '@honkhonk/vite-plugin-svgr';

// https://vitejs.dev/config/
/// <reference types="vitest" />
export default defineConfig({
  plugins: [svgr(), react(), visualizer()],

  server: {
    port: 3001,
    host: true,
  },

  resolve: {
    alias: {
      // react: path.resolve(__dirname, 'node_modules', 'react'),
      // 'react-dom': path.resolve(__dirname, 'node_modules', 'react-dom'),
      // "@kodemo/util": path.resolve(__dirname, "../util/src"),
    },
  },

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/KodemoPlayer.tsx'),
      name: 'KodemoPlayer',
      fileName: (format) => `kodemo-player.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'styled-components', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'styled-components': 'styled',
        },
      },
    },
  },

  // @ts-ignore
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    deps: {
      inline: ['vitest-canvas-mock'],
    },
  },
});
