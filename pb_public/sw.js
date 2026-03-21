// sw.js - 基礎的 Service Worker 引擎
self.addEventListener('install', (e) => {
    console.log('[Service Worker] 安裝成功');
});

// Chrome 規定必須要有 fetch 監聽器才會判定為合格的 PWA
self.addEventListener('fetch', (e) => {
    // 目前留空，不影響原本網頁運作
});