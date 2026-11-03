import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."

# ---- 1) app.py: endpoint tai/luu file ----
p = os.path.join(R, "app.py")
a = open(p, encoding="utf-8").read()
if "/api/save-media" not in a:
    anchor = '@app.get("/sw.js")'
    if anchor not in a: raise SystemExit("[loi] khong thay /sw.js trong app.py")
    route = '''@app.get("/api/save-media")
@api
def save_media():
    """Tai ve 1 anh/video cua khoanh khac (de nut Luu ve may): file da dang tren server nay hoac file tu Locket."""
    u = (request.args.get("u") or "").strip()
    kind = "video" if request.args.get("kind") == "video" else "image"
    base = re.sub(r"[^A-Za-z0-9_-]", "", request.args.get("n") or "")[:40] or "moment"
    mm = re.match(r"^/api/media/([0-9a-f]{32}\\.[a-z]{3,4})$", u)
    if mm:
        name = mm.group(1)
        owner = q("SELECT key FROM posts WHERE file=?", (name,), one=True)
        if not owner or owner["key"] not in browser_keys():
            raise ApiError("Không tìm thấy", 404)
        return send_from_directory(MEDIA_DIR, name, as_attachment=True, download_name="LockCOC_%s%s" % (base, os.path.splitext(name)[1]))
    pu = urllib.parse.urlparse(u)
    host = pu.hostname or ""
    if pu.scheme != "https" or not any(host == h or host.endswith("." + h) for h in _DL_HOSTS):
        raise ApiError("Nguồn tải không hợp lệ", 400)
    try:
        up = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=25)
    except Exception:  # noqa: BLE001
        raise ApiError("Không tải được file từ Locket", 502)
    ctype = up.headers.get_content_type() or "application/octet-stream"
    if not (ctype.startswith("image/") or ctype.startswith("video/") or ctype == "application/octet-stream"):
        up.close()
        raise ApiError("Loại file không hợp lệ", 400)
    ext = ".mp4" if kind == "video" else (".webp" if "webp" in ctype else ".png" if "png" in ctype else ".jpg")

    def gen():
        total = 0
        try:
            while True:
                b = up.read(65536)
                if not b:
                    break
                total += len(b)
                if total > 80_000_000:
                    break
                yield b
        finally:
            up.close()

    resp = Response(gen(), mimetype=ctype)
    resp.headers["Content-Disposition"] = 'attachment; filename="LockCOC_%s%s"' % (base, ext)
    return resp


'''
    a = a.replace(anchor, route + anchor, 1)
    open(p, "w", encoding="utf-8").write(a)

# ---- 2) JS nut Luu ----
js = r'''"use strict";
/* savebtn.js - nút Lưu về máy trong màn xem khoảnh khắc (Android lưu thẳng vào Ảnh/Phim, web dùng bảng chia sẻ / tải xuống) */
(function () {
  if (typeof openViewer !== "function" || typeof el !== "function") return;
  var native = function () { return !!(window.LockCOCNative && typeof window.LockCOCNative.save === "function"); };
  function mediaUrl(m) { var v = m.video, i = m.image; if (v) return { u: v, kind: "video" }; return { u: i, kind: "image" }; }
  function proxy(m) { var x = mediaUrl(m); if (!x.u) return null;
    return { url: "/api/save-media?u=" + encodeURIComponent(x.u) + "&kind=" + x.kind + "&n=" + encodeURIComponent(String(m.id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 10)), kind: x.kind }; }
  function fname(m, kind) { var d = new Date((m.ts || Date.now() / 1000) * 1000), p = function (n) { return String(n).padStart(2, "0"); };
    return "LockCOC_" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + (kind === "video" ? ".mp4" : ".jpg"); }
  async function save(m, btn) {
    var px = proxy(m); if (!px) { toast("Bài này không có file để lưu", "error"); return; }
    var name = fname(m, px.kind), mime = px.kind === "video" ? "video/mp4" : "image/jpeg";
    btn.disabled = true;
    try {
      if (native()) { window.LockCOCNative.save(location.origin + px.url, name, mime); toast("Đang lưu vào thư viện (Ảnh/Phim)", "ok"); return; }
      var r = await fetch(px.url, { credentials: "same-origin" }); if (!r.ok) throw new Error("Không tải được file");
      var blob = await r.blob(), file = new File([blob], name, { type: blob.type || mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); toast("Đã mở bảng chia sẻ, chọn Lưu ảnh/Lưu video", "ok"); return; } catch (e) { if (e && e.name === "AbortError") return; } }
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); toast("Đã tải về máy", "ok");
    } catch (e) { toast(e.message || "Lưu thất bại", "error"); }
    finally { btn.disabled = false; }
  }
  var _ov = openViewer;
  openViewer = function (m, opts) {
    var r = _ov.apply(this, arguments);
    try {
      var bodies = document.querySelectorAll(".viewer-body"), body = bodies[bodies.length - 1];
      if (body && m && (m.image || m.video) && !body.querySelector(".sv-btn")) {
        var b = el("button", { class: "btn block sv-btn", style: { marginTop: "14px" }, onclick: function (ev) { save(m, ev.currentTarget); } }, "⬇️ ", el("span", { class: "btn-label" }, m.video ? "Lưu video về máy" : "Lưu ảnh về máy"));
        var post = body.querySelector(".post"); if (post && post.nextSibling) body.insertBefore(b, post.nextSibling); else body.appendChild(b);
      }
    } catch (e) { /* bo qua */ }
    return r;
  };
})();
'''
open(os.path.join(R, "static/js/savebtn.js"), "w", encoding="utf-8").write(js)

# ---- 3) CSS ----
c = os.path.join(R, "static/polish.css")
s = open(c, encoding="utf-8").read()
if "/*svbtn*/" not in s:
    s += "\n/*svbtn*/\n.sv-btn{background:linear-gradient(135deg,#fbe3a0,#e2b04a 55%,#b9822a);color:#1a1306;font-weight:700;border:0}\n"
    open(c, "w", encoding="utf-8").write(s)

# ---- 4) index.html: nap sau social.js ----
h = open(os.path.join(R, "templates/index.html"), encoding="utf-8").read()
tag = '  <script src="/static/js/savebtn.js"></script>'
if tag not in h:
    fp = '  <script src="/static/js/fastpost.js"></script>'
    if fp not in h: raise SystemExit("[loi] khong thay fastpost.js trong index.html")
    h = h.replace(fp, fp + "\n" + tag, 1)
    open(os.path.join(R, "templates/index.html"), "w", encoding="utf-8").write(h)
print("[ok] patch54 xong: nut Luu anh/video ve may trong man xem bai cua minh (va cua ban be)")
