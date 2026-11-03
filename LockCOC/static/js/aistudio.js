"use strict";
/* aistudio.js - LockCOC AI: làm nét/cân màu tự động, ghép ảnh widget, tạo ảnh bằng AI (trong màn Soạn khoảnh khắc) */
(function () {
  if (typeof openEditor !== "function" || typeof openStudio !== "function" || typeof bottomSheet !== "function" || typeof el !== "function") return;
  var MAXS = 1600;
  function toBlob(c, q) { return new Promise(function (r) { c.toBlob(r, "image/jpeg", q || 0.93); }); }
  async function bmp(b) { try { return await createImageBitmap(b, { imageOrientation: "from-image" }); } catch (e) { return await createImageBitmap(b); } }
  function boxBlur(src, w, h, r) { // blur hộp tách trục, 3 kênh RGB trong Uint8ClampedArray RGBA
    var tmp = new Float32Array(src.length), out = new Uint8ClampedArray(src.length), x, y, c, i, acc, n = 2 * r + 1;
    for (y = 0; y < h; y++) for (c = 0; c < 3; c++) { acc = 0; for (x = -r; x <= r; x++) acc += src[(y * w + Math.min(w - 1, Math.max(0, x))) * 4 + c];
      for (x = 0; x < w; x++) { tmp[(y * w + x) * 4 + c] = acc / n; acc += src[(y * w + Math.min(w - 1, x + r + 1)) * 4 + c] - src[(y * w + Math.max(0, x - r)) * 4 + c]; } }
    for (x = 0; x < w; x++) for (c = 0; c < 3; c++) { acc = 0; for (y = -r; y <= r; y++) acc += tmp[(Math.min(h - 1, Math.max(0, y)) * w + x) * 4 + c];
      for (y = 0; y < h; y++) { out[(y * w + x) * 4 + c] = acc / n; acc += tmp[(Math.min(h - 1, y + r + 1) * w + x) * 4 + c] - tmp[(Math.max(0, y - r) * w + x) * 4 + c]; } }
    return out;
  }
  /* làm nét: (1) phóng nếu ảnh nhỏ (2) kéo giãn mức sáng tự động (3) tăng nhẹ độ rực (4) unsharp mask */
  async function enhance(blob, level) {
    var b = await bmp(blob), sc = Math.min(2, Math.max(1, 1080 / Math.max(b.width, b.height)));
    var w = Math.round(b.width * sc), h = Math.round(b.height * sc), m = Math.max(w, h); if (m > MAXS) { w = Math.round(w * MAXS / m); h = Math.round(h * MAXS / m); }
    var cv = document.createElement("canvas"); cv.width = w; cv.height = h; var c = cv.getContext("2d", { willReadFrequently: true });
    c.imageSmoothingQuality = "high"; c.drawImage(b, 0, 0, w, h);
    var id = c.getImageData(0, 0, w, h), d = id.data, N = w * h, i, hist = new Uint32Array(256);
    for (i = 0; i < N; i++) hist[(d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0]++;
    var lo = 0, hi = 255, acc = 0; for (i = 0; i < 256; i++) { acc += hist[i]; if (acc > N * 0.004) { lo = i; break; } }
    acc = 0; for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc > N * 0.004) { hi = i; break; } }
    var k = hi - lo > 40 ? 255 / (hi - lo) : 1, mix = [0.35, 0.6, 0.85][level - 1], sat = [1.05, 1.1, 1.16][level - 1], amt = [0.7, 1.1, 1.6][level - 1];
    for (i = 0; i < N; i++) { var o = i * 4, r = d[o], g = d[o + 1], bl = d[o + 2];
      var nr = (r - lo) * k, ng = (g - lo) * k, nb = (bl - lo) * k; r += (nr - r) * mix; g += (ng - g) * mix; bl += (nb - bl) * mix;
      var l = r * 0.299 + g * 0.587 + bl * 0.114; d[o] = l + (r - l) * sat; d[o + 1] = l + (g - l) * sat; d[o + 2] = l + (bl - l) * sat; }
    var rad = Math.max(1, Math.round(Math.max(w, h) / 900)), bl1 = boxBlur(d, w, h, rad), bl2 = boxBlur(bl1, w, h, rad);
    for (i = 0; i < N; i++) { var p = i * 4; for (var ch = 0; ch < 3; ch++) { var df = d[p + ch] - bl2[p + ch]; if (df > 3 || df < -3) d[p + ch] = d[p + ch] + df * amt; } }
    c.putImageData(id, 0, 0); return toBlob(cv, 0.93);
  }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  var LAYOUTS = {
    two_v: { n: 2, name: "2 cột", cells: [[0, 0, .5, 1], [.5, 0, .5, 1]] },
    two_h: { n: 2, name: "2 hàng", cells: [[0, 0, 1, .5], [0, .5, 1, .5]] },
    three: { n: 3, name: "1 lớn + 2", cells: [[0, 0, .6, 1], [.6, 0, .4, .5], [.6, .5, .4, .5]] },
    three_r: { n: 3, name: "3 hàng", cells: [[0, 0, 1, 1 / 3], [0, 1 / 3, 1, 1 / 3], [0, 2 / 3, 1, 1 / 3]] },
    four: { n: 4, name: "Lưới 4", cells: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]] }
  };
  async function collage(blobs, key, bg, gap) {
    var L = LAYOUTS[key], S = 1080, cv = document.createElement("canvas"); cv.width = cv.height = S; var c = cv.getContext("2d");
    c.fillStyle = bg; c.fillRect(0, 0, S, S); var g = gap * S, pad = g;
    for (var i = 0; i < L.cells.length; i++) {
      var cell = L.cells[i], b = blobs[i % blobs.length], im = await bmp(b);
      var x = pad + cell[0] * (S - 2 * pad), y = pad + cell[1] * (S - 2 * pad), w = cell[2] * (S - 2 * pad), h = cell[3] * (S - 2 * pad);
      x += g / 2 * (cell[0] > 0 ? 1 : 0); y += g / 2 * (cell[1] > 0 ? 1 : 0);
      w -= g / 2 * ((cell[0] > 0 ? 1 : 0) + (cell[0] + cell[2] < 0.999 ? 1 : 0)); h -= g / 2 * ((cell[1] > 0 ? 1 : 0) + (cell[1] + cell[3] < 0.999 ? 1 : 0));
      var sc = Math.max(w / im.width, h / im.height), sw = w / sc, sh = h / sc;
      c.save(); rrect(c, x, y, w, h, S * 0.025); c.clip(); c.imageSmoothingQuality = "high"; c.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h); c.restore();
    }
    return toBlob(cv, 0.93);
  }
  function pickFiles(multi) { return new Promise(function (res) {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = !!multi; inp.style.display = "none"; document.body.appendChild(inp);
    inp.onchange = function () { var f = Array.prototype.slice.call(inp.files || []); inp.remove(); res(f); }; inp.click(); }); }
  var STYLES = {
    gold: { n: "LockCOC Gold", p: "luxury dark editorial style, deep black background with warm gold metallic accents, cinematic soft lighting, elegant minimal composition" },
    cine: { n: "Điện ảnh", p: "cinematic film still, teal and orange color grading, shallow depth of field, fine film grain, dramatic lighting" },
    toon: { n: "Hoạt hình", p: "soft stylized illustration, pastel colors, clean shapes, friendly mood" },
    none: { n: "Không", p: "" }
  };
  var TAIL = "square composition, high detail, no text, no watermark, no logo";
  function fullPrompt(t, st) { return [t, (STYLES[st] || STYLES.none).p, TAIL].filter(Boolean).join(", "); }
  function toJpeg(blob) { return bmp(blob).then(function (b) { var cv = document.createElement("canvas"); cv.width = b.width; cv.height = b.height; cv.getContext("2d").drawImage(b, 0, 0); return toBlob(cv, 0.93); }); }
  function pollinations(prompt) {
    var seed = Math.floor(Math.random() * 1e6), url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=1024&height=1024&nologo=true&seed=" + seed;
    return new Promise(function (res, rej) { var im = new Image(); im.crossOrigin = "anonymous"; var t = setTimeout(function () { rej(new Error("AI trả lời quá lâu, thử lại sau")); }, 70000);
      im.onload = function () { clearTimeout(t); try { var cv = document.createElement("canvas"); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext("2d").drawImage(im, 0, 0); cv.toBlob(function (b) { b ? res(b) : rej(new Error("Không đọc được ảnh AI")); }, "image/jpeg", 0.93); } catch (e) { rej(new Error("Không đọc được ảnh AI")); } };
      im.onerror = function () { clearTimeout(t); rej(new Error("Không tạo được ảnh AI, thử lại sau")); }; im.src = url; });
  }
  async function aiImage(text, st) {
    var prompt = fullPrompt(text, st), info = null;
    try { info = await api("/api/ai-image/status"); } catch (e) { info = null; }
    if (info && info.key) {
      var r = await api("/api/ai-image", { method: "POST", json: { prompt: prompt } });
      if (r && r.image_b64) { var bin = atob(r.image_b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return await toJpeg(new Blob([u8], { type: r.mime || "image/png" })); }
    }
    return await pollinations(prompt);
  }

  function openAI(ed) {
    var orig = ed._aiOrig || (ed._aiOrig = ed.image), status = el("small", { class: "ai-st" }, "Chọn một công cụ bên dưới.");
    var sh;
    function apply(b, msg) { ed.image = b; if (ed._rm) ed._rm(); status.textContent = msg; toast(msg, "ok"); }
    async function run(btn, fn) { if (btn.disabled) return; btn.disabled = true; btn.classList.add("loading"); status.textContent = "Đang xử lý…"; try { await fn(); } catch (e) { status.textContent = e.message || "Lỗi"; toast(e.message || "Lỗi", "error"); } finally { btn.disabled = false; btn.classList.remove("loading"); } }
    var enh = [1, 2, 3].map(function (lv) { var bt = el("button", { class: "chip ai-chip" }, ["Nhẹ", "Vừa", "Mạnh"][lv - 1]); bt.onclick = function () { run(bt, async function () { apply(await enhance(ed.image === orig ? orig : ed.image, lv), "Đã làm nét (" + ["nhẹ", "vừa", "mạnh"][lv - 1] + ")"); }); }; return bt; });
    var undo = el("button", { class: "chip ai-chip" }, "↩ Ảnh gốc"); undo.onclick = function () { apply(orig, "Đã trở về ảnh gốc"); };
    var lay = "two_v", bgc = "#0e0c09", layBtns = Object.keys(LAYOUTS).map(function (k) { var b = el("button", { class: "chip ai-chip" + (k === lay ? " on" : "") }, LAYOUTS[k].name); b.dataset.k = k;
      b.onclick = function () { lay = k; layBtns.forEach(function (x) { x.classList.toggle("on", x.dataset.k === k); }); }; return b; });
    var bgBtns = [["#0e0c09", "Tối"], ["#ffffff", "Trắng"], ["#e2b04a", "Vàng"]].map(function (p) { var b = el("button", { class: "chip ai-chip" + (p[0] === bgc ? " on" : "") }, p[1]); b.dataset.c = p[0];
      b.onclick = function () { bgc = p[0]; bgBtns.forEach(function (x) { x.classList.toggle("on", x.dataset.c === p[0]); }); }; return b; });
    var mk = el("button", { class: "btn small primary block" }, el("span", { class: "btn-label" }, "Chọn ảnh & ghép"));
    mk.onclick = function () { run(mk, async function () {
      var need = LAYOUTS[lay].n, files = await pickFiles(true); if (!files.length) { status.textContent = "Chưa chọn ảnh nào."; return; }
      var list = [orig].concat(files).slice(0, need); if (list.length < need) list = list.concat(files).slice(0, need); if (list.length < need) list = Array.from({ length: need }, function (_, i) { return list[i % list.length]; });
      apply(await collage(list, lay, bgc, 0.018), "Đã ghép " + need + " ảnh (ảnh hiện tại là ảnh đầu)"); }); };
    var st = "gold", stBtns = Object.keys(STYLES).map(function (k) { var b = el("button", { class: "chip ai-chip" + (k === st ? " on" : "") }, STYLES[k].n); b.dataset.k = k;
      b.onclick = function () { st = k; stBtns.forEach(function (x) { x.classList.toggle("on", x.dataset.k === k); }); }; return b; });
    var pr = el("input", { type: "text", class: "ai-in", placeholder: "Mô tả ảnh muốn tạo, vd: hoàng hôn trên biển, phong cách hoạt hình", maxlength: "200" });
    var gen = el("button", { class: "btn small primary block" }, el("span", { class: "btn-label" }, "✨ Tạo ảnh AI"));
    gen.onclick = function () { run(gen, async function () { var t = pr.value.trim(); if (t.length < 3) throw new Error("Hãy mô tả ảnh muốn tạo"); apply(await aiImage(t, st), "Đã tạo ảnh AI, ảnh này thay ảnh hiện tại"); }); };
    sh = bottomSheet(el("h3", { style: { margin: "0 0 4px" } }, "✨ LockCOC AI"), status,
      el("div", { class: "ai-sec" }, el("b", {}, "Làm nét & cân màu tự động"), el("div", { class: "hrow" }, ...enh, undo)),
      el("div", { class: "ai-sec" }, el("b", {}, "Ghép ảnh"), el("div", { class: "hrow" }, ...layBtns), el("div", { class: "hrow" }, el("small", {}, "Nền:"), ...bgBtns), mk),
      el("div", { class: "ai-sec" }, el("b", {}, "Tạo ảnh bằng AI"), el("div", { class: "hrow" }, el("small", {}, "Phong cách:"), ...stBtns), pr, gen, el("small", { class: "ai-note" }, "Mô tả của bạn được gửi tới dịch vụ tạo ảnh AI. Có thể mất 10 đến 40 giây.")),
      el("button", { class: "btn small block", onclick: function () { sh.close(); } }, el("span", { class: "btn-label" }, "Xong")));
  }

  var _oe = openEditor;
  openEditor = function (init) {
    var r = _oe.apply(this, arguments);
    try {
      if (init && init.kind === "video") return r;
      var ovs = document.querySelectorAll(".ov-body .studio-btn"), sb = ovs[ovs.length - 1]; if (!sb || sb.parentNode.querySelector(".ai-btn")) return r;
      var cap = null, _os = openStudio; openStudio = function (e) { cap = e; }; try { sb.click(); } finally { openStudio = _os; }
      if (!cap) return r;
      var ab = el("button", { class: "studio-btn glass ai-btn", onclick: function () { openAI(cap); } }, "✨ ", "LockCOC AI · làm nét · ghép ảnh");
      sb.parentNode.insertBefore(ab, sb.nextSibling);
    } catch (e) { /* bỏ qua */ }
    return r;
  };
})();
