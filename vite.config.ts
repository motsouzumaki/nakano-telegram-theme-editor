import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import os from 'os'

// https://vite.dev/config/
// Cache dir is moved outside OneDrive to avoid EPERM errors from OneDrive file locking
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  cacheDir: path.join(os.tmpdir(), 'vite-telegram-theme-cache'),
  server: {
    host: true,
    port: 5173,
  },
})
