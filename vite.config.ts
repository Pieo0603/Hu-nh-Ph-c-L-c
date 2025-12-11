import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Tải các biến môi trường từ file .env (nếu có)
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Sử dụng Key người dùng cung cấp làm mặc định nếu không có file .env
  const apiKey = env.API_KEY || "AIzaSyAcdOdg1NXhgdvQHMP4aFwwS21tL56Y82c";

  return {
    plugins: [react()],
    define: {
      // Inject biến API_KEY vào process.env để code sử dụng được
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})