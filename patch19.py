import os
R="LockCOC" if os.path.isdir("LockCOC") else "."
def rd(p): return open(os.path.join(R,p),encoding="utf-8").read()
def w(p,s,m="w"): open(os.path.join(R,p),m,encoding="utf-8").write(s)
p="app.py"; s=rd(p)
if "_music_overlay" in s: raise SystemExit("[loi] da ap dung patch19 roi")

# 1) doc truong nhac tu form
k='    rec = form.get("recipients", "").strip()\n'
add='''    nt = form.get("nm_title", "").strip()
    if nt:
        def _https(u):
            u = (u or "").strip()
            return u if re.match(r"^https://\\S+$", u) and len(u) <= 700 else ""
        meta["music"] = {"title": nt[:120], "artist": form.get("nm_artist", "").strip()[:120], "art": _https(form.get("nm_art")),
                         "preview": _https(form.get("nm_preview")), "link": _https(form.get("nm_link"))}
'''
if k not in s: raise SystemExit("[loi] khong thay recipients")
s=s.replace(k,add+k,1)

# 2) dang bai voi the nhac goc
a=s.find("def perform_post(e: Entry, meta: dict, image: str, video: str | None) -> str:")
b=s.find("    post_id = uuid.uuid4().hex", a)
if a<0 or b<0: raise SystemExit("[loi] khong thay perform_post")
new='''def _music_overlay(mm: dict, minimal: bool = False) -> dict:
    text = (mm.get("artist", "") + " " + mm.get("title", "")).strip()[:140]
    payload = {"artist": mm.get("artist", ""), "song_title": mm.get("title", "")}
    if mm.get("preview") and not minimal:
        payload["preview_url"] = mm["preview"]
    if mm.get("link") and not minimal:
        payload["spotify_url"] = mm["link"]
    data = {
        "background": {"colors": [], "material_blur": "ultra_thin"},
        "max_lines": {"value": "1", "@type": "type.googleapis.com/google.protobuf.Int64Value"},
        "text": text, "text_color": "#ffffff", "type": "music", "payload": payload,
    }
    if mm.get("art"):
        data["icon"] = {"data": mm["art"], "type": "image"}
    return {"overlay_type": "caption", "overlay_id": "caption:music", "alt_text": text, "data": data}


def perform_post(e: Entry, meta: dict, image: str, video: str | None) -> str:
    L = lib()
    mm = meta.get("music")
    result = None
    if mm:
        last = None
        for minimal in (False, True):
            ov = _music_overlay(mm, minimal)
            kw = post_kwargs(meta, image, video)
            kw["caption"] = ov["alt_text"]
            kw.pop("note_type", None)
            try:
                with e.lock:
                    mom = e.client.moments
                    mom.build_overlay = lambda *a, _ov=ov, **k: _ov
                    try:
                        result = mom.post(**kw)
                    finally:
                        try:
                            del mom.build_overlay
                        except AttributeError:
                            pass
                last = None
                break
            except Exception as ex:  # noqa: BLE001
                if L and isinstance(ex, getattr(getattr(L, "exc", None), "AuthenticationError", ())):
                    raise
                last = ex
                app.logger.warning("The nhac loi (minimal=%s): %s", minimal, ex)
        if last is not None:
            raise ApiError("Locket không nhận thẻ nhạc này: %s. Thử tắt “Thẻ nhạc Locket” trong Studio." % str(last)[:160], 502)
    else:
        with e.lock:
            result = e.client.moments.post(**post_kwargs(meta, image, video))
'''
s=s[:a]+new+s[b:]
w(p,s)

# 3) giao dien
w("static/js/nativemusic.js", r'''"use strict";
/* nativemusic.js - đăng bài với thẻ nhạc gốc của Locket (nghe thử được), thay cho thẻ vẽ cứng vào ảnh */
(function () {
  var ed = null;
  function on() { try { return localStorage.getItem("lc_nm") !== "0"; } catch (e) { return true; } }
  function ok() { return !!(on() && ed && ed.song && ed.song.title && !(ed.music && ed.music.file)); }

  var _oe = openEditor; openEditor = function (i) { ed = null; return _oe(i); };
  var _os = openStudio; openStudio = function (e, cb) { ed = e; return _os(e, cb); };
  var _burn = burnSongCard; burnSongCard = function (img, song) { return ok() ? Promise.resolve(img) : _burn(img, song); };

  var _api = api;
  api = function (path, opts) {
    if (path === "/api/post" && opts && opts.form && ok()) {
      var fd = opts.form, s = ed.song, pv = ed.music && ed.music.url;
      ["music", "music_start", "music_url", "music_card"].forEach(function (k) { fd.delete(k); });
      fd.set("nm_title", s.title); fd.set("nm_artist", s.artist || "");
      if (s.art) fd.set("nm_art", String(s.art).replace("200x200", "600x600"));
      if (pv && /^https:\/\//.test(pv)) fd.set("nm_preview", pv);
      fd.set("nm_link", "https://open.spotify.com/search/" + encodeURIComponent(s.title + " " + (s.artist || "")));
    }
    return _api(path, opts).then(function (d) { if (path === "/api/post") ed = null; return d; });
  };

  function chip() {
    var b = el("button", { class: "chip nm-chip" + (on() ? " on" : ""), type: "button" }, on() ? "Thẻ nhạc Locket: Bật" : "Thẻ nhạc Locket: Tắt");
    b.addEventListener("click", function () {
      try { localStorage.setItem("lc_nm", on() ? "0" : "1"); } catch (e) { /* bỏ qua */ }
      b.classList.toggle("on", on()); b.textContent = on() ? "Thẻ nhạc Locket: Bật" : "Thẻ nhạc Locket: Tắt";
    });
    return el("div", { class: "nm-row" }, b, el("small", {}, "Bật: bạn bè thấy thẻ nhạc nghe được trên Locket (thay caption). Tắt: thẻ vẽ vào ảnh."));
  }
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        var ms = n.classList && n.classList.contains("music-state") ? n : (n.querySelector && n.querySelector(".music-state"));
        if (ms && ms.parentNode && !ms.parentNode.querySelector(".nm-row")) ms.parentNode.insertBefore(chip(), ms.nextSibling);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
''')
c=rd("static/polish.css")
if ".nm-row" not in c: w("static/polish.css","""\n.nm-row { display: grid; gap: 4px; padding: 2px 2px 6px; }
.nm-row .chip { justify-self: start; }
.nm-row small { color: var(--muted); font-size: 12px; line-height: 1.35; }
""","a")
t=rd("templates/index.html")
if "nativemusic.js" not in t:
    a_='  <script src="/static/js/chatplus.js"></script>'
    if a_ in t: w("templates/index.html",t.replace(a_,a_+'\n  <script src="/static/js/nativemusic.js"></script>',1))
    else: print("[loi] chua co chatplus.js - chay patch13 truoc")
print("xong patch19")
