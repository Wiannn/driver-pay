/* ===== js/pages.js ===== */
/* 页面注册与挂载：页面自己的 HTML / 样式 / 事件都写在 pages/<页面>.js 里 */
'use strict';

var PAGE_DEFS = {};

function definePage(pageId, def) {
  PAGE_DEFS[pageId] = def || {};
}

function mountPages() {
  Object.keys(PAGE_DEFS).forEach(function (pageId) {
    var section = document.getElementById('page-' + pageId);
    if (!section || section.getAttribute('data-mounted')) return;

    var def = PAGE_DEFS[pageId];
    if (def.css) {
      var style = document.createElement('style');
      style.setAttribute('data-page-style', pageId);
      style.textContent = def.css;
      document.head.appendChild(style);
    }
    if (def.html) section.innerHTML = def.html;
    section.setAttribute('data-mounted', '1');
    if (typeof def.init === 'function') def.init();
  });
}

