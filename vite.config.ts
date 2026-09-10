import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// defineConfig from vitest/config = Vite's + the `test` key (otherwise tsc rejects the property)
import { defineConfig } from 'vitest/config'

// BASE_PATH="/RiftLearn/" for a GitHub Pages deployment under a sub-path.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  // host: true = listen on all interfaces, to test from a phone on the same Wi-Fi
  server: { host: true, port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
})
