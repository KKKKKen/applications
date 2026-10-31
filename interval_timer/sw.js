/* オフライン用の service worker。CACHE の番号を上げると全員が新版に切り替わる */
var CACHE = "itimer-v3";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      /* GitHub Pages は HTML を 10 分キャッシュするので、ブラウザのキャッシュを飛ばして取り直す */
      return c.addAll(ASSETS.map(function(u){ return new Request(u, { cache: "reload" }); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* キャッシュを即返し、裏で取り直して次回に備える */
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(function(c){
      return c.match(e.request, { ignoreSearch: true }).then(function(hit){
        var refetch = fetch(e.request).then(function(res){
          if(res && res.ok) c.put(e.request, res.clone());
          return res;
        }).catch(function(){ return hit; });
        return hit || refetch;
      });
    })
  );
});
