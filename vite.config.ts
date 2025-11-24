import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './', // Use relative paths for GitHub Pages
    define: {
      // This ensures process.env.API_KEY is replaced with the actual value during build
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY)
    }
  }
})