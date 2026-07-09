// ===================================================================
// SIGMA File Management System — Service Worker
// මෙම පද්ධතිය සම්පූර්ණයෙන්ම Offline ලෙස ක්‍රියාත්මක වන බැවින්,
// මෙම Service Worker එකෙන් කරන්නේ App Shell එක (HTML/CSS/JS/Icons)
// Cache කර තැබීම පමණි — දත්ත (records) සියල්ලම Browser එකේ
// localStorage තුළම පවතී, Service Worker එකෙන් ඒවාට සම්බන්ධයක් නැත.
// ===================================================================

const CACHE_NAME = 'sigma-file-mgmt-v1';

// App Shell — පළමු වරට Load වන විට Cache වන Core Files
const APP_SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './SIGMA_Logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

// ===== Install: App Shell Cache කිරීම =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_FILES).catch((err) => {
        // එකම file එකක් missing වුනත් whole install එක fail නොවී
        // ඉතිරි files cache කිරීමට උත්සාහ කරයි
        console.warn('SIGMA SW: සමහර files cache කිරීමේදී error එකක්:', err);
      });
    })
  );
  self.skipWaiting();
});

// ===== Activate: පරණ Cache Versions ඉවත් කිරීම =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ===== Fetch: Cache-First (Offline-First) උපාය මාර්ගය =====
// Cache එකේ file එකක් තිබේ නම් එයම return කරයි (ඉක්මන්, Offline වුවත් වැඩ කරයි).
// Cache එකේ නැත්නම් Network එකෙන් උත්සාහ කර, ලැබුනොත් Cache එකටත් එකතු කරයි.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network එකත් නැති, Cache එකේත් නැති අවස්ථාවක (උදා: පළමු load එකේදීම offline)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});
