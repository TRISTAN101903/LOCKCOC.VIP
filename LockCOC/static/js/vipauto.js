"use strict";
/* vipauto.js - khung VIP cho video + tự áp khung VIP / tự làm nét khi soạn bài (bật tắt trong Hồ sơ) */
(function () {
  if (typeof openEditor !== "function" || typeof openStudio !== "function" || typeof api !== "function" || typeof el !== "function") return;
  var KV = "lc_auto_vip", KS = "lc_auto_sharp";
  function get(k) { try { return localStorage.getItem(k) === "1"; } catch (e) { return false; } }
  function set(k, v) { try { localStorage.setItem(k, v ? "1" : "0"); } catch (e) { /* bỏ qua */ } }
  window.lcVipVideo = false;

  var _oe = openEditor;
  openEditor = function (init) {
    var r = _oe.apply(this, arguments);
    try {
      var isVid = !!init && init.kind === "video";
      window.lcVipVideo = isVid && get(KV);
      var sbs = document.querySelectorAll(".ov-body .studio-btn"), sb = sbs[sbs.length - 1], cap = null;
      if (sb) { var _os = openStudio; openStudio = function (e) { cap = e; }; try { sb.click(); } finally { openStudio = _os; } }
      if (isVid) {
        if (sb && !sb.parentNode.querySelector(".vv-btn")) {
          var lab = function () { return "👑 Khung VIP cho video: " + (window.lcVipVideo ? "Bật" : "Tắt"); };
          var b = el("button", { class: "studio-btn glass vv-btn", type: "button" }, lab());
          b.addEventListener("click", function () { window.lcVipVideo = !window.lcVipVideo; b.textContent = lab(); });
          sb.parentNode.insertBefore(b, sb.nextSibling);
        }
        return r;
      }
      if (get(KV)) { var chip = document.querySelector('.frow [data-f="vip"]'); if (chip) chip.click(); }
      if (get(KS) && cap && typeof window.lcEnhance === "function" && cap.image) {
        window.lcEnhance(cap.image, 2).then(function (nb) { cap.image = nb; cap._aiBase = nb; if (cap._rm) cap._rm(); }).catch(function () { /* bỏ qua */ });
      }
    } catch (e) { /* bỏ qua */ }
    return r;
  };

  var _api = api;
  api = async function (path, opts) {
    if (path === "/api/post" && opts && opts.form instanceof FormData && window.lcVipVideo) {
      var f = opts.form, v = f.get("video");
      if (v instanceof Blob && v.size > 0) {
        f.set("vip_frame", "1");
        try { var th = f.get("image"); if (th instanceof Blob && typeof renderFramed === "function") f.set("image", await renderFramed(th, "vip", 720), "photo.jpg"); } catch (e) { /* giữ ảnh gốc */ }
      }
    }
    return _api.apply(this, arguments);
  };

  function mount() {
    var host = document.querySelector("#page-me .me-actions"); if (!host) return false; if (host.querySelector(".av-toggle")) return true;
    [[KV, "Tự áp khung VIP khi đăng"], [KS, "Tự làm nét ảnh khi soạn"]].forEach(function (p) {
      var lab = function () { return p[1] + ": " + (get(p[0]) ? "Bật" : "Tắt"); };
      var b = el("button", { class: "btn small av-toggle", type: "button" }, el("span", { class: "btn-label" }, lab()));
      b.addEventListener("click", function () { set(p[0], !get(p[0])); b.querySelector(".btn-label").textContent = lab(); toast(lab(), "ok"); });
      host.appendChild(b);
    });
    return true;
  }
  if (!mount()) { var n = 0, iv = setInterval(function () { if (mount() || ++n > 40) clearInterval(iv); }, 500); }
})();
