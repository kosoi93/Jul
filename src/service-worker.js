// Stage 8: PWA Service Worker

const CACHE_VERSION = 'v1.0.0-neonrunner'; // Change this to force cache update
const CACHE_NAME = `${CACHE_VERSION}-static-cache`;

// Files to cache. Note: In a build process, main.js and engine scripts
// would typically be bundled into something like 'bundle.js'.
// For now, we list them individually.
// The build process in build.yml will later create bundle.js.
// When that's active, this list should primarily cache 'dist/' contents.
const ASSETS_TO_CACHE = [
    '/', // Alias for index.html for start_url
    'index.html',
    'styles.css',
    'main.js',
    'engine/renderer.js',
    'engine/physics.js',
    'engine/input.js',
    'engine/utils.js',
    'assets/sprites/placeholder.png',
    'assets/audio/silent.ogg',
    'manifest.json'
    // Add icon paths here once they are decided and present
    // 'assets/icons/icon-192x192.png',
    // 'assets/icons/icon-512x512.png'
];

const OFFLINE_FALLBACK_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Runner - Offline</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #000; color: #0FF; text-align: center; padding-top: 50px; }
        h1 { font-size: 2em; }
        p { font-size: 1.2em; }
    </style>
</head>
<body>
    <h1>Neon Runner is Offline</h1>
    <p>Please check your internet connection to play.</p>
    <p><small>Cached resources might still be available if previously loaded.</small></p>
</body>
</html>
`;

// Install event: Cache core assets
self.addEventListener('install', (event) => {
    console.log(`[ServiceWorker] Install ${CACHE_NAME}`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[ServiceWorker] All assets cached.');
                return self.skipWaiting(); // Activate worker immediately
            })
            .catch(error => {
                console.error('[ServiceWorker] Caching failed:', error);
            })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log(`[ServiceWorker] Activate - Current cache: ${CACHE_NAME}`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName.includes('neonrunner')) { // Only delete our app's old caches
                        console.log(`[ServiceWorker] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[ServiceWorker] Old caches cleaned up.');
            return self.clients.claim(); // Take control of all open clients
        })
    );
});

// Fetch event: Serve cached assets (Cache-First strategy)
self.addEventListener('fetch', (event) => {
    // We only want to handle GET requests for caching
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // console.log(`[ServiceWorker] Serving from cache: ${event.request.url}`);
                    return cachedResponse;
                }

                // console.log(`[ServiceWorker] Fetching from network: ${event.request.url}`);
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            // If not a valid response, don't cache it and return it as is
                            // For SPA navigation, might fall back to '/' or offline page.
                            // For other assets, just return the error response.
                            if (event.request.mode === 'navigate') {
                                return new Response(OFFLINE_FALLBACK_PAGE, { headers: { 'Content-Type': 'text/html' } });
                            }
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // console.log(`[ServiceWorker] Caching new resource: ${event.request.url}`);
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        // console.log(`[ServiceWorker] Fetch failed for: ${event.request.url}. Serving offline fallback.`);
                        // If fetch fails (e.g., offline) and not in cache, serve offline fallback for navigation requests
                        if (event.request.mode === 'navigate') { // Typically for HTML pages
                            return new Response(OFFLINE_FALLBACK_PAGE, { headers: { 'Content-Type': 'text/html' } });
                        }
                        // For other assets (JS, CSS, images), if not in cache and fetch fails, it will result in a standard browser error.
                        // You could return a placeholder image/data if appropriate.
                    });
            })
    );
});
