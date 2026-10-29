/* 司机工资结算 · Service Worker
 * 页面构建成单文件，这里把整页缓存到本地：
 * - 页面本体：先走网络（每次发版打开即最新），断网时回退缓存
 * - 其它本站资源：缓存优先，后台静默更新
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

/* 取数据：页面导航走网络优先（发版立即生效，断网回退缓存）；
 * 其它本站资源缓存优先，同时后台更新缓存 */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  // 只接管本站资源，高德等外部接口交给浏览器自己处理
  if (url.origin !== self.location.origin) return;

  // 页面本体：网络优先，避免发版后仍显示旧缓存页面
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

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
