"use strict";
/* perf2.js - tối ưu lướt app: giải mã ảnh không chặn luồng chính, chỉ 1 video phát tại một thời điểm, dọn quan sát video đã bị gỡ */
(function () {
  function fix(n) {
    if (!n || n.nodeType !== 1) return;
    var l = n.tagName === "IMG" ? [n] : (n.querySelectorAll ? n.querySelectorAll("img") : []);
    for (var i = 0; i < l.length; i++) { if (!l[i].hasAttribute("decoding")) l[i].decoding = "async"; }
  }
  try {
    new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var a = ms[i].addedNodes; for (var j = 0; j < a.length; j++) fix(a[j]); } }).observe(document.body, { childList: true, subtree: true });
    fix(document.body);
  } catch (e) { /* bỏ qua */ }

  if (typeof mediaBlock !== "function" || typeof el !== "function" || typeof safeUrl !== "function" || typeof imgEl !== "function" || !window.IntersectionObserver) return;
  var vis = new Set(), io = null;
  function pick() {
    var best = null, bd = 1e9, mid = window.innerHeight / 2;
    vis.forEach(function (v) {
      if (!v.isConnected) { vis.delete(v); if (io) io.unobserve(v); return; }
      var r = v.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bd) { bd = d; best = v; }
    });
    vis.forEach(function (v) { if (v !== best && !v.paused) v.pause(); });
    if (best && !document.hidden && best.paused) { var p = best.play(); if (p && p.catch) p.catch(function () { /* bỏ qua */ }); }
  }
  io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) vis.add(e.target); else { vis.delete(e.target); if (!e.target.paused) e.target.pause(); } });
    pick();
  }, { threshold: 0.6 });
  document.addEventListener("visibilitychange", function () { if (document.hidden) vis.forEach(function (v) { v.pause(); }); else pick(); });

  mediaBlock = function (m, opts) {
    opts = opts || {};
    var box = el("div", { class: "post-media" }), src = safeUrl(m.image);
    if (m.video && safeUrl(m.video) && opts.play !== false) {
      var v = el("video", { src: safeUrl(m.video), poster: src || null, playsinline: "", loop: "", muted: "", preload: "none", disableremoteplayback: "" });
      v.muted = true; box.append(v); io.observe(v);
      v.addEventListener("error", function () { v.replaceWith(src ? imgEl(src) : el("div", { class: "ph" }, "🎬")); });
    } else box.append(src ? imgEl(src) : el("div", { class: "ph" }, "🖼️"));
    if (m.caption) box.append(el("div", { class: "cap-pill" }, m.caption));
    return box;
  };
})();
