"use strict";
/* booth.js - tiếng chụp, photobooth (Polaroid / 4-Cuts / Duo 35mm), tin nhắn mới */
(function () {
  /* ================= âm thanh ================= */
  var ac = null;
  function actx() {
    if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function sndOn() { try { return localStorage.getItem("lc_snd") !== "0"; } catch (e) { return true; } }
  function tone(f, t, d, v, type) {
    var a = ac; if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  var sfx = {
    shutter: function () {
      if (!sndOn() || !actx()) return;
      var t = ac.currentTime, len = Math.floor(ac.sampleRate * 0.09), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buf; f.type = "highpass"; f.frequency.value = 1800; g.gain.value = 0.7;
      s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t);
      tone(180, t, 0.05, 0.25, "square"); tone(90, t + 0.07, 0.07, 0.2, "square");
    },
    tick: function () { if (sndOn() && actx()) tone(880, ac.currentTime, 0.07, 0.18, "sine"); },
    pop: function () { if (sndOn() && actx()) { var t = ac.currentTime; tone(620, t, 0.08, 0.14); tone(880, t + 0.07, 0.1, 0.12); } },
    send: function () { if (sndOn() && actx()) { var t = ac.currentTime; tone(520, t, 0.06, 0.1); tone(780, t + 0.05, 0.08, 0.1); } }
  };
  window.lcSfx = sfx;
  document.addEventListener("pointerdown", function () { if (sndOn()) actx(); }, { passive: true });

  var flash = document.getElementById("flash");
  if (flash) new MutationObserver(function () { if (flash.classList.contains("go")) sfx.shutter(); }).observe(flash, { attributes: true, attributeFilter: ["class"] });
  var cd = document.getElementById("countdown");
  if (cd) new MutationObserver(function () { if (cd.firstChild) sfx.tick(); }).observe(cd, { childList: true });

  /* ================= photobooth ================= */
  var FRAMES = [
    { id: "cream", n: "Kem cổ điển", bg: "#fbf7ee", ink: "#3a2f22", dot: "#fbf7ee" },
    { id: "black", n: "Đen matte", bg: "#131211", ink: "#f0dfb8", dot: "#131211" },
    { id: "pink", n: "Hồng pastel", bg: "#fde4ea", ink: "#7a3447", dot: "#fde4ea" },
    { id: "denim", n: "Xanh denim", bg: "#dce7ef", ink: "#2a4660", dot: "#dce7ef" }
  ];
  var FILMS = [
    { id: "none", n: "Gốc", css: "none" },
    { id: "gold", n: "Kodak Gold", css: "sepia(.25) saturate(1.35) contrast(1.05) brightness(1.04) hue-rotate(-6deg)" },
    { id: "fuji", n: "Fuji", css: "saturate(1.15) contrast(1.08) hue-rotate(8deg) brightness(1.02)" },
    { id: "mono", n: "Đen trắng", css: "grayscale(1) contrast(1.15)" },
    { id: "cool", n: "Mát", css: "saturate(.9) hue-rotate(18deg) contrast(1.05)" },
    { id: "sun", n: "Hoàng hôn", css: "sepia(.4) saturate(1.5) brightness(1.05)" }
  ];
  var MODES = [["single", "Ảnh"], ["polaroid", "Polaroid"], ["cuts", "4-Cuts"], ["duo", "Duo"]];
  var B = { mode: "single", frame: "cream", film: "none", led: true, grain: true, busy: false, open: false };
  try { var sv = JSON.parse(localStorage.getItem("lc_booth") || "{}"); ["frame", "film", "led", "grain"].forEach(function (k) { if (sv[k] !== undefined) B[k] = sv[k]; }); } catch (e) { /* bỏ qua */ }
  function saveB() { try { localStorage.setItem("lc_booth", JSON.stringify({ frame: B.frame, film: B.film, led: B.led, grain: B.grain })); } catch (e) { /* bỏ qua */ } }
  function pick(list, id) { return list.filter(function (x) { return x.id === id; })[0] || list[0]; }

  var modeBar = el("div", { class: "booth-modes", id: "booth-modes" });
  var opts = el("div", { class: "booth-opts hidden", id: "booth-opts" });
  var prog = el("div", { class: "booth-prog hidden" });
  var camPage = document.getElementById("page-camera");
  function layout() {
    if (!camPage) return;
    camPage.classList.toggle("booth-on", B.mode !== "single");
    camPage.classList.toggle("booth-open", B.mode !== "single" && B.open);
  }
  function renderModes() {
    var kids = MODES.map(function (m) {
      return el("button", { class: "chip" + (B.mode === m[0] ? " on" : ""), type: "button", onclick: function () { B.mode = m[0]; if (m[0] === "single") B.open = false; renderModes(); renderOpts(); } }, m[1]);
    });
    if (B.mode !== "single") kids.push(el("button", { class: "chip" + (B.open ? " on" : ""), type: "button", onclick: function () { B.open = !B.open; renderModes(); renderOpts(); } }, "Tuỳ chỉnh"));
    modeBar.replaceChildren.apply(modeBar, kids);
  }
  function row(label, nodes) { return el("div", { class: "bo-row" }, el("span", { class: "bo-l" }, label), el("div", { class: "bo-items" }, ...nodes)); }
  function renderOpts() {
    opts.classList.toggle("hidden", B.mode === "single" || !B.open); layout();
    var soundBtn = el("button", { class: "chip" + (sndOn() ? " on" : ""), type: "button", onclick: function () { try { localStorage.setItem("lc_snd", sndOn() ? "0" : "1"); } catch (e) { /* bỏ qua */ } renderOpts(); } }, sndOn() ? "Tiếng: Bật" : "Tiếng: Tắt");
    opts.replaceChildren(
      row("Khung", FRAMES.map(function (f) { return el("button", { class: "dotbtn" + (B.frame === f.id ? " on" : ""), type: "button", "aria-label": f.n, title: f.n, style: { background: f.dot }, onclick: function () { B.frame = f.id; saveB(); renderOpts(); } }); })),
      row("Màu phim", FILMS.map(function (f) { return el("button", { class: "chip" + (B.film === f.id ? " on" : ""), type: "button", onclick: function () { B.film = f.id; saveB(); renderOpts(); } }, f.n); })),
      row("Hiệu ứng", [
        el("button", { class: "chip" + (B.led ? " on" : ""), type: "button", onclick: function () { B.led = !B.led; saveB(); renderOpts(); } }, "Ngày LED"),
        el("button", { class: "chip" + (B.grain ? " on" : ""), type: "button", onclick: function () { B.grain = !B.grain; saveB(); renderOpts(); } }, "Hạt phim"),
        soundBtn]));
  }
  var strip = document.getElementById("filter-strip");
  if (strip && strip.parentNode) { strip.parentNode.insertBefore(modeBar, strip.nextSibling); strip.parentNode.insertBefore(opts, modeBar.nextSibling); }
  var vfEl = document.getElementById("viewfinder");
  if (vfEl) vfEl.appendChild(prog);
  renderModes(); renderOpts();
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function cover(g, img, x, y, w, h, r, film) {
    var s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
    g.save(); rr(g, x, y, w, h, r); g.clip();
    if (film !== "none") g.filter = film;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
    g.restore();
  }
  function led(g, text, x, y, size) {
    g.save(); g.font = "bold " + size + "px 'Courier New', monospace"; g.textAlign = "right"; g.textBaseline = "alphabetic";
    g.shadowColor = "#ff7a00"; g.shadowBlur = size * 0.4; g.fillStyle = "#ffa133"; g.fillText(text, x, y); g.restore();
  }
  function grain(g, W, H) {
    var t = document.createElement("canvas"); t.width = t.height = 128;
    var tg = t.getContext("2d"), id = tg.createImageData(128, 128);
    for (var i = 0; i < id.data.length; i += 4) { var v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    tg.putImageData(id, 0, 0);
    g.save(); g.globalAlpha = 0.09; g.globalCompositeOperation = "overlay"; g.fillStyle = g.createPattern(t, "repeat"); g.fillRect(0, 0, W, H); g.restore();
  }
  function dateParts() { var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); }; return { led: "'" + p(d.getFullYear() % 100) + " " + p(d.getMonth() + 1) + " " + p(d.getDate()), full: p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() }; }

  async function compose(blobs) {
    var imgs = await Promise.all(blobs.map(function (b) { return createImageBitmap(b); }));
    var W = 1080, c = document.createElement("canvas"); c.width = c.height = W;
    var g = c.getContext("2d"), fr = pick(FRAMES, B.frame), film = pick(FILMS, B.film).css, dp = dateParts();
    g.textBaseline = "alphabetic";
    if (B.mode === "polaroid") {
      g.fillStyle = fr.bg; g.fillRect(0, 0, W, W);
      cover(g, imgs[0], 70, 70, 940, 800, 10, film);
      if (B.led) led(g, dp.led, 985, 845, 40);
      g.fillStyle = fr.ink; g.textAlign = "left"; g.font = "italic 600 54px Georgia, serif"; g.fillText("Kỷ niệm", 76, 960);
      g.textAlign = "right"; g.font = "600 30px 'Courier New', monospace"; g.globalAlpha = 0.7; g.fillText(dp.full, 1004, 960); g.globalAlpha = 1;
    } else if (B.mode === "cuts") {
      g.fillStyle = fr.bg; g.fillRect(0, 0, W, W);
      var m = 44, gap = 22, top = 96, bot = 86, pw = (W - 2 * m - gap) / 2, ph = (W - top - bot - gap) / 2;
      g.fillStyle = fr.ink; g.textAlign = "center"; g.font = "800 40px system-ui, sans-serif"; g.fillText("LIFE  4  CUTS", W / 2, 62);
      g.font = "600 20px 'Courier New', monospace"; g.globalAlpha = 0.65; g.fillText("PHOTO BOOTH · " + dp.full, W / 2, 86); g.globalAlpha = 1;
      for (var i = 0; i < 4; i++) cover(g, imgs[i], m + (i % 2) * (pw + gap), top + Math.floor(i / 2) * (ph + gap), pw, ph, 14, film);
      if (B.led) led(g, dp.led, W - m - 16, top + 2 * ph + gap - 18, 34);
      g.fillStyle = fr.ink; g.globalAlpha = 0.8;
      for (var k = 0; k < 22; k++) g.fillRect(260 + k * 26, W - 64, k % 3 ? 7 : 12, 26);
      g.globalAlpha = 0.6; g.font = "700 18px 'Courier New', monospace"; g.fillText("LOCKCOC POCKET", W / 2, W - 22); g.globalAlpha = 1;
    } else {
      g.fillStyle = "#14110d"; g.fillRect(0, 0, W, W);
      g.fillStyle = "#3a332a";
      for (var s = 0; s < 18; s++) { rr(g, 30 + s * 58, 42, 30, 22, 5); g.fill(); rr(g, 30 + s * 58, W - 64, 30, 22, 5); g.fill(); }
      g.fillStyle = "#f2a93b"; g.textAlign = "left"; g.font = "700 30px 'Courier New', monospace"; g.fillText("35MM  ·  " + dp.full, 60, 150);
      var dw = 470, dh = 690;
      cover(g, imgs[0], 60, 190, dw, dh, 6, film); cover(g, imgs[1], 60 + dw + 20, 190, dw, dh, 6, film);
      g.fillStyle = "#f2a93b"; g.font = "700 26px 'Courier New', monospace"; g.fillText("▶ 24     ▶ 25", 60, 950);
      if (B.led) led(g, dp.led, W - 70, 905, 36);
    }
    if (B.grain) grain(g, W, W);
    return new Promise(function (res) { c.toBlob(function (b) { res(b); }, "image/jpeg", 0.92); });
  }

  async function booth() {
    if (B.busy) return;
    if (!cam.stream) { toast("Camera chưa bật.", "error"); return camStart(); }
    B.busy = true;
    var n = { polaroid: 1, cuts: 4, duo: 2 }[B.mode], shots = [];
    try {
      for (var i = 0; i < n; i++) {
        prog.textContent = n > 1 ? "Tấm " + (i + 1) + "/" + n : "Chuẩn bị…"; prog.classList.remove("hidden");
        if (!(await runCountdown(i === 0 ? 3 : 2))) return;
        if (!(await waitVideoReady())) return toast("Camera chưa sẵn sàng, thử lại nhé.", "error");
        var f = document.getElementById("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); haptic(18);
        var b = await grabPhoto();
        if (!b) return toast("Không chụp được ảnh, thử lại.", "error");
        shots.push(b); await sleep(500);
      }
      prog.textContent = "Đang ghép ảnh…";
      var out = await compose(shots);
      if (!out) return toast("Không ghép được ảnh.", "error");
      openEditor({ kind: "photo", image: out });
    } catch (e) { toast("Lỗi photobooth: " + (e && e.message ? e.message : "không rõ"), "error"); }
    finally { B.busy = false; prog.classList.add("hidden"); }
  }
  var sr = document.querySelector(".shutter-row");
  if (sr) sr.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest("#shutter")) return;
    if (B.busy) { e.stopImmediatePropagation(); e.preventDefault(); cancelCountdown(); return; }
    if (B.mode !== "single") { e.stopImmediatePropagation(); e.preventDefault(); booth(); }
  }, true);
})();
