// Stage 9 Prep: BUILD_VERSION for Cache Busting
import { BUILD_VERSION } from './main.js'; // Import BUILD_VERSION

const CACHE_NAME_PREFIX = 'neonrunner-static-cache';
const CACHE_NAME = `${CACHE_NAME_PREFIX}-${BUILD_VERSION}`;

const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'styles.css',
    // After build, 'bundle.js' will be the primary JS target
    // For now, caching individual files for dev mode PWA functionality:
    'main.js',
    'engine/renderer.js',
    'engine/physics.js',
    'engine/input.js',
    'engine/utils.js',
    'assets/sprites/placeholder.png',
    'assets/audio/silent.ogg',
    'manifest.json'
    // 'assets/icons/icon-192x192.png', // Add once available
    // 'assets/icons/icon-512x512.png'  // Add once available
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
</body>
</html>
`;

self.addEventListener('install', (event) => {
    console.log(`[ServiceWorker] Install - Caching for version: ${CACHE_NAME}`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[ServiceWorker] All assets cached.');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[ServiceWorker] Caching failed:', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log(`[ServiceWorker] Activate - Current cache: ${CACHE_NAME}`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete caches that start with our prefix but are not the current version
                    if (cacheName.startsWith(CACHE_NAME_PREFIX) && cacheName !== CACHE_NAME) {
                        console.log(`[ServiceWorker] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[ServiceWorker] Old caches cleaned up.');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            if (event.request.mode === 'navigate') {
                                return new Response(OFFLINE_FALLBACK_PAGE, { headers: { 'Content-Type': 'text/html' } });
                            }
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        if (event.request.mode === 'navigate') {
                            return new Response(OFFLINE_FALLBACK_PAGE, { headers: { 'Content-Type': 'text/html' } });
                        }
                    });
            })
    );
});
