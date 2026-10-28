// Vite 配置：根目录是 src/，输出用相对路径（适配 GitHub Pages 子路径）
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // 把所有 JS 合并成一个文件，加速 GitHub Pages 加载
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
