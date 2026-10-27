/* ============================================================
   家庭积分乐园 · Service Worker
   作用：安装到主屏 / PWA 后，无网络也能正常打开页面
   策略：网络优先 + 缓存兜底
     · 在线：始终请求最新资源（家长改任务分值/奖励规则后立即生效）
     · 离线：回退已缓存内容，导航请求再兜底缓存的主页
   ⚠️ 若要强制清空所有客户端缓存，把下方 CACHE 版本号 +1 即可
   ============================================================ */
const CACHE = 'score-park-v2';

/* 首次访问即预缓存的应用外壳 */
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './maskable-512.png'
];

/* 安装：预缓存外壳，跳过等待让新 SW 立即接管 */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

/* 激活：清理旧版本缓存 */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 拦截请求：网络优先，失败时回退缓存 */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                      // 只处理 GET
  const url = new URL(req.url);
  const isSameOrigin = url.origin === location.origin;

  e.respondWith(
    // ① 在线：走网络，顺手把响应写入缓存（供离线用）
    fetch(req).then(res => {
      const cp = res.clone();
      caches.open(CACHE).then(c => c.put(req, cp));
      return res;
    }).catch(() =>
      // ② 离线/网络故障：回退缓存；同源导航再兜底到缓存的主页
      caches.match(req, { ignoreSearch: true }).then(hit =>
        hit || (isSameOrigin && req.mode === 'navigate'
          ? caches.match('./index.html')
          : undefined)
      )
    )
  );
});
