"use strict";
/* looks.js - bộ lọc màu điện ảnh: chỉnh màu + vignette + grain + ánh sáng tràn, in thẳng vào ảnh và video */
(function () {
  var vfEl = document.getElementById("viewfinder"), strip = document.getElementById("filter-strip");
  if (!vfEl || !strip || typeof FILTERS === "undefined" || typeof drawSquare !== "function") return;
  var TAU = Math.PI * 2;
  var LOOKS = [
    { id: "kodak", n: "Kodak Gold", sw: ["#f7c97a", "#a55a2a"], css: "sepia(.18) saturate(1.22) contrast(1.08) brightness(1.04) hue-rotate(-6deg)", ov: { tint: ["#ffaa46", 0.1, "soft-light"], vig: 0.28, grain: 0.07 } },
    { id: "fuji", n: "Fuji Pro", sw: ["#9fd8c4", "#3d7a8a"], css: "saturate(1.1) contrast(1.06) hue-rotate(8deg) brightness(1.04)", ov: { tint: ["#50c8aa", 0.1, "soft-light"], vig: 0.2, grain: 0.06 } },
    { id: "cinema", n: "Cinema", sw: ["#ff9a40", "#1f7f8c"], css: "contrast(1.15) saturate(1.1)", ov: { grad: ["#1f8a9a", "#ff9638", 0.3, "soft-light"], vig: 0.34, grain: 0.04 } },
    { id: "polaroid", n: "Polaroid", sw: ["#f2dcc4", "#9a8f86"], css: "contrast(.92) saturate(1.12) brightness(1.08) sepia(.12)", ov: { fade: 0.12, vig: 0.22, grain: 0.05 } },
    { id: "golden", n: "Golden Hour", sw: ["#ffc760", "#e0702a"], css: "sepia(.25) saturate(1.4) brightness(1.05)", ov: { leak: ["#ff9632", 0.55, 0.1, 0.0], vig: 0.2 } },
    { id: "dream", n: "Dreamy", sw: ["#ffd0ec", "#c99ae6"], css: "brightness(1.1) contrast(.9) saturate(1.15)", ov: { tint: ["#ffaadc", 0.16, "screen"], fade: 0.08, vig: 0.12 } },
    { id: "pastel", n: "Pastel", sw: ["#cfe8ff", "#f6c7e6"], css: "saturate(.92) brightness(1.12) contrast(.88)", ov: { tint: ["#c8b4ff", 0.12, "soft-light"], fade: 0.1 } },
    { id: "noir", n: "Noir", sw: ["#cfcfcf", "#222"], css: "grayscale(1) contrast(1.3) brightness(.95)", ov: { vig: 0.5, grain: 0.1 } },
    { id: "bw", n: "Trắng đen mềm", sw: ["#f0f0f0", "#777"], css: "grayscale(1) contrast(.96) brightness(1.08)", ov: { fade: 0.1, grain: 0.06, vig: 0.15 } },
    { id: "vhs", n: "Cam 90s", sw: ["#e8b878", "#4a5a7a"], css: "sepia(.3) saturate(.95) contrast(1.1) brightness(1.02)", ov: { tint: ["#ff8c50", 0.08, "soft-light"], vig: 0.3, grain: 0.09, date: 1 } },
    { id: "ccd", n: "CCD 2000", sw: ["#ffe9a8", "#e06a8a"], css: "contrast(1.15) saturate(1.3) brightness(1.1)", ov: { vig: 0.1, grain: 0.04, flash: 1, date: 1 } },
    { id: "moody", n: "Moody", sw: ["#5a6d8a", "#1c2230"], css: "contrast(1.2) saturate(.75) brightness(.92)", ov: { tint: ["#3c5a96", 0.12, "soft-light"], vig: 0.42, grain: 0.05 } },
    { id: "ice", n: "Lạnh", sw: ["#cfe6ff", "#5c8fd0"], css: "saturate(.9) hue-rotate(14deg) brightness(1.06)", ov: { tint: ["#6eaaff", 0.14, "soft-light"], vig: 0.16 } },
    { id: "rose", n: "Da hồng", sw: ["#ffd5d0", "#e89aa6"], css: "brightness(1.08) saturate(1.1) contrast(.95)", ov: { tint: ["#ff9fb4", 0.12, "soft-light"], fade: 0.05, vig: 0.12 } },
    { id: "sunset", n: "Hoàng hôn", sw: ["#ff7a8a", "#ffb040"], css: "sepia(.15) saturate(1.4) hue-rotate(-12deg)", ov: { grad: ["#ff5a8c", "#ffaa30", 0.3, "soft-light"], vig: 0.22 } },
    { id: "cyber", n: "Cyber", sw: ["#ff2db4", "#12d6ff"], css: "contrast(1.2) saturate(1.5) hue-rotate(-20deg)", ov: { grad: ["#ff1ea8", "#00d8ff", 0.3, "screen"], vig: 0.25 } },
    { id: "matte", n: "Matte", sw: ["#cdbfae", "#6f6a62"], css: "contrast(.88) brightness(1.04) saturate(.85)", ov: { fade: 0.14, vig: 0.1 } },
    { id: "burn", n: "Cháy phim", sw: ["#ff6a2a", "#7a1c10"], css: "sepia(.2) saturate(1.3) contrast(1.1)", ov: { leak: ["#ff4a1e", 0.8, 0.0, 0.5], grain: 0.1, vig: 0.3 } },
    { id: "sun", n: "Nắng ấm", sw: ["#fff0a8", "#f2a640"], css: "brightness(1.08) saturate(1.2) sepia(.12)", ov: { leak: ["#ffe070", 0.5, 0.0, 0.0], vig: 0.14 } }
  ];
  var BYID = {}; LOOKS.forEach(function (l) { BYID[l.id] = l; FILTERS.push({ id: l.id, n: l.n, css: l.css, ov: l.ov }); });

  var noise = (function () {
    var c = document.createElement("canvas"); c.width = c.height = 160; var x = c.getContext("2d"), d = x.createImageData(160, 160);
    for (var i = 0; i < d.data.length; i += 4) { var v = 128 + (Math.random() - 0.5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return c;
  })();
  var noise2 = (function () {
    var c = document.createElement("canvas"); c.width = c.height = 160; var x = c.getContext("2d"), d = x.createImageData(160, 160);
    for (var i = 0; i < d.data.length; i += 4) { var v = Math.random() < 0.5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.random() * 150; }
    x.putImageData(d, 0, 0); return c;
  })();
  function drawOv(ctx, S, ov, prev) {
    if (!ov) return;
    var K = prev ? 0.55 : 1, M = function (m) { return prev ? "source-over" : m; };
    ctx.save();
    if (ov.fade) { ctx.globalCompositeOperation = M("lighten"); ctx.fillStyle = "rgba(255,245,235," + (ov.fade * (prev ? 0.8 : 0.9)) + ")"; ctx.fillRect(0, 0, S, S); ctx.globalCompositeOperation = "source-over"; }
    if (ov.tint) { ctx.globalCompositeOperation = M(ov.tint[2]); ctx.globalAlpha = Math.min(1, ov.tint[1] * 3.2 * K * (prev ? 0.6 : 1)); ctx.fillStyle = ov.tint[0]; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    if (ov.grad) { var g = ctx.createLinearGradient(0, S, S, 0); g.addColorStop(0, ov.grad[0]); g.addColorStop(1, ov.grad[1]); ctx.globalCompositeOperation = M(ov.grad[3]); ctx.globalAlpha = Math.min(1, ov.grad[2] * 2.4 * K * (prev ? 0.6 : 1)); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    if (ov.leak) { var L = ov.leak, lx = L[2] * S, ly = L[3] * S, g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, S * (0.55 + L[1] * 0.3)); g2.addColorStop(0, L[0]); g2.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalCompositeOperation = M("screen"); ctx.globalAlpha = Math.min(0.85, L[1]) * (prev ? 0.6 : 1); ctx.fillStyle = g2; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    if (ov.flash) { var g3 = ctx.createRadialGradient(S * 0.5, S * 0.42, 0, S * 0.5, S * 0.42, S * 0.7); g3.addColorStop(0, "rgba(255,255,255,.28)"); g3.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g3; ctx.fillRect(0, 0, S, S); }
    if (ov.vig) { var g4 = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.78); g4.addColorStop(0, "rgba(0,0,0,0)"); g4.addColorStop(1, "rgba(0,0,0," + ov.vig * 1.3 + ")"); ctx.fillStyle = g4; ctx.fillRect(0, 0, S, S); }
    if (ov.grain) { ctx.globalCompositeOperation = M("overlay"); ctx.globalAlpha = Math.min(1, ov.grain * (prev ? 3 : 5)); var p = ctx.createPattern(prev ? noise2 : noise, "repeat"); ctx.save(); ctx.translate((Math.random() * 100) | 0, (Math.random() * 100) | 0); ctx.fillStyle = p; ctx.fillRect(-100, -100, S + 200, S + 200); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    if (ov.date) { var d = new Date(), t = "'" + String(d.getFullYear()).slice(2) + " " + (d.getMonth() + 1) + " " + d.getDate(); ctx.font = "700 " + Math.round(S * 0.052) + "px 'Courier New',monospace"; ctx.textAlign = "right"; ctx.fillStyle = "#ff9a2e"; ctx.shadowColor = "rgba(255,120,0,.7)"; ctx.shadowBlur = S * 0.012; ctx.fillText(t, S * 0.94, S * 0.95); }
    ctx.restore();
  }
  /* in vào ảnh/video xuất ra: chạy trong drawSquare, nằm dưới các sticker của Filter Locket */
  var _ds = drawSquare;
  drawSquare = function (ctx, size) { var ok = _ds(ctx, size); if (ok && cam.filter && cam.filter.ov) drawOv(ctx, size, cam.filter.ov); return ok; };

  /* xem trước: canvas phủ lên khung ngắm, vẽ lại ~8 lần/giây để hạt phim nhấp nháy nhẹ */
  var cv = document.createElement("canvas"); cv.className = "look-canvas"; cv.width = cv.height = 540; vfEl.appendChild(cv);
  var cx = cv.getContext("2d"), tm = 0;
  function paintLook() {
    clearInterval(tm); cx.clearRect(0, 0, 540, 540);
    var ov = cam.filter && cam.filter.ov; if (!ov) return;
    drawOv(cx, 540, ov, true); if (ov.grain) tm = setInterval(function () { if (document.hidden) return; cx.clearRect(0, 0, 540, 540); drawOv(cx, 540, ov, true); }, 140);
  }
  var _af = applyFilter; applyFilter = function () { _af(); paintLook(); };

  /* chip có ô màu mẫu, xếp ngay sau các chip cũ */
  LOOKS.forEach(function (l) {
    var sw = el("i", { class: "lk-sw" }); sw.style.background = "linear-gradient(135deg," + l.sw[0] + "," + l.sw[1] + ")";
    var b = el("button", { class: "chip lk", dataset: { f: l.id }, type: "button", onclick: function () {
      cam.filter = BYID[l.id] && FILTERS.find(function (f) { return f.id === l.id; }); applyFilter();
      document.querySelectorAll("#filter-strip .chip").forEach(function (c) { c.classList.toggle("on", c.dataset.f === l.id); });
      if (typeof haptic === "function") haptic(8);
    } }, sw, l.n);
    strip.appendChild(b);
  });
  window.lcLooks = { list: LOOKS };
})();
