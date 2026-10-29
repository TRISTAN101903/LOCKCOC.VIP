"use strict";
/* cam27.js - chế độ chụp mới: Đêm (chồng 8 khung giảm nhiễu), Liên tiếp (tự chọn ảnh nét nhất), Boomerang, đèn pin, lưới + thước cân bằng */
(function () {
  var vfEl = document.getElementById("viewfinder"), row = document.querySelector(".shutter-row");
  if (!vfEl || !row || typeof takePhoto !== "function") return;
  var MODES = [["photo", "Ảnh"], ["night", "Đêm"], ["burst", "Liên tiếp"], ["boom", "Boomerang"]];
  var HINTS = { photo: HINT, night: "Chế độ Đêm: chạm rồi giữ yên máy khoảng 1 giây", burst: "Liên tiếp: chụp 8 tấm, tự chọn tấm nét nhất", boom: "Boomerang: chạm để quay 1 giây tới lui" };
  var mode = "photo";
  try { var sm = localStorage.getItem("lc_cmode"); if (sm && HINTS[sm]) mode = sm; } catch (e) { /* bỏ qua */ }

  /* ---- hàng chế độ + công cụ ---- */
  var tools = el("div", { class: "cam-modes", role: "tablist" });
  var pills = {};
  MODES.forEach(function (m) {
    var b = el("button", { class: "mode-pill", type: "button", role: "tab" }, m[1]);
    b.addEventListener("click", function () { setMode(m[0]); }); pills[m[0]] = b; tools.appendChild(b);
  });
  var gridBtn = el("button", { class: "mode-pill tool", type: "button" }, "Lưới");
  var torchBtn = el("button", { class: "mode-pill tool hidden", type: "button" }, "Đèn");
  tools.append(el("i", { class: "sep" }), gridBtn, torchBtn);
  row.parentNode.insertBefore(tools, row);
  function setMode(m) {
    mode = m; try { localStorage.setItem("lc_cmode", m); } catch (e) { /* bỏ qua */ }
    Object.keys(pills).forEach(function (k) { pills[k].classList.toggle("on", k === m); pills[k].setAttribute("aria-selected", k === m); });
    var h = document.getElementById("cam-hint"); if (h && !rec.active) h.textContent = HINTS[m];
  }
  setMode(mode);
  var _hint = HINT;
  new MutationObserver(function () { var h = document.getElementById("cam-hint"); if (h && !rec.active && h.textContent === _hint && mode !== "photo") h.textContent = HINTS[mode]; })
    .observe(document.getElementById("cam-hint"), { childList: true, characterData: true, subtree: true });

  /* ---- nhãn dưới các nút tròn ---- */
  var labs = el("div", { class: "sr-labels", "aria-hidden": "true" }, el("span", {}, "Thư viện"), el("span", {}, "Bộ lọc"), el("span", {}), el("span", {}, "Quay video"), el("span", {}, "Đổi camera"));
  row.parentNode.insertBefore(labs, row.nextSibling);

  /* ---- lưới + thước cân bằng ---- */
  var gridEl = el("div", { class: "cam-grid hidden" }, el("i"), el("i"), el("i"), el("i"), el("b", { class: "lvl" }));
  vfEl.appendChild(gridEl);
  var lvl = gridEl.querySelector(".lvl"), gridOn = false, oriH = null;
  try { gridOn = localStorage.getItem("lc_grid") === "1"; } catch (e) { /* bỏ qua */ }
  function gridApply() {
    gridEl.classList.toggle("hidden", !gridOn); gridBtn.classList.toggle("on", gridOn);
    if (gridOn && !oriH) {
      oriH = function (ev) {
        if (ev.gamma == null) return;
        var t = Math.max(-45, Math.min(45, ev.gamma));
        lvl.style.transform = "translateY(-50%) rotate(" + (-t).toFixed(1) + "deg)"; lvl.classList.toggle("ok", Math.abs(t) < 1.8);
      };
      window.addEventListener("deviceorientation", oriH);
    } else if (!gridOn && oriH) { window.removeEventListener("deviceorientation", oriH); oriH = null; }
  }
  gridBtn.addEventListener("click", function () { gridOn = !gridOn; try { localStorage.setItem("lc_grid", gridOn ? "1" : "0"); } catch (e) { /* bỏ qua */ } gridApply(); });
  gridApply();

  /* ---- đèn pin ---- */
  var torchOn = false, lastStream = null;
  function track() { return cam.stream && cam.stream.getVideoTracks()[0]; }
  function torchCheck() {
    if (cam.stream === lastStream) return; lastStream = cam.stream; torchOn = false; torchBtn.classList.remove("on");
    var t = track(), ok = false;
    try { ok = !!(t && t.getCapabilities && t.getCapabilities().torch); } catch (e) { /* bỏ qua */ }
    torchBtn.classList.toggle("hidden", !ok);
  }
  setInterval(torchCheck, 1000);
  torchBtn.addEventListener("click", function () {
    var t = track(); if (!t) return;
    t.applyConstraints({ advanced: [{ torch: !torchOn }] }).then(function () { torchOn = !torchOn; torchBtn.classList.toggle("on", torchOn); })
      .catch(function () { toast("Máy không bật được đèn pin.", "error"); });
  });

  /* ---- tiện ích ảnh ---- */
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function toBlob(c, q) { return new Promise(function (r) { c.toBlob(r, "image/jpeg", q || 0.92); }); }
  function frame(size) { var c = document.createElement("canvas"); c.width = c.height = size; return drawSquare(c.getContext("2d", { willReadFrequently: true }), size) ? c : null; }
  function flash() { var f = document.getElementById("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); haptic(18); }
  function progress(txt) { var h = document.getElementById("cam-hint"); if (h) h.textContent = txt; }
  function sharp(c) { /* phương sai Laplace trên ảnh 120px: càng cao càng nét */
    var s = 120, t = document.createElement("canvas"); t.width = t.height = s; var x = t.getContext("2d", { willReadFrequently: true }); x.drawImage(c, 0, 0, s, s);
    var d = x.getImageData(0, 0, s, s).data, g = new Float32Array(s * s), i, j, sum = 0, sq = 0, n = 0;
    for (i = 0; i < s * s; i++) g[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
    for (i = 1; i < s - 1; i++) for (j = 1; j < s - 1; j++) { var v = 4 * g[i * s + j] - g[i * s + j - 1] - g[i * s + j + 1] - g[(i - 1) * s + j] - g[(i + 1) * s + j]; sum += v; sq += v * v; n++; }
    return sq / n - (sum / n) * (sum / n);
  }

  /* ---- chế độ Đêm: lấy trung bình nhiều khung để giảm nhiễu, rồi nâng vùng tối ---- */
  async function night() {
    var N = 8, size = Math.min(1080, Math.floor(Math.min(vid.videoWidth, vid.videoHeight) / cam.zoom)) || 720, acc = null, i;
    flash(); haptic([10, 40, 10]);
    for (i = 0; i < N; i++) {
      progress("Giữ yên… " + (i + 1) + "/" + N);
      var c = frame(size); if (!c) throw new Error("Camera chưa sẵn sàng");
      var d = c.getContext("2d").getImageData(0, 0, size, size).data;
      if (!acc) acc = new Uint32Array(d.length);
      for (var k = 0; k < d.length; k++) acc[k] += d[k];
      await sleep(95);
    }
    var out = document.createElement("canvas"); out.width = out.height = size; var ox = out.getContext("2d"), im = ox.createImageData(size, size), o = im.data;
    var lut = new Uint8Array(256); for (i = 0; i < 256; i++) lut[i] = Math.min(255, Math.round(255 * Math.pow(i / 255, 0.78) * 1.04));
    for (var p = 0; p < o.length; p += 4) { o[p] = lut[Math.round(acc[p] / N)]; o[p + 1] = lut[Math.round(acc[p + 1] / N)]; o[p + 2] = lut[Math.round(acc[p + 2] / N)]; o[p + 3] = 255; }
    ox.putImageData(im, 0, 0);
    return toBlob(out, 0.93);
  }

  /* ---- Liên tiếp: chụp 8 tấm, chấm điểm độ nét, cho chọn ---- */
  async function burst() {
    var N = 8, size = Math.min(900, Math.floor(Math.min(vid.videoWidth, vid.videoHeight) / cam.zoom)) || 720, shots = [], i;
    for (i = 0; i < N; i++) {
      progress("Đang chụp " + (i + 1) + "/" + N);
      var c = frame(size); if (!c) throw new Error("Camera chưa sẵn sàng");
      shots.push({ c: c, s: sharp(c) }); if (i === 0) flash(); else haptic(6);
      await sleep(130);
    }
    var best = 0; shots.forEach(function (x, k) { if (x.s > shots[best].s) best = k; });
    return new Promise(function (resolve) {
      var ov = el("div", { class: "burst-ov" }), chosen = best, grid = el("div", { class: "burst-grid" });
      shots.forEach(function (x, k) {
        var t = el("button", { class: "burst-t" + (k === best ? " best" : ""), type: "button" }); x.c.className = "burst-c"; t.appendChild(x.c);
        if (k === best) t.appendChild(el("span", {}, "Nét nhất"));
        t.addEventListener("click", function () { chosen = k; Array.prototype.forEach.call(grid.children, function (n, j) { n.classList.toggle("sel", j === k); }); });
        grid.appendChild(t);
      });
      grid.children[best].classList.add("sel");
      var ok = el("button", { class: "btn primary", type: "button" }, "Dùng ảnh này"), no = el("button", { class: "btn", type: "button" }, "Bỏ");
      ok.addEventListener("click", function () { ov.remove(); toBlob(shots[chosen].c).then(resolve); });
      no.addEventListener("click", function () { ov.remove(); resolve(null); });
      ov.append(el("h3", {}, "Chọn tấm đẹp nhất"), el("p", { class: "fine" }, "Mình đã chọn sẵn tấm nét nhất. Chạm tấm khác nếu bạn thích."), grid, el("div", { class: "burst-act" }, no, ok));
      document.body.appendChild(ov);
    });
  }

  /* ---- Boomerang: 14 khung tới rồi lùi, lặp 2 vòng ---- */
  async function boom() {
    if (!window.MediaRecorder) throw new Error("Trình duyệt không quay được Boomerang");
    var N = 14, size = 540, fr = [], i;
    flash();
    for (i = 0; i < N; i++) { progress("Boomerang " + (i + 1) + "/" + N); var c = frame(size); if (!c) throw new Error("Camera chưa sẵn sàng"); fr.push(c); await sleep(70); }
    var seq = fr.concat(fr.slice(1, -1).reverse()), loop = seq.concat(seq);
    var cv = document.createElement("canvas"); cv.width = cv.height = size; var cx = cv.getContext("2d");
    cx.drawImage(fr[0], 0, 0);
    var mime = pickMime(), mr = new MediaRecorder(cv.captureStream(24), mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined), chunks = [];
    mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    var done = new Promise(function (r) { mr.onstop = r; }); mr.start();
    progress("Đang ghép Boomerang…");
    for (i = 0; i < loop.length; i++) { cx.drawImage(loop[i], 0, 0); await sleep(70); }
    mr.stop(); await done;
    var type = mr.mimeType || "video/webm", blob = new Blob(chunks, { type: type });
    return { image: await toBlob(fr[Math.floor(N / 2)]), video: blob, name: type.indexOf("mp4") >= 0 ? "boomerang.mp4" : "boomerang.webm" };
  }

  /* ---- móc vào nút chụp ---- */
  var _take = takePhoto;
  takePhoto = async function () {
    if (mode === "photo") return _take();
    if (shooting) return;
    if (!cam.stream) { toast("Camera chưa bật.", "error"); return camStart(); }
    shooting = true;
    try {
      if (cam.timer > 0 && !(await runCountdown(cam.timer))) return;
      if (!(await waitVideoReady())) return toast("Camera chưa sẵn sàng, thử lại nhé.", "error");
      if (mode === "boom") { var r = await boom(); if (r && r.video && r.video.size) openEditor({ kind: "video", image: r.image, video: r.video, name: r.name }); else toast("Không ghép được Boomerang.", "error"); }
      else { var b = await (mode === "night" ? night() : burst()); if (b) openEditor({ kind: "photo", image: b }); }
    } catch (err) { toast("Lỗi khi chụp: " + (err && err.message ? err.message : "không rõ"), "error"); }
    finally { shooting = false; progress(HINTS[mode]); }
  };
})();
