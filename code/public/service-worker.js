// Optimized Service Worker for iOS/Android PWA
const CACHE_NAME = 'bombas-diesel-v7';

console.log('[SW] Service Worker carregado, versão:', CACHE_NAME);

// Minimal static cache - only essential files
const STATIC_CACHE = [
  '/',
  '/index.html'
];

// Install - cache only essentials
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE).catch(() => {});
    })
  );
});

// Activate - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) => {
        return Promise.all(
          names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
        );
      })
    ]).then(() => {
      console.log('[SW] ✅ Service Worker ativado e pronto');
    })
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Always fetch API fresh - never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for navigation/HTML
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/')))
    );
    return;
  }

  // Stale-while-revalidate for static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ttf|ico)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: network only
  event.respondWith(fetch(request));
});

// Handle messages
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map(name => caches.delete(name))))
    );
  }
});
