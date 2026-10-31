"use strict";
/* filters.js - Filter Locket: sticker gắn lên khuôn mặt (tự dò mặt, kéo để chỉnh) và hiệu ứng toàn khung như Slimed.
   Vẽ thẳng vào ảnh chụp và video quay. Dò mặt: FaceDetector của trình duyệt nếu có, không thì tìm vùng da. */
(function () {
  var vfEl = document.getElementById("viewfinder");
  if (!vfEl || typeof drawSquare !== "function") return;
  var TAU = Math.PI * 2;

  /* ------------------------------------------------ vẽ sticker (toạ độ tương đối theo khuôn mặt) */
  function grad(c, x0, y0, x1, y1, a, b) { var g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function hair(c, F, col, dark, bob, fringe) {
    var w = F.w, top = F.top - F.h * 0.12, side = w * 0.62, bottom = bob ? F.chin + F.h * 0.05 : F.eyeY + F.h * 0.22;
    c.beginPath(); c.moveTo(-side, bottom);
    c.bezierCurveTo(-side * 1.25, F.eyeY - F.h * 0.1, -side * 1.05, top, 0, top - F.h * 0.04);
    c.bezierCurveTo(side * 1.05, top, side * 1.25, F.eyeY - F.h * 0.1, side, bottom);
    c.lineTo(side * 0.72, bottom); c.lineTo(side * 0.7, F.eyeY - F.h * 0.2);
    c.quadraticCurveTo(0, F.top + (fringe ? F.h * 0.1 : F.h * 0.0), -side * 0.7, F.eyeY - F.h * 0.2);
    c.lineTo(-side * 0.72, bottom); c.closePath();
    c.fillStyle = grad(c, 0, top, 0, bottom, col, dark); c.fill();
    c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = Math.max(1, w * 0.012);
    for (var i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * side * 0.22, top + F.h * 0.02); c.quadraticCurveTo(i * side * 0.3, F.eyeY - F.h * 0.2, i * side * 0.27, bottom - F.h * 0.1); c.stroke(); }
    c.fillStyle = "rgba(255,255,255,.22)"; c.beginPath(); c.ellipse(-side * 0.25, top + F.h * 0.08, side * 0.35, F.h * 0.04, -0.3, 0, TAU); c.fill();
  }
  function heart(c, x, y, s, col) {
    c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 0.35);
    c.bezierCurveTo(-1, -0.25, -0.5, -0.95, 0, -0.45); c.bezierCurveTo(0.5, -0.95, 1, -0.25, 0, 0.35); c.fillStyle = col; c.fill();
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(-0.35, -0.42, 0.14, 0.09, -0.6, 0, TAU); c.fill(); c.restore();
  }
  function star(c, x, y, r, col) { c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath(); for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * 0.28 : r; c.lineTo(Math.cos(i * Math.PI / 4) * rr, Math.sin(i * Math.PI / 4) * rr); } c.closePath(); c.fill(); c.restore(); }
  function lips(c, F, col) {
    var w = F.w * 0.62, h = F.h * 0.2, y = F.mouthY;
    c.fillStyle = grad(c, 0, y - h, 0, y + h, "#ff8fa5", col);
    c.beginPath(); c.moveTo(-w / 2, y); c.bezierCurveTo(-w * 0.3, y - h * 1.1, -w * 0.08, y - h * 0.9, 0, y - h * 0.55); c.bezierCurveTo(w * 0.08, y - h * 0.9, w * 0.3, y - h * 1.1, w / 2, y);
    c.bezierCurveTo(w * 0.3, y + h * 1.15, -w * 0.3, y + h * 1.15, -w / 2, y); c.fill();
    c.strokeStyle = "rgba(120,0,30,.45)"; c.lineWidth = F.w * 0.012; c.beginPath(); c.moveTo(-w / 2 + 2, y); c.quadraticCurveTo(0, y + h * 0.12, w / 2 - 2, y); c.stroke();
    c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.ellipse(-w * 0.12, y + h * 0.55, w * 0.14, h * 0.13, 0, 0, TAU); c.fill();
  }
  function mustache(c, F, col) {
    var y = F.mouthY - F.h * 0.1, w = F.w * 0.62; c.fillStyle = col;
    [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(s * w * 0.15, y - F.h * 0.06, s * w * 0.45, y - F.h * 0.04, s * w * 0.55, y + F.h * 0.06); c.bezierCurveTo(s * w * 0.4, y + F.h * 0.02, s * w * 0.2, y + F.h * 0.07, 0, y + F.h * 0.04); c.fill(); });
  }
  function beard(c, F, col) {
    c.fillStyle = col; c.beginPath(); c.moveTo(-F.w * 0.5, F.eyeY + F.h * 0.1);
    c.bezierCurveTo(-F.w * 0.55, F.chin + F.h * 0.12, F.w * 0.55, F.chin + F.h * 0.12, F.w * 0.5, F.eyeY + F.h * 0.1);
    c.lineTo(F.w * 0.36, F.mouthY - F.h * 0.1); c.quadraticCurveTo(0, F.mouthY - F.h * 0.2, -F.w * 0.36, F.mouthY - F.h * 0.1); c.closePath(); c.fill();
    c.fillStyle = "#e9a9a0"; c.beginPath(); c.ellipse(0, F.mouthY + F.h * 0.02, F.w * 0.16, F.h * 0.04, 0, 0, TAU); c.fill();
  }
  function cap(c, F, kind) {
    var w = F.w * 0.95, top = F.top - F.h * 0.02;
    if (kind === "bowl") { c.fillStyle = grad(c, -w / 2, top, w / 2, top + F.h * 0.4, "#2b3a5e", "#0d1426"); c.beginPath(); c.ellipse(0, F.eyeY - F.h * 0.16, w * 0.55, F.h * 0.46, 0, Math.PI, TAU); c.fill();
      c.fillStyle = "#050913"; [[-0.1, 0.12], [0.1, 0.12], [0, 0.25]].forEach(function (p) { c.beginPath(); c.ellipse(p[0] * w, top + p[1] * F.h, w * 0.05, w * 0.05, 0, 0, TAU); c.fill(); });
      c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(-w * 0.22, top + F.h * 0.1, w * 0.12, F.h * 0.05, -0.5, 0, TAU); c.fill(); }
    else { /* mũ tiệc */ c.fillStyle = grad(c, 0, top - F.h * 0.55, 0, top, "#ff5fa2", "#7b5cff"); c.beginPath(); c.moveTo(-w * 0.32, top + F.h * 0.02); c.lineTo(0, top - F.h * 0.62); c.lineTo(w * 0.32, top + F.h * 0.02); c.closePath(); c.fill();
      c.fillStyle = "#ffd84d"; for (var i = 0; i < 5; i++) { c.beginPath(); c.arc((i - 2) * w * 0.12, top - F.h * (0.05 + (2 - Math.abs(i - 2)) * 0.12), w * 0.025, 0, TAU); c.fill(); }
      c.beginPath(); c.arc(0, top - F.h * 0.64, w * 0.07, 0, TAU); c.fillStyle = "#ffd84d"; c.fill(); }
  }
  function tiara(c, F) {
    var w = F.w * 0.7, y = F.top - F.h * 0.06; c.strokeStyle = grad(c, -w, y, w, y, "#cfd8e8", "#fff"); c.lineWidth = F.w * 0.035; c.lineCap = "round";
    c.beginPath(); c.moveTo(-w * 0.55, y + F.h * 0.1); c.quadraticCurveTo(0, y - F.h * 0.28, w * 0.55, y + F.h * 0.1); c.stroke();
    [[-0.3, 0.02], [0, -0.1], [0.3, 0.02]].forEach(function (p, i) { c.fillStyle = i === 1 ? "#ff5fa2" : "#a8d8ff"; c.beginPath(); c.moveTo(p[0] * w, y + p[1] * F.h - F.h * 0.07); c.lineTo(p[0] * w + F.w * 0.05, y + p[1] * F.h); c.lineTo(p[0] * w, y + p[1] * F.h + F.h * 0.06); c.lineTo(p[0] * w - F.w * 0.05, y + p[1] * F.h); c.closePath(); c.fill(); });
  }
  function disco(c, F, t) {
    var r = F.w * 0.2, y = F.top - F.h * 0.22; c.fillStyle = grad(c, -r, y - r, r, y + r, "#f4f6fb", "#7d8696"); c.beginPath(); c.arc(0, y, r, 0, TAU); c.fill();
    c.strokeStyle = "rgba(60,70,90,.5)"; c.lineWidth = 1.2; for (var i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * r / 3.4, y - r); c.lineTo(i * r / 3.4, y + r); c.stroke(); c.beginPath(); c.moveTo(-r, y + i * r / 3.4); c.lineTo(r, y + i * r / 3.4); c.stroke(); }
    c.save(); c.beginPath(); c.arc(0, y, r, 0, TAU); c.clip(); c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(-r + ((t * 40) % (r * 3)) - r * 0.5, y - r, r * 0.35, r * 2); c.restore();
    star(c, -F.w * 0.45, F.top, F.w * 0.06 * (1 + 0.3 * Math.sin(t * 5)), "#fff"); star(c, F.w * 0.48, F.top + F.h * 0.1, F.w * 0.05 * (1 + 0.3 * Math.cos(t * 4)), "#ffe27a");
  }
  function money(c, F, t) {
    [[-0.62, 0.0, -0.4], [0.62, -0.05, 0.35], [-0.55, 0.38, 0.5], [0.56, 0.4, -0.3]].forEach(function (p, i) {
      var bx = p[0] * F.w, by = F.eyeY + p[1] * F.h + Math.sin(t * 2 + i) * F.h * 0.02, bw = F.w * 0.34, bh = F.w * 0.17;
      c.save(); c.translate(bx, by); c.rotate(p[2]); c.fillStyle = grad(c, -bw / 2, 0, bw / 2, 0, "#8fd18d", "#4ea85a"); c.strokeStyle = "#2f7a3b"; c.lineWidth = 2;
      c.beginPath(); c.roundRect ? c.roundRect(-bw / 2, -bh / 2, bw, bh, 4) : c.rect(-bw / 2, -bh / 2, bw, bh); c.fill(); c.stroke();
      c.fillStyle = "#2f7a3b"; c.font = "bold " + Math.round(bh * 0.7) + "px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("$", 0, 1); c.restore();
    });
  }
  function ears(c, F) {
    var w = F.w, y = F.top - F.h * 0.02;
    [-1, 1].forEach(function (s) { c.fillStyle = "#3b3140"; c.beginPath(); c.moveTo(s * w * 0.18, y + F.h * 0.06); c.lineTo(s * w * 0.5, y - F.h * 0.3); c.lineTo(s * w * 0.55, y + F.h * 0.12); c.closePath(); c.fill();
      c.fillStyle = "#ff9fc0"; c.beginPath(); c.moveTo(s * w * 0.27, y + F.h * 0.05); c.lineTo(s * w * 0.47, y - F.h * 0.2); c.lineTo(s * w * 0.5, y + F.h * 0.08); c.closePath(); c.fill(); });
  }
  function hearts(c, F, t) { for (var i = 0; i < 6; i++) { var a = t * 0.9 + i * TAU / 6, r = F.w * 0.72; heart(c, Math.cos(a) * r, F.eyeY - F.h * 0.05 + Math.sin(a) * F.h * 0.62, F.w * (0.075 + 0.02 * Math.sin(t * 3 + i)), i % 2 ? "#ff5f8f" : "#ffb3d1"); } }
  function flowers(c, F) {
    var cols = ["#ffd84d", "#ff9fc0", "#fff", "#a98bff", "#ff8a5c"], n = 9;
    c.strokeStyle = "#5aa05a"; c.lineWidth = F.w * 0.03; c.beginPath(); c.ellipse(0, F.top + F.h * 0.1, F.w * 0.55, F.h * 0.2, 0, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
    for (var i = 0; i < n; i++) { var a = Math.PI * (1.04 + 0.92 * i / (n - 1)), x = Math.cos(a) * F.w * 0.55, y = F.top + F.h * 0.1 + Math.sin(a) * F.h * 0.2;
      c.fillStyle = cols[i % 5]; for (var k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * TAU / 5) * F.w * 0.035, y + Math.sin(k * TAU / 5) * F.w * 0.035, F.w * 0.032, 0, TAU); c.fill(); }
      c.fillStyle = "#ffb300"; c.beginPath(); c.arc(x, y, F.w * 0.022, 0, TAU); c.fill(); }
  }
  function antenna(c, F, t) {
    [-1, 1].forEach(function (s) { var sw = Math.sin(t * 3 + s) * F.w * 0.03, x1 = s * F.w * 0.28, y1 = F.top - F.h * 0.02, x2 = s * F.w * 0.4 + sw, y2 = F.top - F.h * 0.4;
      c.strokeStyle = "#f2c94c"; c.lineWidth = F.w * 0.03; c.lineCap = "round"; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(s * F.w * 0.15, (y1 + y2) / 2, x2, y2); c.stroke(); heart(c, x2, y2 - F.w * 0.04, F.w * 0.1, "#ffd84d"); });
  }
  function toothless(c, F) {
    var w = F.w * 0.34, y = F.mouthY - F.h * 0.02, h = F.h * 0.1; c.fillStyle = "#fffaf0"; c.beginPath(); c.roundRect ? c.roundRect(-w / 2, y - h / 2, w, h, h * 0.3) : c.rect(-w / 2, y - h / 2, w, h); c.fill();
    c.fillStyle = "#14100c"; c.fillRect(-w * 0.08, y - h / 2, w * 0.16, h); c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1.5; [-0.3, 0.3].forEach(function (p) { c.beginPath(); c.moveTo(p * w, y - h / 2); c.lineTo(p * w, y + h / 2); c.stroke(); });
  }

  /* hiệu ứng toàn khung: Slimed */
  var slimeSeed = []; for (var si = 0; si < 14; si++) slimeSeed.push([Math.random(), Math.random(), Math.random()]);
  function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
  function slime(c, S, e) {
    c.fillStyle = "rgba(120,190,40," + (0.14 * ease(e / 1.5)) + ")"; c.fillRect(0, 0, S, S);
    var g = grad(c, 0, 0, S, 0, "#a6dc3c", "#6fae1e"); c.fillStyle = g; c.strokeStyle = g;
    c.fillRect(0, 0, S, S * 0.05 * ease(e / 0.8));
    slimeSeed.forEach(function (s, i) {
      var x = (i + 0.5) / slimeSeed.length * S, w = S * (0.03 + 0.032 * s[1]), len = S * (0.15 + 0.5 * s[0]) * ease(e / (1.0 + s[2] * 2.2)) + S * 0.012 * Math.sin(e * 1.3 + i);
      c.beginPath(); c.moveTo(x - w * 0.8, 0); c.quadraticCurveTo(x - w * 0.5, len * 0.4, x - w * 0.5, len); c.arc(x, len, w * 0.5, Math.PI, 0, true); c.quadraticCurveTo(x + w * 0.5, len * 0.4, x + w * 0.8, 0); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(x - w * 0.3, S * 0.01, w * 0.14, Math.max(0, len - w)); c.fillStyle = g;
      c.beginPath(); c.ellipse(x - w * 0.12, len + w * 0.1, w * 0.12, w * 0.18, 0, 0, TAU); c.fillStyle = "rgba(255,255,255,.5)"; c.fill(); c.fillStyle = g;
    });
    var ph = S * 0.2 * ease((e - 0.6) / 2.4); c.beginPath(); c.moveTo(0, S);
    for (var x = 0; x <= S; x += S / 24) c.lineTo(x, S - ph - Math.sin(x / S * 9 + e * 1.4) * S * 0.014 * ease(e / 2));
    c.lineTo(S, S); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.ellipse(S * 0.3, S - ph * 0.7, S * 0.12, S * 0.012, 0, 0, TAU); c.fill();
  }

  var LIST = [
    ["Goofy", [
      ["wigY", "Tóc vàng", function (c, F) { hair(c, F, "#ffd35c", "#d9962a", false, true); }],
      ["lips", "Môi to", function (c, F) { lips(c, F, "#d6204f"); }],
      ["tooth", "Mất răng", toothless],
      ["mus", "Ria mép", function (c, F) { mustache(c, F, "#4a2f1d"); }]]],
    ["Kiểu tóc", [
      ["bowl", "Quả bowling", function (c, F) { cap(c, F, "bowl"); }],
      ["blonde", "Bạch kim", function (c, F) { hair(c, F, "#f4efe0", "#d9d0b4", true, true); }],
      ["beard", "Râu", function (c, F) { beard(c, F, "#2b1d14"); }],
      ["bob", "Tóc bob", function (c, F) { hair(c, F, "#c8692e", "#8d3f14", true, true); }]]],
    ["Ăn mừng", [
      ["slime", "Slimed", null],
      ["tiara", "Công chúa", function (c, F) { tiara(c, F); }],
      ["disco", "Disco", disco],
      ["money", "Tiền", money],
      ["party", "Mũ tiệc", function (c, F) { cap(c, F, "party"); }]]],
    ["Dễ thương", [
      ["ears", "Tai mèo", function (c, F) { ears(c, F); }],
      ["hearts", "Tim bay", hearts],
      ["flowers", "Vòng hoa", function (c, F) { flowers(c, F); }],
      ["bug", "Love Bug", antenna]]]
  ];
  var BY = {}; LIST.forEach(function (g) { g[1].forEach(function (it) { BY[it[0]] = { id: it[0], name: it[1], draw: it[2], screen: it[0] === "slime" }; }); });

  /* ------------------------------------------------ trạng thái + dò mặt */
  var fx = { id: null, t0: 0, face: { x: 0.5, y: 0.46, w: 0.42, h: 0.5, roll: 0, found: false }, adj: { dx: 0, dy: 0, s: 1 }, last: 0 };
  var _ds = drawSquare, small = document.createElement("canvas"); small.width = small.height = 72;
  var sx = small.getContext("2d", { willReadFrequently: true }), fd = null;
  try { if ("FaceDetector" in window) fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }); } catch (e) { fd = null; }
  var busy = false;
  function skinBlob() {
    var d = sx.getImageData(0, 0, 72, 72).data, N = 72, mask = new Uint8Array(N * N), i, x, y;
    for (i = 0; i < N * N; i++) { var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], Y = 0.299 * r + 0.587 * g + 0.114 * b, cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
      mask[i] = (Y > 50 && cb > 77 && cb < 127 && cr > 135 && cr < 173) ? 1 : 0; }
    var best = null, seen = new Uint8Array(N * N), stack = [];
    for (i = 0; i < N * N; i++) { if (!mask[i] || seen[i]) continue;
      var minx = N, miny = N, maxx = 0, maxy = 0, cnt = 0; stack.length = 0; stack.push(i); seen[i] = 1;
      while (stack.length) { var p = stack.pop(); x = p % N; y = (p / N) | 0; cnt++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        [p - 1, p + 1, p - N, p + N].forEach(function (q) { if (q >= 0 && q < N * N && mask[q] && !seen[q] && Math.abs((q % N) - x) <= 1) { seen[q] = 1; stack.push(q); } }); }
      var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, score = cnt - Math.hypot(cx - N / 2, cy - N * 0.45) * 6;
      if (cnt > N * N * 0.03 && cnt < N * N * 0.6 && (!best || score > best.score)) best = { score: score, minx: minx, maxx: maxx, miny: miny, maxy: maxy };
    }
    if (!best) return null;
    var w = (best.maxx - best.minx + 1) / N, h = (best.maxy - best.miny + 1) / N;
    if (h > w * 1.45) h = w * 1.45;
    return { x: (best.minx + best.maxx + 1) / 2 / N, y: best.miny / N + h / 2, w: w * 1.05, h: h * 1.05, roll: 0 };
  }
  function setFace(f) {
    var k = 0.4, F = fx.face; F.found = !!f;
    if (!f) return;
    F.x += (f.x - F.x) * k; F.y += (f.y - F.y) * k; F.w += (f.w - F.w) * k; F.h += (f.h - F.h) * k; F.roll += ((f.roll || 0) - F.roll) * k;
  }
  function detect() {
    if (busy || !fx.id || BY[fx.id].screen || !cam.stream || !vid.videoWidth) return;
    busy = true; sx.clearRect(0, 0, 72, 72); _ds(sx, 72);
    if (fd) {
      fd.detect(small).then(function (r) {
        if (r && r[0]) { var b = r[0].boundingBox, roll = 0, L = r[0].landmarks || [], eyes = L.filter(function (l) { return l.type === "eye"; });
          if (eyes.length === 2) roll = Math.atan2(eyes[1].locations[0].y - eyes[0].locations[0].y, eyes[1].locations[0].x - eyes[0].locations[0].x);
          setFace({ x: (b.x + b.width / 2) / 72, y: (b.y + b.height / 2) / 72, w: b.width / 72 * 1.05, h: b.height / 72 * 1.1, roll: roll }); }
        else setFace(null);
      }).catch(function () { fd = null; }).then(function () { busy = false; });
    } else { try { setFace(skinBlob()); } catch (e) { /* bỏ qua */ } busy = false; }
  }

  /* ------------------------------------------------ vẽ lớp phủ */
  function drawFx(ctx, S) {
    if (!fx.id) return;
    var it = BY[fx.id], t = (performance.now() - fx.t0) / 1000;
    ctx.save();
    if (it.screen) { slime(ctx, S, t); ctx.restore(); return; }
    var F0 = fx.face, a = fx.adj, w = F0.w * a.s * S, h = F0.h * a.s * S;
    ctx.translate((F0.x + a.dx) * S, (F0.y + a.dy) * S); ctx.rotate(F0.roll || 0);
    var F = { w: w, h: h, top: -h / 2, eyeY: -h * 0.12, mouthY: h * 0.27, chin: h / 2 };
    it.draw(ctx, F, t); ctx.restore();
  }
  drawSquare = function (ctx, size) { var ok = _ds(ctx, size); if (ok && fx.id) drawFx(ctx, size); return ok; };

  /* ------------------------------------------------ canvas xem trước */
  var cv = document.createElement("canvas"); cv.className = "fx-canvas"; cv.width = cv.height = 540; vfEl.appendChild(cv);
  var cx2 = cv.getContext("2d"), raf = 0;
  function loop(ts) {
    raf = 0; if (!fx.id) { cx2.clearRect(0, 0, 540, 540); return; }
    if (S.page === "camera" && !document.hidden) {
      if (ts - fx.last > 90) { fx.last = ts; detect(); }
      cx2.clearRect(0, 0, 540, 540); drawFx(cx2, 540);
    }
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  /* kéo để chỉnh vị trí, chụm để đổi cỡ */
  var ptr = new Map(), start = null;
  cv.addEventListener("pointerdown", function (e) { if (!fx.id || BY[fx.id].screen) return; e.stopPropagation(); cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, e); start = { dx: fx.adj.dx, dy: fx.adj.dy, s: fx.adj.s, x: e.clientX, y: e.clientY, d: 0 };
    if (ptr.size === 2) { var p = Array.from(ptr.values()); start.d = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY); } });
  cv.addEventListener("pointermove", function (e) { if (!ptr.has(e.pointerId) || !start) return; e.stopPropagation(); ptr.set(e.pointerId, e); var r = cv.getBoundingClientRect();
    if (ptr.size >= 2 && start.d) { var p = Array.from(ptr.values()); fx.adj.s = Math.max(0.5, Math.min(2.2, start.s * Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY) / start.d)); }
    else { fx.adj.dx = start.dx + (e.clientX - start.x) / r.width; fx.adj.dy = start.dy + (e.clientY - start.y) / r.height; } });
  function up(e) { ptr.delete(e.pointerId); if (ptr.size < 2 && start) { start.d = 0; if (ptr.size === 1) { var p = Array.from(ptr.values())[0]; start.dx = fx.adj.dx; start.dy = fx.adj.dy; start.x = p.clientX; start.y = p.clientY; } } if (!ptr.size) start = null; }
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  /* ------------------------------------------------ giao diện: nút, dải gần đây, bảng chọn */
  function thumb(id) {
    var c = document.createElement("canvas"); c.width = c.height = 96; var x = c.getContext("2d"), it = BY[id];
    var tmp = document.createElement("canvas"); tmp.width = tmp.height = 96; var tx = tmp.getContext("2d");
    if (it.screen) { tx.save(); tx.beginPath(); tx.arc(48, 48, 40, 0, TAU); tx.clip(); tx.fillStyle = "#2b3a1a"; tx.fillRect(0, 0, 96, 96); slime(tx, 96, 5); tx.restore(); }
    else { tx.translate(48, 56); var F = { w: 56, h: 66, top: -33, eyeY: -8, mouthY: 18, chin: 33 }; it.draw(tx, F, 1); }
    [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.5, -1.5], [1.5, 1.5], [-1.5, 1.5], [1.5, -1.5]].forEach(function (o) { x.shadowColor = "#fff"; x.shadowBlur = 0; x.shadowOffsetX = o[0] + 200; x.shadowOffsetY = o[1]; x.drawImage(tmp, -200, 0); });
    x.shadowColor = "transparent"; x.drawImage(tmp, 0, 0); return c;
  }
  var recent = []; try { recent = JSON.parse(localStorage.getItem("lc_fxr") || "[]").filter(function (i) { return BY[i]; }); } catch (e) { recent = []; }
  var strip = el("div", { class: "fx-strip" }); vfEl.appendChild(strip);
  var hint = el("div", { class: "fx-hint hidden" }, "Kéo để chỉnh vị trí, chụm hai ngón để đổi cỡ"); vfEl.appendChild(hint);
  function paint() {
    var open = el("button", { class: "fx-open", type: "button", "aria-label": "Filter Locket" }, icon("sparkle")); open.addEventListener("click", openSheet);
    var items = [open];
    recent.slice(0, 4).forEach(function (id) { var b = el("button", { class: "fx-mini" + (fx.id === id ? " on" : ""), type: "button", "aria-label": BY[id].name }, thumb(id)); b.addEventListener("click", function () { choose(fx.id === id ? null : id); }); items.push(b); });
    if (fx.id) { var x = el("button", { class: "fx-x", type: "button", "aria-label": "Tắt filter" }, "✕"); x.addEventListener("click", function () { choose(null); }); items.push(x); }
    strip.replaceChildren.apply(strip, items);
  }
  function choose(id) {
    fx.id = id; fx.t0 = performance.now(); fx.adj = { dx: 0, dy: 0, s: 1 };
    if (id) { recent = [id].concat(recent.filter(function (r) { return r !== id; })).slice(0, 6); try { localStorage.setItem("lc_fxr", JSON.stringify(recent)); } catch (e) { /* bỏ qua */ } }
    cv.style.pointerEvents = id && !BY[id].screen ? "auto" : "none";
    hint.classList.toggle("hidden", !id || BY[id].screen);
    if (id && !BY[id].screen) setTimeout(function () { hint.classList.add("hidden"); }, 3500);
    paint(); kick();
  }
  function openSheet() {
    var kids = [el("h3", { class: "fx-title" }, "Filter Locket")];
    LIST.forEach(function (g) {
      var row = el("div", { class: "fx-row" });
      g[1].forEach(function (it) { var b = el("button", { class: "fx-it" + (fx.id === it[0] ? " on" : ""), type: "button" }, thumb(it[0]), el("span", {}, it[1]));
        b.addEventListener("click", function () { sh.close(); choose(it[0]); }); row.appendChild(b); });
      kids.push(el("div", { class: "fx-cat" }, g[0]), row);
    });
    var sh = bottomSheet.apply(null, kids); sh.sheet.classList.add("fx-sheet");
  }
  paint();
  window.lcFx = { choose: choose, get id() { return fx.id; }, list: LIST, setFace: function (f) { Object.assign(fx.face, f); } };
})();
