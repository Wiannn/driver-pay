/* 司机工资结算 · Service Worker
 * 页面构建成单文件，这里把整页缓存到本地：
 * - 再次打开直接读本地缓存，秒开，断网也能用
 * - 每次打开时后台静默拉一次线上版本，下次打开即为最新
 */
'use strict';

var CACHE_NAME = 'driver-pay-v1';
var PAGE_URLS = ['./', './index.html'];

/* 安装：预缓存页面，并立即接管，不等旧标签页关闭 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(PAGE_URLS).catch(function () {});
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

/* 激活：清掉旧版本缓存 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE_NAME;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* 取数据：本地有就直接返回（同时后台更新缓存），本地没有才走网络 */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  // 只接管本站资源，高德等外部接口交给浏览器自己处理
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request).then(function (cached) {
        var network = fetch(request)
          .then(function (response) {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(function () {
            return cached;
          });
        return cached || network;
      });
    })
  );
});
