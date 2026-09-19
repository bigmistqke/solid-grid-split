import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import solid from 'vite-plugin-solid'

export default defineConfig({
  resolve: {
    alias: {
      'solid-js/web': '@solidjs/web',
    },
  },
  build: {
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'solid-grid-split',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['solid-js', '@solidjs/web'],
    },
  },
  plugins: [
    solid(),
    dts({
      tsconfigPath: './tsconfig.json',
      entryRoot: 'src',
    }),
  ],
  server: { port: 3000 },
})
