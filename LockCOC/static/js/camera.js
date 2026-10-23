"use strict";
/* =========================================================================
   camera.js - camera: chụp, giữ để quay 60s, nút quay hands-free,
   zoom (chụm/thanh trượt/1×2×3×), bộ lọc màu, hẹn giờ chụp
   ========================================================================= */

const FILTERS = [
  { id: "none", n: "Gốc", css: "none" },
  { id: "warm", n: "Ấm", css: "sepia(.22) saturate(1.3) hue-rotate(-8deg) brightness(1.05)" },
  { id: "cool", n: "Mát", css: "saturate(1.1) hue-rotate(12deg) brightness(1.03) contrast(1.05)" },
  { id: "mono", n: "Đen trắng", css: "grayscale(1) contrast(1.12)" },
  { id: "film", n: "Phim", css: "sepia(.35) contrast(1.1) saturate(.85) brightness(.98)" },
  { id: "vivid", n: "Rực rỡ", css: "saturate(1.6) contrast(1.08)" },
  { id: "soft", n: "Mờ ảo", css: "brightness(1.08) contrast(.92) saturate(1.1) blur(.5px)" },
];

const cam = { stream: null, facing: "user", zoom: 1, starting: false, zoomTimer: null, filter: FILTERS[0], timer: 0, cd: 0, counting: false };
const rec = { active: false, mr: null, chunks: [], start: 0, timer: null, raf: 0, audio: null, thumb: null, stopReq: false, handsFree: false, discard: false };
const vid = $("#cam");
const shutter = $("#shutter");
const vf = $("#viewfinder");
const HINT = "Chạm để chụp · Giữ để quay · hoặc bấm nút đỏ (tối đa 60 giây)";

function setCamMsg(text, withBtn) {
  const m = $("#cam-msg");
  if (!text) { m.classList.add("hidden"); return; }
  m.replaceChildren(el("div", {}, text), withBtn ? el("button", { class: "btn small primary", onclick: camStart }, el("span", { class: "btn-label" }, "Bật camera")) : null);
  m.classList.remove("hidden");
}

async function camStart() {
  if (cam.stream || cam.starting) return;
  cam.starting = true;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("nosupport"), { name: "NoSupport" });
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: cam.facing }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    if (S.page !== "camera" || document.hidden || $(".overlay")) { stream.getTracks().forEach((t) => t.stop()); return; }
    cam.stream = stream;
    vid.srcObject = stream;
    try { await vid.play(); } catch { /* autoplay bị chặn */ }
    setCamMsg("");
    applyZoom(cam.zoom, false);
    applyFilter();
  } catch (e) {
    const denied = e.name === "NotAllowedError" || e.name === "SecurityError";
    setCamMsg(denied ? "Chưa có quyền dùng camera. Hãy cho phép camera trong cài đặt trình duyệt, hoặc chọn ảnh từ thư viện ở nút bên trái."
      : e.name === "NoSupport" ? "Trình duyệt không hỗ trợ camera (cần HTTPS). Bạn vẫn có thể chọn ảnh từ thư viện."
      : "Không mở được camera. Thử lại hoặc chọn ảnh từ thư viện.", true);
  } finally { cam.starting = false; }
}
function camStop() {
  cancelCountdown();
  if (rec.active) stopRecording(true);
  if (cam.stream) { cam.stream.getTracks().forEach((t) => t.stop()); cam.stream = null; }
  vid.srcObject = null;
}

// ---------------------------------------------------------------- zoom
function applyZoom(z, showBadge = true) {
  cam.zoom = Math.min(5, Math.max(1, z));
  vid.style.transform = `scale(${cam.zoom}) scaleX(${cam.facing === "user" ? -1 : 1})`;
  $("#zoom-range").value = cam.zoom;
  $$(".zoom-chip").forEach((c) => c.classList.toggle("on", Math.abs(+c.dataset.zoom - cam.zoom) < 0.06));
  const b = $("#zoom-badge");
  b.textContent = cam.zoom.toFixed(1) + "×";
  if (showBadge) {
    b.classList.remove("hidden");
    clearTimeout(cam.zoomTimer);
    cam.zoomTimer = setTimeout(() => b.classList.add("hidden"), 1100);
  }
}
$("#zoom-range").addEventListener("input", (e) => applyZoom(+e.target.value));
$$(".zoom-chip").forEach((c) => c.addEventListener("click", () => applyZoom(+c.dataset.zoom)));

const pts = new Map();
let pinch = null;
vf.addEventListener("pointerdown", (e) => { pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: cam.zoom }; } });
vf.addEventListener("pointermove", (e) => {
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, e);
  if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; applyZoom(pinch.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d); }
});
const endPt = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
vf.addEventListener("pointerup", endPt); vf.addEventListener("pointercancel", endPt); vf.addEventListener("pointerleave", endPt);
vf.addEventListener("wheel", (e) => { e.preventDefault(); applyZoom(cam.zoom * (e.deltaY < 0 ? 1.08 : 0.92)); }, { passive: false });
vf.addEventListener("dblclick", () => applyZoom(cam.zoom > 1.4 ? 1 : 2));

$("#btn-flip").addEventListener("click", async () => {
  if (rec.active) return;
  cam.facing = cam.facing === "user" ? "environment" : "user";
  camStop();
  await camStart();
});

// ---------------------------------------------------------------- bộ lọc màu
function applyFilter() { vid.style.filter = cam.filter.css === "none" ? "" : cam.filter.css; }
FILTERS.forEach((f) => {
  $("#filter-strip").append(el("button", { class: "chip" + (f.id === "none" ? " on" : ""), dataset: { f: f.id }, onclick: () => {
    cam.filter = f; applyFilter();
    $$("#filter-strip .chip").forEach((c) => c.classList.toggle("on", c.dataset.f === f.id));
    haptic(8);
  } }, f.n));
});
$("#btn-filters").addEventListener("click", (e) => {
  const strip = $("#filter-strip");
  strip.classList.toggle("hidden");
  e.currentTarget.classList.toggle("on", !strip.classList.contains("hidden"));
});

// ---------------------------------------------------------------- hẹn giờ chụp
$("#btn-timer").addEventListener("click", (e) => {
  cam.timer = cam.timer === 0 ? 3 : cam.timer === 3 ? 10 : 0;
  $("#timer-label").textContent = cam.timer ? cam.timer + " giây" : "Tắt";
  e.currentTarget.classList.toggle("on", !!cam.timer);
});
async function runCountdown(sec) {
  const token = ++cam.cd;
  cam.counting = true;
  const c = $("#countdown");
  c.classList.remove("hidden");
  for (let i = sec; i > 0; i--) {
    if (cam.cd !== token) return false;
    c.replaceChildren(el("span", {}, String(i)));
    haptic(14);
    await sleep(1000);
  }
  if (cam.cd !== token) return false;
  c.classList.add("hidden");
  cam.counting = false;
  return true;
}
function cancelCountdown() { cam.cd++; cam.counting = false; $("#countdown").classList.add("hidden"); }

// ---------------------------------------------------------------- vẽ khung vuông theo zoom + lọc màu
function drawSquare(ctx, size) {
  const vw = vid.videoWidth, vh = vid.videoHeight;
  if (!vw || !vh) return false;
  const side = Math.min(vw, vh) / cam.zoom;
  const sx = (vw - side) / 2, sy = (vh - side) / 2;
  ctx.save();
  if (cam.filter.css !== "none") ctx.filter = cam.filter.css;
  if (cam.facing === "user") { ctx.translate(size, 0); ctx.scale(-1, 1); } // giống hệt khung xem trước
  ctx.drawImage(vid, sx, sy, side, side, 0, 0, size, size);
  ctx.restore();
  return true;
}
function grabPhoto() {
  return new Promise((resolve) => {
    const vw = vid.videoWidth, vh = vid.videoHeight;
    const size = Math.min(1080, Math.floor(Math.min(vw, vh) / cam.zoom)) || 720;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    if (!drawSquare(c.getContext("2d"), size)) return resolve(null);
    c.toBlob((b) => {
      if (b) return resolve(b);
      try { // dự phòng cho trình duyệt trả null
        const bin = atob(c.toDataURL("image/jpeg", 0.9).split(",")[1]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: "image/jpeg" }));
      } catch { resolve(null); }
    }, "image/jpeg", 0.92);
  });
}

// ---------------------------------------------------------------- nút chụp: chạm = ảnh, giữ = quay
// Chụp ảnh dùng sự kiện "click" (ổn định nhất trên mọi điện thoại); giữ lâu bằng pointer để quay video.
let holdTimer = null, pressing = false, recStarted = false, lastRecEnd = 0, shooting = false;
shutter.addEventListener("contextmenu", (e) => e.preventDefault());
shutter.addEventListener("pointerdown", (e) => {
  if (cam.counting) { cancelCountdown(); return; }
  if (!cam.stream) { toast("Camera chưa bật. Bấm \"Bật camera\" hoặc cho phép quyền camera.", "error"); camStart(); return; }
  if (rec.active) return;
  pressing = true; recStarted = false;
  try { shutter.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
  shutter.classList.add("press");
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => { if (!pressing) return; recStarted = true; rec.handsFree = false; startRecording(); }, 380);
});
function shutterRelease() {
  clearTimeout(holdTimer);
  shutter.classList.remove("press");
  const wasHold = recStarted;
  pressing = false; recStarted = false;
  if (wasHold) { lastRecEnd = Date.now(); stopRecording(false); }
}
shutter.addEventListener("pointerup", shutterRelease);
shutter.addEventListener("pointercancel", shutterRelease);
shutter.addEventListener("lostpointercapture", () => { if (pressing && recStarted) shutterRelease(); });
shutter.addEventListener("click", (e) => {
  e.preventDefault();
  if (rec.active || Date.now() - lastRecEnd < 600 || cam.counting) return; // vừa quay xong / đang quay
  takePhoto();
});

function waitVideoReady(ms = 2500) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    (function chk() {
      if (vid.videoWidth > 0 && vid.readyState >= 2) return resolve(true);
      if (performance.now() - t0 > ms) return resolve(false);
      setTimeout(chk, 80);
    })();
  });
}
async function takePhoto() {
  if (shooting) return;
  if (!cam.stream) { toast("Camera chưa bật.", "error"); return camStart(); }
  shooting = true;
  try {
    if (cam.timer > 0 && !(await runCountdown(cam.timer))) return;
    if (!(await waitVideoReady())) return toast("Camera chưa sẵn sàng, thử lại nhé.", "error");
    const f = $("#flash");
    f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    haptic(18);
    const blob = await grabPhoto();
    if (!blob) return toast("Không chụp được ảnh, thử lại hoặc chọn ảnh từ thư viện.", "error");
    openEditor({ kind: "photo", image: blob });
  } catch (err) {
    toast("Lỗi khi chụp: " + (err && err.message ? err.message : "không rõ"), "error");
  } finally { shooting = false; }
}

// nút quay video riêng (không cần giữ tay)
$("#btn-video").addEventListener("click", async () => {
  if (!cam.stream) return;
  if (rec.active) { stopRecording(false); return; }
  if (cam.counting) { cancelCountdown(); return; }
  if (cam.timer > 0 && !(await runCountdown(cam.timer))) return;
  rec.handsFree = true; recStarted = false;
  startRecording();
});

// ---------------------------------------------------------------- quay video
function pickMime() {
  if (!window.MediaRecorder) return "";
  const list = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}
function updateRecUI() {
  const t = Math.min(MAX_REC, (performance.now() - rec.start) / 1000);
  $("#rec-time").textContent = `${Math.floor(t / 60)}:${pad2(Math.floor(t % 60))}`;
  $("#ring-fg").style.strokeDashoffset = String(289 * (1 - t / MAX_REC));
  if (t >= MAX_REC) { if (pressing) shutterRelease(); else stopRecording(false); }
}

async function startRecording() {
  if (!window.MediaRecorder) { recStarted = false; pressing = false; shutter.classList.remove("press"); toast("Trình duyệt này không hỗ trợ quay video.", "error"); return; }
  rec.active = true; rec.stopReq = false; rec.chunks = []; rec.discard = false;
  haptic(25);
  shutter.classList.add("recording"); vf.classList.add("rec");
  $("#btn-video").classList.add("on");
  $("#rec-badge").classList.remove("hidden");
  $("#btn-timer").classList.add("hidden");
  $("#cam-hint").textContent = rec.handsFree ? "Chạm nút đỏ để dừng quay" : "Thả tay để dừng";
  $("#rec-time").textContent = "0:00";
  rec.thumb = await grabPhoto();
  try { rec.audio = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { rec.audio = null; }
  if (rec.stopReq || !rec.active) { cleanupRec(); return; } // đã thả tay trong lúc xin quyền mic

  const c = $("#work");
  c.width = c.height = 720;
  const ctx = c.getContext("2d");
  const out = c.captureStream(30);
  if (rec.audio) rec.audio.getAudioTracks().forEach((t) => out.addTrack(t));
  const mime = pickMime();
  try { rec.mr = new MediaRecorder(out, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined); }
  catch { cleanupRec(); return toast("Không khởi động được quay video.", "error"); }
  rec.mr.ondataavailable = (e) => { if (e.data && e.data.size) rec.chunks.push(e.data); };
  rec.mr.onstop = onRecStopped;
  const tick = () => { if (!rec.active) return; drawSquare(ctx, 720); rec.raf = requestAnimationFrame(tick); };
  drawSquare(ctx, 720);
  rec.mr.start(300);
  rec.start = performance.now();
  tick();
  rec.timer = setInterval(updateRecUI, 100);
}

function stopRecording(discard) {
  rec.stopReq = true;
  rec.discard = !!discard;
  if (rec.mr && rec.mr.state !== "inactive") { rec.active = false; try { rec.mr.stop(); } catch { cleanupRec(); } }
  else cleanupRec();
}

function cleanupRec() {
  rec.active = false;
  cancelAnimationFrame(rec.raf);
  clearInterval(rec.timer);
  if (rec.audio) { rec.audio.getTracks().forEach((t) => t.stop()); rec.audio = null; }
  shutter.classList.remove("recording"); vf.classList.remove("rec");
  $("#btn-video").classList.remove("on");
  $("#btn-timer").classList.remove("hidden");
  $("#rec-badge").classList.add("hidden");
  $("#ring-fg").style.strokeDashoffset = "289";
  $("#cam-hint").textContent = HINT;
  rec.mr = null; rec.handsFree = false;
}

function onRecStopped() {
  const secs = (performance.now() - rec.start) / 1000;
  const type = (rec.mr && rec.mr.mimeType) || "video/webm";
  const blob = new Blob(rec.chunks, { type });
  const thumb = rec.thumb, discard = rec.discard;
  cleanupRec();
  rec.chunks = [];
  if (discard) return;
  if (secs < 1 || !blob.size) { if (thumb) openEditor({ kind: "photo", image: thumb }); return; } // quá ngắn: coi như ảnh
  haptic([15, 30, 15]);
  openEditor({ kind: "video", image: thumb, video: blob, name: type.includes("mp4") ? "clip.mp4" : "clip.webm" });
}

// ---------------------------------------------------------------- chọn từ thư viện
$("#btn-gallery").addEventListener("click", () => $("#file-pick").click());
$("#file-pick").addEventListener("change", async (ev) => {
  const f = ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  if (f.type.startsWith("image/")) return openEditor({ kind: "photo", image: f, name: f.name });
  if (f.type.startsWith("video/")) {
    const thumb = await videoThumb(f);
    if (!thumb) return toast("Không đọc được video này.", "error");
    return openEditor({ kind: "video", image: thumb, video: f, name: f.name });
  }
  toast("Chỉ hỗ trợ ảnh hoặc video.", "error");
});
function videoThumb(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "metadata"; v.src = url;
    const fail = () => { URL.revokeObjectURL(url); resolve(null); };
    v.onerror = fail;
    v.onloadeddata = () => { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); };
    v.onseeked = () => {
      const side = Math.min(v.videoWidth, v.videoHeight), size = Math.min(1080, side);
      const c = document.createElement("canvas"); c.width = c.height = size;
      c.getContext("2d").drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, size, size);
      c.toBlob((b) => { URL.revokeObjectURL(url); resolve(b); }, "image/jpeg", 0.9);
    };
    setTimeout(fail, 8000);
  });
}
