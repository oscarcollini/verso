'use strict';

const prefix = 'strumenti-shell-' + self.registration.scope + ':';
const cacheName = prefix + 'v0.11';
const assets = ['./locale.js?v=11', './manifest-en.webmanifest?v=11', './', './index.html', './style.css?v=11', './app.js?v=11', './manifest.webmanifest?v=11', './icon-192.png?v=11', './icon-512.png?v=11'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(prefix) && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(cacheName).then(cache => cache.match('./index.html')).then(response => response || fetch(event.request)));
  } else if (assets.some(path => new URL(path, self.registration.scope).href === url.href)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(event.request)).then(response => response || fetch(event.request)));
  }
});
