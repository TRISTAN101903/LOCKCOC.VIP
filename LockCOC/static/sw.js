/* sw.js - mở app nhanh: file tĩnh hiện ngay từ bộ nhớ, tải bản mới ngầm (stale-while-revalidate) */
const C = "lc-static-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith("/static/") || u.pathname.startsWith("/static/downloads/") || r.headers.has("range")) return;
  e.respondWith(caches.open(C).then(async (c) => {
    const hit = await c.match(r);
    const net = fetch(r).then((res) => {
      if (res && res.ok) {
        const same = hit && hit.headers.get("etag") && hit.headers.get("etag") === res.headers.get("etag");
        c.put(r, res.clone());
        if (hit && !same) self.clients.matchAll().then((cs) => cs.forEach((x) => x.postMessage({ t: "upd" })));
      }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
