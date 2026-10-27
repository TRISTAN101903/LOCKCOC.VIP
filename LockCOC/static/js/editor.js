"use strict";
/* =========================================================================
   editor.js - soạn bài: caption/studio, khung Locket (widget frame), hẹn giờ,
   chọn người nhận, chụp lại, gửi
   ========================================================================= */

// ---- Khung widget Locket (được "in" thẳng vào ảnh trước khi gửi) ----
const FRAMES = [
  { id: "none", n: "Không", e: "▢" },
  { id: "gold", n: "Vàng", e: "🟡" },
  { id: "polaroid", n: "Polaroid", e: "🖼️" },
  { id: "circle", n: "Tròn", e: "⚪" },
  { id: "heart", n: "Tim", e: "💛" },
  { id: "film", n: "Phim", e: "🎞️" },
  { id: "glass", n: "Kính", e: "🫧" },
];

function loadBitmap(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh")); };
    img.src = url;
  });
}
function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.9, cy - s * 1.15, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.15, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
  ctx.closePath();
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// Vẽ ảnh vuông + khung ra canvas vuông size×size
async function renderFramed(blob, frame, size = 1080) {
  const img = await loadBitmap(blob);
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  const photo = (dx, dy, dw, dh) => x.drawImage(img, sx, sy, side, side, dx, dy, dw, dh);
  const gold = x.createLinearGradient(0, 0, size, size);
  gold.addColorStop(0, "#fbe3a0"); gold.addColorStop(0.5, "#e2b04a"); gold.addColorStop(1, "#a06d1a");
  x.fillStyle = "#0b0a09"; x.fillRect(0, 0, size, size);
  const m = size * 0.045;
  switch (frame) {
    case "gold": {
      x.fillStyle = gold; rrect(x, 0, 0, size, size, size * 0.1); x.fill();
      x.save(); rrect(x, m, m, size - 2 * m, size - 2 * m, size * 0.07); x.clip(); photo(m, m, size - 2 * m, size - 2 * m); x.restore();
      break;
    }
    case "polaroid": {
      x.fillStyle = "#f7f3ea"; x.fillRect(0, 0, size, size);
      const p = size * 0.06, w = size - 2 * p;
      photo(p, p, w, w * 0.82);
      x.fillStyle = "#b9ab8f"; x.font = `600 ${size * 0.05}px "Segoe UI", sans-serif`; x.textAlign = "center";
      x.fillText("LockCOC", size / 2, size - p * 1.15);
      break;
    }
    case "circle": {
      x.strokeStyle = gold; x.lineWidth = size * 0.03;
      x.save(); x.beginPath(); x.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2); x.clip(); photo(size * 0.04, size * 0.04, size * 0.92, size * 0.92); x.restore();
      x.beginPath(); x.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2); x.stroke();
      break;
    }
    case "heart": {
      x.save(); heartPath(x, size / 2, size * 0.52, size * 0.5); x.clip(); photo(0, 0, size, size); x.restore();
      x.strokeStyle = gold; x.lineWidth = size * 0.022; heartPath(x, size / 2, size * 0.52, size * 0.5); x.stroke();
      break;
    }
    case "film": {
      const bar = size * 0.12;
      photo(0, bar, size, size - 2 * bar);
      x.fillStyle = "#111"; x.fillRect(0, 0, size, bar); x.fillRect(0, size - bar, size, bar);
      x.fillStyle = "#f2e6c9";
      for (let i = 0; i < 12; i++) { const px = (i + 0.35) * (size / 12); rrect(x, px, bar * 0.3, size * 0.045, bar * 0.4, 6); x.fill(); rrect(x, px, size - bar * 0.7, size * 0.045, bar * 0.4, 6); x.fill(); }
      break;
    }
    case "glass": {
      photo(0, 0, size, size);
      const b = size * 0.05;
      x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = b;
      rrect(x, b / 2, b / 2, size - b, size - b, size * 0.1); x.stroke();
      x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 3;
      rrect(x, b, b, size - 2 * b, size - 2 * b, size * 0.08); x.stroke();
      break;
    }
    default: photo(0, 0, size, size);
  }
  return new Promise((res) => c.toBlob(res, "image/jpeg", 0.92));
}

// ---- Màn hình soạn bài ----
function openEditor(init) {
  camStop();
  const ed = { kind: init.kind, image: init.image, video: init.video || null, name: init.name, caption: "", icon: "", grad: null, note: null, fx: null, frame: "none", schedule: null, recipients: null };
  const isVideo = ed.kind === "video";
  const ov = openOverlay("editor");
  let urls = [];
  const mkUrl = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  ov._cleanup = () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; };
  ov._after = () => { if (S.page === "camera") camStart(); };

  const pill = el("div", { class: "cap-pill hidden" });
  const fxLayer = el("div", { class: "fx-layer" });
  const media = el("div", { class: "preview" });
  let vidEl = null;
  if (isVideo) {
    vidEl = el("video", { src: mkUrl(ed.video), playsinline: "", loop: "", muted: "", autoplay: "", controls: false });
    vidEl.muted = true;
    media.append(vidEl);
    vidEl.play().catch(() => {});
  }
  const imgPrev = el("img", { alt: "Xem trước" });
  if (!isVideo) media.append(imgPrev);
  const songBox = el("div", { class: "song-slot" });
  media.append(fxLayer, pill, songBox);

  let frameSeq = 0;
  async function refreshMedia() {
    if (isVideo) return;
    const my = ++frameSeq;
    try {
      const b = ed.frame === "none" ? ed.image : await renderFramed(ed.image, ed.frame, 720);
      if (my === frameSeq) imgPrev.src = mkUrl(b);
    } catch { /* bỏ qua */ }
  }
  function refresh() { applyPill(pill, ed); applyFx(fxLayer, ed.fx); capIn.value = ed.caption || ""; drawSongSlot(songBox, ed, refresh); }
  const capIn = el("input", { type: "text", class: "cap-input", placeholder: "Thêm caption…", maxlength: 120, oninput: (e) => { ed.caption = e.target.value; applyPill(pill, ed); } });

  const studioBtn = el("button", { class: "studio-btn glass", onclick: () => openStudio(ed, refresh) }, icon("sparkle"), "Studio · nhạc, widget, hiệu ứng");

  // khung widget
  const frameRow = el("div", { class: "hrow" }, ...FRAMES.map((f) => el("button", { class: "chip" + (f.id === "none" ? " on" : ""), dataset: { f: f.id }, onclick: () => {
    if (isVideo) return toast("Khung chỉ áp dụng cho ảnh (video giữ nguyên).", "msg");
    ed.frame = f.id;
    $$("[data-f]", frameRow).forEach((b) => b.classList.toggle("on", b.dataset.f === f.id));
    refreshMedia();
  } }, gl(f.e), " " + f.n)));

  // hẹn giờ
  const schedIn = el("input", { type: "datetime-local", class: "sched-input hidden" });
  const schedMeta = el("small", {}, "Đăng ngay");
  const schedCard = el("button", { class: "row-card glass", onclick: () => {
    const hide = !schedIn.classList.contains("hidden");
    schedIn.classList.toggle("hidden", hide);
    if (hide) { ed.schedule = null; schedMeta.textContent = "Đăng ngay"; return; }
    const d = new Date(Date.now() + 3600e3);
    schedIn.min = new Date(Date.now() + 120e3 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    schedIn.value = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    ed.schedule = d.getTime(); schedMeta.textContent = "Hẹn lúc " + fmtWhen(ed.schedule);
  } }, icon("calendar"), el("div", { class: "meta" }, el("strong", {}, "Hẹn giờ đăng"), schedMeta));
  schedIn.addEventListener("input", () => { const t = Date.parse(schedIn.value); if (!isNaN(t)) { ed.schedule = t; schedMeta.textContent = "Hẹn lúc " + fmtWhen(t); } });

  // người nhận
  const recMeta = el("small", {}, "Tất cả bạn bè");
  const recCard = el("button", { class: "row-card glass", onclick: async () => {
    await ensureFriends();
    if (!S.friends.length) return toast("Chưa có danh sách bạn bè.", "msg");
    const chosen = new Set(ed.recipients || []);
    const rows = S.friends.filter((f) => f.uid).map((f) => {
      const r = el("button", { class: "pick-row" + (chosen.has(f.uid) ? " on" : ""), onclick: () => { chosen.has(f.uid) ? chosen.delete(f.uid) : chosen.add(f.uid); r.classList.toggle("on"); } },
        avatarEl(f.avatar, fullName(f) || f.username), el("div", { class: "meta" }, el("strong", {}, fullName(f) || f.username || "Bạn bè"), el("small", {}, f.username ? "@" + f.username : "")), el("span", { class: "check" }, icon("check")));
      return r;
    });
    const uidRows = new Map(); S.friends.filter((f) => f.uid).forEach((f, i) => uidRows.set(f.uid, rows[i]));
    const grpBar = el("div", { class: "grp-bar" });
    const refreshGroups = async () => {
      let gs = []; try { gs = (await api("/api/groups")).items; } catch { /* bỏ qua */ }
      const nameIn = el("input", { type: "text", placeholder: "Tên nhóm", maxlength: "30", class: "hidden", style: { flex: "1", minWidth: "90px" } });
      const saveBtn = el("button", { class: "chip", type: "button" }, "+ Lưu nhóm");
      saveBtn.addEventListener("click", async () => {
        if (nameIn.classList.contains("hidden")) { if (!chosen.size) return toast("Hãy chọn vài người trước rồi lưu thành nhóm.", "msg"); nameIn.classList.remove("hidden"); nameIn.focus(); saveBtn.textContent = "Lưu"; return; }
        const nm = nameIn.value.trim(); if (!nm) return;
        try { await api("/api/groups", { method: "POST", json: { name: nm, uids: [...chosen] } }); refreshGroups(); } catch (er) { toast(er.message, "error"); }
      });
      grpBar.replaceChildren(el("small", {}, "Nhóm:"), ...gs.flatMap((g) => [
        el("button", { class: "chip", type: "button", onclick: () => { chosen.clear(); g.uids.forEach((u) => chosen.add(u)); uidRows.forEach((r, u) => r.classList.toggle("on", chosen.has(u))); } }, g.name),
        el("button", { class: "chip", type: "button", "aria-label": "Xoá nhóm " + g.name, onclick: async () => { try { await api("/api/groups/delete", { method: "POST", json: { id: g.id } }); refreshGroups(); } catch (er) { toast(er.message, "error"); } } }, "×")]), nameIn, saveBtn);
    };
    refreshGroups();
    const sh = bottomSheet(el("h3", { style: { margin: "0 0 4px" } }, "Gửi tới ai?"), grpBar,
      el("div", { style: { overflowY: "auto" } }, ...rows),
      el("div", { style: { display: "flex", gap: "8px" } },
        el("button", { class: "btn small", onclick: () => { ed.recipients = null; recMeta.textContent = "Tất cả bạn bè"; sh.close(); } }, el("span", { class: "btn-label" }, "Tất cả")),
        el("button", { class: "btn small primary", style: { flex: "1" }, onclick: () => { ed.recipients = chosen.size ? [...chosen] : null; recMeta.textContent = chosen.size ? `${chosen.size} người` : "Tất cả bạn bè"; sh.close(); } }, el("span", { class: "btn-label" }, "Xong"))));
  } }, icon("users"), el("div", { class: "meta" }, el("strong", {}, "Người nhận"), recMeta), icon("chev"));

  const retake = el("button", { class: "round-btn", "aria-label": "Chụp lại", onclick: () => closeOverlay(ov) }, icon("refresh"));
  const sendBtn = el("button", { class: "btn primary block", onclick: send }, icon("send"), el("span", { class: "btn-label" }, "Đăng khoảnh khắc"));

  ov.append(
    el("div", { class: "ov-head" }, el("button", { class: "icon-btn", "aria-label": "Đóng", onclick: () => closeOverlay(ov) }, icon("close")), el("h2", {}, "Soạn khoảnh khắc"), el("span", { style: { width: "40px" } })),
    el("div", { class: "ov-body" }, media,
      el("div", { class: "edit-actions" }, el("div", { class: "searchbar" }, capIn), studioBtn,
        el("div", { class: "sec" }, icon("layers"), "Khung widget Locket"), frameRow, schedCard, schedIn, recCard)),
    el("div", { class: "ov-foot" }, retake, sendBtn));
  refresh(); refreshMedia();

  async function send() {
    if (ed.schedule && ed.schedule < Date.now() + 60e3) return toast("Giờ hẹn phải ở tương lai (ít nhất 1 phút).", "error");
    sendBtn.classList.add("loading");
    const note = (isVideo || ed.music) ? toast(ed.music ? "Đang ghép nhạc vào bài đăng…" : "Đang xử lý video…", "msg", 90000) : null;
    try {
      const fd = new FormData();
      let img = !isVideo && ed.frame !== "none" ? await renderFramed(ed.image, ed.frame, 1080) : ed.image;
      if (ed.song && !isVideo) img = await burnSongCard(img, ed.song);
      fd.append("image", img, "photo.jpg");
      if (ed.song && isVideo && ed.music) fd.append("music_card", await songCardPng(ed.song), "card.png");
      if (isVideo) fd.append("video", ed.video, ed.name || "clip.webm");
      if (ed.music) {
        if (ed.music.file) { fd.append("music", ed.music.file, ed.music.file.name); fd.append("music_start", String(ed.music.start || 0)); }
        else if (ed.music.url) fd.append("music_url", ed.music.url);
      }
      if (ed.caption) fd.append("caption", ed.caption);
      const ic = ed.icon || (ed.fx ? (FX.find((f) => f.id === ed.fx) || {}).e : "");
      if (ic) fd.append("icon", ic);
      if (ed.grad != null) { fd.append("colors", GRADS[ed.grad].c.join(",")); fd.append("text_color", GRADS[ed.grad].t); }
      if (ed.note) fd.append("note_type", ed.note);
      if (ed.recipients) fd.append("recipients", ed.recipients.join(","));
      if (ed.schedule) fd.append("schedule_at", String(ed.schedule));
      const res = await api("/api/post", { method: "POST", form: fd });
      ov.append(el("div", { class: "success-burst" }, el("div", { class: "tick" }, icon("check"))));
      haptic([20, 40, 20]);
      await sleep(1100);
      closeOverlay(ov);
      if (res.scheduled) { toast("Đã hẹn giờ đăng lúc " + fmtWhen(ed.schedule), "ok"); loadScheduled(); }
      else { toast("Đã đăng lên Locket!", "ok"); S.feedStale = true; S.myStale = true; loadStreak(); }
    } catch (e) { toast(e.message, "error"); }
    finally { if (note) note.close(); sendBtn.classList.remove("loading"); }
  }
}
