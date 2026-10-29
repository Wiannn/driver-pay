// Vite build 后内联脚本：从 src/ 读取原始 JS 合并 + 内联 Vite 压缩的 CSS → dist/index.html 单文件
// GitHub Pages 部署后只有 1 个 HTTP 请求，国内访问最快
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

// ===== 3. 读 Vite 输出的 dist/index.html =====
let distHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// ===== 4. 内联 CSS（Vite 压缩后的在 assets/ 里） =====
distHtml = distHtml.replace(
  /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g,
  (match, href) => {
    const cssPath = path.resolve(distDir, href);
    if (!fs.existsSync(cssPath)) {
      console.warn(`[inline] CSS not found: ${href}`);
      return match;
    }
    const css = fs.readFileSync(cssPath, 'utf8');
    console.log(`[inline] 内联 CSS: ${href}  (${(css.length / 1024).toFixed(1)} KB)`);
    return `<style>${css}</style>`;
  }
);

// ===== 5. 在 </body> 前插入合并后的 JS =====
distHtml = distHtml.replace(
  /<\/body>/,
  `<script>${mergedJs}\n</script>\n</body>`
);

// ===== 6. 写回单文件 =====
fs.writeFileSync(path.join(distDir, 'index.html'), distHtml, 'utf8');

// ===== 7. 给 Service Worker 注入本次构建版本（每次发版换缓存名，旧缓存自动清掉） =====
const swPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swPath)) {
  const version = Date.now().toString(36);
  const swCode = fs
    .readFileSync(swPath, 'utf8')
    .replace(/var CACHE_NAME = '[^']*';/, `var CACHE_NAME = 'driver-pay-${version}';`);
  fs.writeFileSync(swPath, swCode, 'utf8');
  console.log(`[inline] SW 缓存版本: driver-pay-${version}`);
}

// ===== 8. 清理 assets/ =====
const assetsDir = path.join(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
  fs.rmSync(assetsDir, { recursive: true });
}

// ===== 9. 报告 =====
const size = fs.statSync(path.join(distDir, 'index.html')).size;
console.log(`[inline] ✓ 单文件就绪: dist/index.html  ${(size / 1024).toFixed(1)} KB  (CSS+${scriptSrcs.length}个JS 全部内联)`);
