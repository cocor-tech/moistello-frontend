const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`
const API_CACHE = `api-${CACHE_VERSION}`
// Set self.__DEBUG = true in development to see SW logs.
const DEBUG = false
function swLog(message: string, ...context: unknown[]) {
  if (DEBUG) {
    self.dispatchEvent(new CustomEvent('moistello:sw-log', {
      detail: { level: 'debug', message, context },
    }))
  }
}

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
]

self.addEventListener('install', (event) => {
  swLog('Installing service worker')
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        swLog('Failed to cache some assets:', err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  swLog('Activating service worker')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
            swLog('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle API requests separately
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(networkFirstApi(request))
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    return event.respondWith(cacheFirstStatic(request))
  }

  // Handle dynamic content with network-first strategy
  return event.respondWith(networkFirst(request))
})

/**
 * Cache-first strategy for static assets (CSS, JS, fonts, images)
 */
async function cacheFirstStatic(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (!response || response.status !== 200 || response.type !== 'basic') {
      return response
    }

    const responseToCache = response.clone()
    caches.open(STATIC_CACHE).then((cache) => {
      cache.put(request, responseToCache)
    })

    return response
  } catch (err) {
    swLog('Fetch failed, returning offline page:', err)
    return caches.match('/') || new Response('Offline - please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    })
  }
}

/**
 * Network-first strategy for dynamic content
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const responseToCache = response.clone()
      caches.open(DYNAMIC_CACHE).then((cache) => {
        cache.put(request, responseToCache)
      })
    }
    return response
  } catch (err) {
    swLog('Network request failed:', err)
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    return new Response('Offline - content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    })
  }
}

/**
 * Network-first strategy for API responses
 * Caches recently viewed circles and other API data
 */
async function networkFirstApi(request) {
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const responseToCache = response.clone()
      caches.open(API_CACHE).then((cache) => {
        cache.put(request, responseToCache)
      })
    }
    return response
  } catch (err) {
    swLog('API request failed:', err)
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    return new Response(
      JSON.stringify({ error: 'API unavailable offline' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    )
  }
}

/**
 * Check if a URL is a static asset based on file extension
 */
function isStaticAsset(pathname) {
  const staticExtensions = /\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/i
  return staticExtensions.test(pathname)
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
