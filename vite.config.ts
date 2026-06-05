import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Vitest's `test` field is added via the Vitest-bundled type narrowing. We
// declare it as `any` here because Vitest 2.x bundles its own Vite (older
// majors) and the two PluginOption types fail to unify under Vite 6.
export default defineConfig({
  base: '/ghost-stories/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // @ts-expect-error — see comment above; Vitest config is read via vitest's
  // own resolver and doesn't need the strict Vite 6 type to accept it.
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
