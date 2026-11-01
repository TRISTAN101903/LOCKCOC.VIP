"use strict";
/* orient.js - ảnh/video chọn từ thư viện giữ nguyên ngang/dọc/vuông (không cắt vuông), cả khi xem trước lẫn khi đăng */
(function () {
  function dims(blob) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { var r = { w: im.naturalWidth, h: im.naturalHeight }; URL.revokeObjectURL(u); res(r); };
      im.onerror = function () { URL.revokeObjectURL(u); res(null); };
      im.src = u;
    });
  }
  /* ảnh bìa của video: giữ đúng khung hình, cạnh dài tối đa 1280 */
  if (typeof videoThumb === "function") {
    videoThumb = function (file) {
      return new Promise(function (resolve) {
        var url = URL.createObjectURL(file), v = document.createElement("video");
        v.muted = true; v.playsInline = true; v.preload = "metadata"; v.src = url;
        var done = false, fail = function () { if (done) return; done = true; URL.revokeObjectURL(url); resolve(null); };
        v.onerror = fail;
        v.onloadeddata = function () { try { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); } catch (e) { /* bỏ qua */ } };
        v.onseeked = function () {
          if (done) return; done = true;
          var k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight)), w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
          var c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(v, 0, 0, w, h);
          c.toBlob(function (b) { URL.revokeObjectURL(url); resolve(b); }, "image/jpeg", 0.9);
        };
        setTimeout(fail, 8000);
      });
    };
  }
  function setRatio(pv, r) {
    if (!pv) return;
    r = Math.max(0.45, Math.min(2.2, r));
    pv.style.aspectRatio = String(r); pv.style.width = "min(calc(100% - 28px), " + Math.round(52 * r) + "vh)";
    pv.style.borderRadius = "28px"; pv.dataset.ratio = r;
  }
  if (typeof openEditor === "function") {
    var _oe = openEditor;
    openEditor = function (init) {
      var out = _oe.apply(this, arguments);
      try {
        var ovs = document.querySelectorAll(".overlay"), ov = ovs[ovs.length - 1] || document, pv = ov.querySelector(".preview");
        dims(init.image).then(function (d) {
          if (!d || !pv) return;
          var r = d.w / d.h; if (Math.abs(r - 1) < 0.03) return;
          setRatio(pv, r);
          /* khung widget luôn vuông: tắt giữ tỉ lệ khi chọn khung, bật lại khi bỏ khung */
          ov.querySelectorAll("[data-f]").forEach(function (b) { b.addEventListener("click", function () { if (b.dataset.f === "none") setRatio(pv, r); else { pv.style.aspectRatio = "1"; pv.style.width = ""; } }); });
        });
      } catch (e) { /* bỏ qua */ }
      return out;
    };
  }
  /* bảng tin: ảnh không vuông hiện đúng tỉ lệ */
  function fixMedia(m) {
    var pm = m.closest && m.closest(".post-media"); if (!pm) return;
    var w = m.naturalWidth || m.videoWidth, h = m.naturalHeight || m.videoHeight; if (!w || !h) return;
    var r = w / h; if (Math.abs(r - 1) < 0.04) return;
    pm.style.aspectRatio = String(Math.max(0.56, Math.min(1.78, r))); m.style.objectFit = "cover";
  }
  document.addEventListener("load", function (e) { if (e.target && e.target.tagName === "IMG") fixMedia(e.target); }, true);
  document.addEventListener("loadedmetadata", function (e) { if (e.target && e.target.tagName === "VIDEO") fixMedia(e.target); }, true);
})();
