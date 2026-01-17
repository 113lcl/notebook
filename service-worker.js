// Service Worker для PWA
const CACHE_NAME = 'diary-v1';
const ASSETS_TO_CACHE = [
  '/diary/index.html',
  '/diary/styles.css',
  '/diary/app.js',
  '/diary/manifest.json'
];

// Установка
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Если некоторые файлы не могут быть закеширован, продолжаем
        return Promise.resolve();
      });
    }).then(() => self.skipWaiting())
  );
});

// Активация
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network first, then cache
self.addEventListener('fetch', (event) => {
  // Только GET запросы
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Кешируем успешные ответы
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Используем кеш если сеть недоступна
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Возвращаем offline страницу если нужно
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// Периодическое обновление (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-diary') {
    event.waitUntil(syncDiaryData());
  }
});

function syncDiaryData() {
  // Логика синхронизации данных дневника
  return Promise.resolve();
}
