// Service Worker for 연수원 여기어때
const CACHE_NAME = 'training-centers-v1.1.0';
const RUNTIME_CACHE = 'runtime-cache-v1.1.0';

// 캐시할 정적 리소스들
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/centers-list.html',
  '/style.css',
  '/search.css',
  '/app.js',
  '/MarkerClustering.js',
  '/manifest.json',
  // 폰트 및 아이콘
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 설치 중...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 정적 리소스 캐싱 중...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] 설치 완료');
        return self.skipWaiting(); // 새 Service Worker 즉시 활성화
      })
      .catch((error) => {
        console.error('[Service Worker] 설치 실패:', error);
      })
  );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 활성화 중...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // 오래된 캐시 삭제
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] 오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] 활성화 완료');
        return self.clients.claim(); // 즉시 페이지 제어
      })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase, 네이버 지도 API, 폰트는 네트워크 우선 전략
  if (
    url.origin.includes('firebase') ||
    url.origin.includes('googleapis') ||
    url.origin.includes('gstatic.com') ||
    url.origin.includes('naver.com') ||
    url.origin.includes('firestore')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // centers-list.js는 항상 네트워크 우선 (최신 버전 보장)
  if (url.pathname.includes('centers-list.js')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 정적 리소스는 캐시 우선 전략
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML 페이지는 네트워크 우선, 오프라인 시 캐시 사용
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 기본: 네트워크 우선 전략
  event.respondWith(networkFirst(request));
});

// 캐시 우선 전략
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    console.log('[Service Worker] 캐시에서 반환:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // 성공적인 응답만 캐시
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      console.log('[Service Worker] 새 리소스 캐싱:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] 네트워크 요청 실패:', request.url, error);

    // 오프라인 폴백 페이지 (선택사항)
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }

    throw error;
  }
}

// 네트워크 우선 전략
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // 성공적인 응답을 캐시에 저장
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] 네트워크 실패, 캐시 확인:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[Service Worker] 캐시에서 반환:', request.url);
      return cachedResponse;
    }

    // 오프라인 폴백
    if (request.destination === 'document') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    throw error;
  }
}

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] 백그라운드 동기화:', event.tag);

  if (event.tag === 'sync-centers') {
    event.waitUntil(syncCentersData());
  }
});

// 연수원 데이터 동기화
async function syncCentersData() {
  try {
    console.log('[Service Worker] 연수원 데이터 동기화 시작');
    // 여기에 Firebase에서 데이터를 가져와 캐시하는 로직 추가 가능
    return Promise.resolve();
  } catch (error) {
    console.error('[Service Worker] 동기화 실패:', error);
    return Promise.reject(error);
  }
}

// 푸시 알림 (선택사항)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] 푸시 알림 수신:', event);

  const options = {
    body: event.data ? event.data.text() : '새로운 연수원 정보가 업데이트되었습니다!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'training-centers-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'explore',
        title: '보기',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('연수원 여기어때', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 알림 클릭:', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[Service Worker] 로드 완료');
