import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// 像素小鎮
//   npm run dev     在電腦上開來玩
//   npm run build   打包到 docs/（GitHub Pages 從 main 分支的 /docs 資料夾發布）
export default defineConfig({
  base: './', // 用相對路徑，放在 GitHub Pages 的子資料夾（/test_town/）也能正常讀到檔案
  plugins: [vue()],
  resolve: {
    alias: { '@route': fileURLToPath(new URL('./src/data/route.js', import.meta.url)) },
  },
  build: { outDir: 'docs', emptyOutDir: true },
})
