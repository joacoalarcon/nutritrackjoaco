const CACHE_NAME = 'nutritrack-fitia-v1';
const urlsToCache = [
  '/nutritrack-fitia.html',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Error caching files:', err);
        });
      })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // No cachear respuestas que no sean OK
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // Si falla, retornar página offline si la tenemos
        return caches.match('/nutritrack-fitia.html');
      })
  );
});

// Manejar notificaciones push
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'NutriTrack', body: 'Recordatorio de comida' };
  const options = {
    body: data.body,
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%234F46E5;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%234338CA;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="192" height="192" rx="42"/%3E%3Ctext x="50%25" y="52%25" dominant-baseline="middle" text-anchor="middle" font-size="100" fill="white"%3E🥗%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Ccircle fill="%234F46E5" cx="48" cy="48" r="48"/%3E%3Ctext x="50%25" y="52%25" dominant-baseline="middle" text-anchor="middle" font-size="48" fill="white"%3E🥗%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    tag: 'meal-reminder',
    requireInteraction: true,
    actions: [
      { action: 'open', title: '📸 Registrar comida', icon: undefined },
      { action: 'close', title: 'Más tarde', icon: undefined }
    ],
    data: {
      url: '/nutritrack-fitia.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Si ya hay una ventana abierta, enfocarla
          for (let client of windowClients) {
            if (client.url.includes('nutritrack-fitia.html') && 'focus' in client) {
              return client.focus();
            }
          }
          // Si no hay ventana abierta, abrir una nueva
          if (clients.openWindow) {
            return clients.openWindow('/nutritrack-fitia.html');
          }
        })
    );
  }
});
