const CACHE_NAME = 'nexoweb-v2.0.1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/nexoweb-192.png', '/icons/nexoweb-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached

        if (event.request.mode === 'navigate') {
          return caches.match('/index.html')
        }

        return Response.error()
      })
  )
})

self.addEventListener('push', (event) => {
  let aviso
  try {
    aviso = event.data?.json() || {}
  } catch {
    aviso = { body: event.data?.text() }
  }

  event.waitUntil(
    self.registration.showNotification(aviso.title || 'NexoWeb', {
      body: aviso.body || 'Tienes una actividad pendiente en tu acuario.',
      icon: '/icons/nexoweb-192.png',
      badge: '/icons/nexoweb-192.png',
      tag: aviso.tag || 'nexoweb-recordatorio',
      data: { url: aviso.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((ventana) => ventana.url.startsWith(self.location.origin))
      if (abierta) {
        abierta.navigate(destino)
        return abierta.focus()
      }
      return self.clients.openWindow(destino)
    })
  )
})
