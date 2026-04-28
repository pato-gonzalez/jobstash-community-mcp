import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { stdio: 'src/bin/stdio.ts' },
  format: ['esm'],
  outDir: 'dist',
  target: 'node20',
  clean: true,
  dts: false,
  sourcemap: false,
  splitting: false,
  shims: true,
  minify: false,
  banner: { js: '#!/usr/bin/env node' },
});
