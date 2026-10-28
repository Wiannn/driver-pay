// Vite build 后内联脚本：从 src/ 读取原始 JS，合并内联到 dist/index.html 成单文件
// Vite 只处理 CSS（合并压缩），JS 保持源码原样按顺序拼接
// 这样 GitHub Pages 部署后只有 1 个 HTTP 请求，国内访问最快
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const distDir = path.join(projectRoot, 'dist');

// ===== 1. 从 src/index.html 提取 script 顺序 =====
const srcHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const scriptSrcs = [];
srcHtml.replace(/<script\s+src="([^"]+\.js)"[^>]*><\/script>/g, (m, src) => {
  scriptSrcs.push(src);
  return m;
});
console.log(`[inline] 发现 ${scriptSrcs.length} 个 JS 文件:`);
scriptSrcs.forEach(s => console.log(`  - ${s}`));

// ===== 2. 按顺序合并所有 JS（保持全局作用域） =====
const jsChunks = [];
for (const src of scriptSrcs) {
  const jsPath = path.resolve(srcDir, src);
  if (!fs.existsSync(jsPath)) {
    console.warn(`[inline] JS not found: ${jsPath}`);
    continue;
  }
  jsChunks.push(`\n/* ===== ${src.replace(/^\.\//, '')} ===== */\n`);
  jsChunks.push(fs.readFileSync(jsPath, 'utf8'));
}
const mergedJs = jsChunks.join('\n');

// ===== 3. 读 dist/index.html（Vite 已处理好 CSS） =====
let distHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// ===== 4. 在 </body> 前插入合并后的 script =====
distHtml = distHtml.replace(
  /<\/body>/,
  `<script>${mergedJs}\n</script>\n</body>`
);

// ===== 5. 写回单文件 =====
fs.writeFileSync(path.join(distDir, 'index.html'), distHtml, 'utf8');

// ===== 6. 清理 Vite 输出的 assets/ =====
const assetsDir = path.join(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
  fs.rmSync(assetsDir, { recursive: true });
}

// ===== 7. 报告 =====
const size = fs.statSync(path.join(distDir, 'index.html')).size;
console.log(`[inline] ✓ 单文件就绪: dist/index.html  ${(size / 1024).toFixed(1)} KB`);
