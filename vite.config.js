import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Adicione esta linha para corrigir o erro "Buffer is not defined"
    'global': {},
  },
})