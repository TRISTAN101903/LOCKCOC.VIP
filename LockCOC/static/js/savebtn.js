"use strict";
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
