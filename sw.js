/*
 * 离线缓存（Service Worker）：装到手机后断网也能玩。
 * 联网时总是取最新文件；只有增删了文件（改了下面的 FILES）才需要把 VERSION 加一。
 * 素材列表直接读 js/assets.js，不用在这里重复维护。
 */
const VERSION = 'v1';
const CACHE = 'llk-' + VERSION;
const FONT_CACHE = 'llk-fonts';   // 字体不随版本清掉

self.window = self;
importScripts('js/assets.js');

const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/assets.js', 'js/audio.js', 'js/game.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png',
  ...self.ASSETS.tiles.map(t => t.src),
  ...Object.values(self.ASSETS.sfx).map(s => s.src),
  self.ASSETS.music.src
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('llk-') && k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 字体（Google Fonts）：有缓存先用缓存，同时后台更新；连不上就用系统字体
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
      return hit || net;
    }));
    return;
  }

  // 自己的文件：联网时取最新的并顺手更新缓存，断网时用缓存
  if (url.origin === location.origin && !req.headers.has('range')) {
    e.respondWith(fetch(req)
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
  } else if (url.origin === location.origin) {
    // 音频的分段请求：断网时退回缓存里的整个文件
    e.respondWith(fetch(req).catch(() => caches.match(req.url, { ignoreSearch: true })));
  }
});
