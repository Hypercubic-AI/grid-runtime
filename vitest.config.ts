import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  // tsconfig sets jsx:"preserve" for Next's own transform; tell vitest's oxc
  // transformer to use the automatic JSX runtime so tests can import .tsx modules
  // (e.g. the exported scenarioForWorld helper in RuntimeView.tsx).
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
