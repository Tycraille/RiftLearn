import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// BASE_PATH="/riftlearn/" pour un déploiement GitHub Pages sous un sous-chemin.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  // host: true = écoute sur toutes les interfaces, pour tester depuis un smartphone sur le même Wi-Fi
  server: { host: true, port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
})
