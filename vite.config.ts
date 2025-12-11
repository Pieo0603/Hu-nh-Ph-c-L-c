import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Tải các biến môi trường từ file .env (nếu có)
  const env = loadEnv(mode, (process as any).cwd(), '');

  // 1. Ưu tiên VITE_API_KEY (chuẩn Vite)
  // 2. Sau đó đến API_KEY
  // 3. Cuối cùng là Key dự phòng (có thể đã chết)
  const apiKey = env.VITE_API_KEY || env.API_KEY || "AIzaSyAcdOdg1NXhgdvQHMP4aFwwS21tL56Y82c";

  return {
    plugins: [react()],
    define: {
      // Inject biến API_KEY vào process.env để code sử dụng được
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})