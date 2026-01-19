import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared/types': path.resolve(__dirname, '../shared/types/index.ts'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
    // Prefer TypeScript files over compiled JS
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
})
