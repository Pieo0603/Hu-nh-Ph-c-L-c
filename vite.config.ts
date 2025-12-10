import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Đảm bảo code không bị lỗi khi truy cập process.env
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
})