"use strict";
/* brandframe.js - khung ảnh thương hiệu "LockCOC VIP": viền vàng và logo mặt dây ở chân ảnh (không có chữ) */
(function () {
  if (typeof FRAMES === "undefined" || typeof renderFramed !== "function") return;
  if (!FRAMES.some(function (f) { return f.id === "vip"; })) FRAMES.splice(1, 0, { id: "vip", n: "LockCOC VIP", e: "👑" });
  function goldGrad(c, x0, y0, x1, y1) { var g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "#fbe3a0"); g.addColorStop(0.55, "#e2b04a"); g.addColorStop(1, "#b9822a"); return g; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  /* logo mặt dây chữ C, vẽ theo logo.svg của app; (cx,cy) là tâm, s là cạnh khung 512 */
  function logo(c, cx, cy, s) {
    var k = s / 512; c.save(); c.translate(cx - 256 * k, cy - 256 * k); c.scale(k, k);
    var g = goldGrad(c, 100, 60, 410, 450);
    c.strokeStyle = g; c.lineWidth = 14; rr(c, 226, 62, 60, 72, 30); c.stroke();
    c.beginPath(); c.arc(256, 292, 152, 0, Math.PI * 2); c.fillStyle = "#12100c"; c.fill(); c.lineWidth = 16; c.stroke();
    c.lineWidth = 40; c.lineCap = "round"; c.stroke(new Path2D("M319 238 A82 82 0 1 0 319 346"));
    c.beginPath(); c.arc(259, 292, 17, 0, Math.PI * 2); c.fillStyle = g; c.fill(); c.restore();
  }
  var _rf = renderFramed;
  renderFramed = async function (blob, frame, size) {
    if (frame !== "vip") return _rf.apply(this, arguments);
    size = size || 1080; var S = size, bmp = await createImageBitmap(blob);
    var cv = document.createElement("canvas"); cv.width = cv.height = S; var c = cv.getContext("2d");
    var bgG = c.createLinearGradient(0, 0, S, S); bgG.addColorStop(0, "#1d1810"); bgG.addColorStop(1, "#0a0907");
    rr(c, 0, 0, S, S, S * 0.07); c.fillStyle = bgG; c.fill();
    c.strokeStyle = goldGrad(c, 0, 0, S, S); c.lineWidth = S * 0.012; rr(c, S * 0.008, S * 0.008, S * 0.984, S * 0.984, S * 0.066); c.stroke();
    var side = S * 0.82, px = (S - side) / 2, py = S * 0.05, sq = Math.min(bmp.width, bmp.height);
    c.save(); rr(c, px, py, side, side, S * 0.035); c.clip();
    c.drawImage(bmp, (bmp.width - sq) / 2, (bmp.height - sq) / 2, sq, sq, px, py, side, side); c.restore();
    c.strokeStyle = goldGrad(c, px, py, px + side, py + side); c.lineWidth = S * 0.006; rr(c, px, py, side, side, S * 0.035); c.stroke();
    var by = py + side + (S - py - side) / 2, ls = S * 0.12;
    logo(c, S / 2, by, ls);
    return new Promise(function (res) { cv.toBlob(res, "image/jpeg", 0.92); });
  };
})();
