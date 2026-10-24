"use strict";
const CARD_FONT = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

function loadArt(url) {
  return new Promise((res) => {
    if (!url || !/^https:\/\//i.test(url)) return res(null);
    const im = new Image();
    im.crossOrigin = "anonymous";
    const t = setTimeout(() => res(null), 4500);
    im.onload = () => { clearTimeout(t); res(im); };
    im.onerror = () => { clearTimeout(t); res(null); };
    im.src = url;
  });
}
function cardFit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}
function cardNote(ctx, cx, cy, s, col) {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * 0.14; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(cx - s * 0.12, cy + s * 0.34); ctx.lineTo(cx - s * 0.12, cy - s * 0.42); ctx.lineTo(cx + s * 0.4, cy - s * 0.54); ctx.lineTo(cx + s * 0.4, cy + s * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx - s * 0.3, cy + s * 0.36, s * 0.2, s * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.22, cy + s * 0.22, s * 0.2, s * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawSongCard(ctx, x, y, w, song, art) {
  const h = w * 0.17, r = h * 0.32, pad = h * 0.14;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.38)"; ctx.shadowBlur = h * 0.28; ctx.shadowOffsetY = h * 0.08;
  ctx.fillStyle = "rgba(24,20,15,.9)"; rrect(ctx, x, y, w, h, r); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = Math.max(1, h * 0.014); rrect(ctx, x, y, w, h, r); ctx.stroke();
  const a = h - pad * 2, ax = x + pad, ay = y + pad;
  ctx.save(); rrect(ctx, ax, ay, a, a, a * 0.22); ctx.clip();
  if (art) ctx.drawImage(art, ax, ay, a, a);
  else {
    const g = ctx.createLinearGradient(ax, ay, ax + a, ay + a);
    g.addColorStop(0, "#34d2a4"); g.addColorStop(1, "#f0a93c");
    ctx.fillStyle = g; ctx.fillRect(ax, ay, a, a);
    cardNote(ctx, ax + a / 2, ay + a / 2, a * 0.62, "#2b1a12");
  }
  ctx.restore();
  const pr = h * 0.27, px = x + w - pad - pr - h * 0.06, py = y + h / 2;
  ctx.fillStyle = "#f6e7c4"; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2b1a12"; ctx.beginPath();
  ctx.moveTo(px - pr * 0.27, py - pr * 0.5); ctx.lineTo(px + pr * 0.56, py); ctx.lineTo(px - pr * 0.27, py + pr * 0.5); ctx.closePath(); ctx.fill();
  const tx = ax + a + pad * 1.3, tw = px - pr - pad * 1.2 - tx;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff"; ctx.font = `700 ${h * 0.27}px ${CARD_FONT}`;
  ctx.fillText(cardFit(ctx, song.title || "Bài hát", tw), tx, y + h * (song.artist ? 0.46 : 0.58));
  if (song.artist) {
    ctx.fillStyle = "rgba(255,255,255,.66)"; ctx.font = `500 ${h * 0.21}px ${CARD_FONT}`;
    ctx.fillText(cardFit(ctx, song.artist, tw), tx, y + h * 0.74);
  }
  return h;
}
function canvasBlob(c, type, q) {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Không vẽ được thẻ nhạc"))), type, q));
}
async function burnSongCard(blob, song) {
  const [img, art] = await Promise.all([loadBitmap(blob), loadArt(song.art)]);
  const W = Math.min(img.width, 1080), H = Math.round((img.height * W) / img.width);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);
  const w = W * 0.86, h = w * 0.17;
  drawSongCard(ctx, (W - w) / 2, H - h - H * 0.05, w, song, art);
  return canvasBlob(c, "image/jpeg", 0.92);
}
async function songCardPng(song) {
  const art = await loadArt(song.art);
  const w = 900, h = Math.round(w * 0.17), padX = 24, padY = 18;
  const c = document.createElement("canvas");
  c.width = w + padX * 2; c.height = h + padY * 2;
  drawSongCard(c.getContext("2d"), padX, padY, w, song, art);
  return canvasBlob(c, "image/png");
}

function songCardEl(song, { hasAudio = false, playing = false, onPlay, onRemove } = {}) {
  const artUrl = safeUrl(song.art);
  const art = el("div", { class: "sc-art" }, artUrl ? imgEl(artUrl, "") : gl("🎵"));
  const meta = el("div", { class: "sc-meta" }, el("strong", {}, song.title || "Bài hát"), song.artist ? el("small", {}, song.artist) : null);
  const play = hasAudio ? el("button", { class: "sc-play" + (playing ? " on" : ""), "aria-label": "Nghe thử", onclick: (e) => { e.stopPropagation(); onPlay && onPlay(e.currentTarget); } }, icon(playing ? "pause" : "play")) : null;
  const rm = onRemove ? el("button", { class: "sc-x", "aria-label": "Bỏ bài hát", onclick: (e) => { e.stopPropagation(); onRemove(); } }, icon("close", "i s")) : null;
  return el("div", { class: "song-card" }, art, meta, play, rm);
}
function drawSongSlot(slot, ed, refresh) {
  slot.replaceChildren();
  if (!ed.song) return;
  const m = ed.music;
  const hasAudio = !!(m && (m.url || m.file));
  const card = songCardEl(ed.song, {
    hasAudio,
    onPlay: (btn) => {
      const was = btn.classList.contains("on");
      stopPreview();
      if (was) { btn.classList.remove("on"); btn.replaceChildren(icon("play")); return; }
      const src = m.url || (m._obj = m._obj || URL.createObjectURL(m.file));
      audioPrev = new Audio(src); audioPrev.volume = 0.8;
      if (m.file && m.start) audioPrev.currentTime = m.start;
      audioPrev.play().catch(() => toast("Không phát được bản nghe thử.", "error"));
      audioPrev.onended = () => { stopPreview(); btn.classList.remove("on"); btn.replaceChildren(icon("play")); };
      btn.classList.add("on"); btn.replaceChildren(icon("pause"));
    },
    onRemove: () => { stopPreview(); ed.song = null; ed.music = null; refresh(); },
  });
  slot.append(card);
}
