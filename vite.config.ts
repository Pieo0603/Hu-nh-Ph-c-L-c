import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Tải các biến môi trường từ file .env (nếu có)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Inject biến API_KEY vào process.env để code sử dụng được
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "")
    }
  }
})