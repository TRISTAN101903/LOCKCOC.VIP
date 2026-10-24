"use strict";
/* =========================================================================
   social.js - bảng tin (danh sách/lưới, lọc bạn, đồng bộ toàn bộ), cảm xúc có
   hiệu ứng, bạn bè, chat, trang cá nhân
   ========================================================================= */

const F = { items: [], view: getPref("view", "list"), filter: null, loading: false, shown: 30 };
const rxStore = new Map(); // moment_id -> {emoji: count} (cảm xúc bạn vừa thả)

// ---------------------------------------------------------------- khối bài đăng
function mediaBlock(m, opts = {}) {
  const box = el("div", { class: "post-media" });
  const src = safeUrl(m.image);
  if (m.video && safeUrl(m.video) && opts.play !== false) {
    const v = el("video", { src: safeUrl(m.video), poster: src || null, playsinline: "", loop: "", muted: "", preload: "metadata" });
    v.muted = true;
    box.append(v);
    if (window.IntersectionObserver) new IntersectionObserver((en) => en.forEach((x) => { x.isIntersecting ? v.play().catch(() => {}) : v.pause(); }), { threshold: 0.6 }).observe(v);
    v.addEventListener("error", () => { v.replaceWith(src ? imgEl(src) : el("div", { class: "ph" }, "🎬")); });
  } else box.append(src ? imgEl(src) : el("div", { class: "ph" }, "🖼️"));
  if (m.caption) box.append(el("div", { class: "cap-pill" }, m.caption));
  return box;
}

function sendReaction(m, emoji, x, y, rxRow) {
  burstEmoji(emoji, x, y);
  const st = rxStore.get(m.id) || {};
  st[emoji] = (st[emoji] || 0) + 1;
  rxStore.set(m.id, st);
  if (rxRow) renderRx(rxRow, m.id, emoji);
  api("/api/react", { method: "POST", json: { moment_uid: m.id, reaction: emoji } }).catch((e) => toast(e.message, "error"));
}
function renderRx(row, id, bumped) {
  const st = rxStore.get(id) || {};
  row.replaceChildren(...Object.entries(st).map(([e, n]) => el("span", { class: "rx-chip glass" + (e === bumped ? " bump" : "") }, gl(e), n > 1 ? "×" + n : "")));
}

function postCard(m) {
  const u = m.user || {};
  const name = fullName(u) || u.username || nameOf(u.uid);
  const rxRow = el("div", { class: "rx-row" });
  renderRx(rxRow, m.id);
  const media = mediaBlock(m);
  let last = 0;
  media.addEventListener("pointerup", (e) => {
    if (e.target.closest("button")) return;
    const now = Date.now();
    if (now - last < 320) sendReaction(m, "❤️", e.clientX, e.clientY, rxRow);
    last = now;
  });
  const reactBtn = el("button", { class: "react-btn glass", onclick: (e) => reactPop(e.currentTarget, (emo, x, y) => sendReaction(m, emo, x, y, rxRow)) }, icon("sparkle"), "Cảm xúc");
  const cmtBtn = el("button", { class: "react-btn glass", onclick: async () => {
    const r = await dialog({ title: "Bình luận", fields: [{ name: "text", placeholder: "Viết bình luận…", max: 300 }], ok: "Gửi" });
    if (!r || !r.text) return;
    try { await api("/api/comment", { method: "POST", json: { moment_uid: m.id, receiver_uid: u.uid, text: r.text } }); toast("Đã gửi bình luận", "ok"); } catch (e) { toast(e.message, "error"); }
  } }, icon("comment"), "Bình luận");
  return el("article", { class: "post" },
    el("div", { class: "post-head" }, avatarEl(u.avatar, name), el("div", { class: "who" }, el("strong", {}, name), el("small", {}, timeAgo(m.ts || m.date))), m.video ? el("span", { class: "vidtag" }, "VID") : null),
    media, el("div", { class: "post-actions" }, reactBtn, cmtBtn), rxRow);
}

function openViewer(m, opts = {}) {
  const ov = openOverlay("viewer");
  const body = el("div", { class: "viewer-body" }, postCard(m));
  const bar = el("div", { class: "react-bar glass" }, ...REACTS.map((e) => el("button", { onclick: (ev) => { const r = ev.currentTarget.getBoundingClientRect(); sendReaction(m, e, r.left + r.width / 2, r.top + r.height / 2, $(".rx-row", body)); } }, gl(e))));
  if (!opts.mine) body.append(bar);
  if (opts.mine && m.id) {
    const vw = el("div", { class: "viewers" });
    body.append(el("div", { class: "label pad" }, "Người đã xem"), vw);
    api("/api/views/" + encodeURIComponent(m.id)).then((d) => {
      vw.replaceChildren(...(d.viewers.length ? d.viewers.map((v) => el("div", { class: "v glass" }, el("span", {}, v.name || nameOf(v.uid)), el("span", {}, v.emoji || "👁"))) : [el("div", { class: "empty" }, `${d.count || 0} lượt xem`)]));
    }).catch(() => vw.replaceChildren(el("div", { class: "empty" }, "Không tải được lượt xem")));
    body.append(el("button", { class: "btn danger block", style: { marginTop: "16px" }, onclick: async () => {
      if (!(await dialog({ title: "Xoá khoảnh khắc?", text: "Không thể hoàn tác.", ok: "Xoá", danger: true }))) return;
      try { await api("/api/moment/delete", { method: "POST", json: { moment_uid: m.id } }); toast("Đã xoá", "ok"); closeOverlay(ov); loadMine(); } catch (e) { toast(e.message, "error"); }
    } }, icon("trash"), el("span", { class: "btn-label" }, "Xoá bài này")));
  }
  ov.append(el("div", { class: "ov-head" }, el("button", { class: "icon-btn", "aria-label": "Đóng", onclick: () => closeOverlay(ov) }, icon("close")), el("h2", {}, opts.mine ? "Bài của tôi" : "Khoảnh khắc"), el("span", { style: { width: "40px" } })), body);
}

// ---------------------------------------------------------------- bảng tin
function renderFeed() {
  const list = $("#feed-list");
  list.classList.toggle("grid", F.view === "grid");
  $$(".seg button[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === F.view));
  const items = F.filter ? F.items.filter((m) => (m.user || {}).uid === F.filter) : F.items;
  if (!items.length) { list.replaceChildren(el("div", { class: "empty" }, el("b", {}, "Chưa có khoảnh khắc nào"), F.filter ? "Người này chưa chia sẻ gì." : "Hãy đồng bộ hoặc kết bạn thêm nhé.")); return; }
  const part = items.slice(0, F.shown);
  const nodes = part.map((m) => {
    if (F.view === "list") return postCard(m);
    const u = m.user || {};
    return el("button", { class: "gtile", onclick: () => openViewer(m) },
      safeUrl(m.image) ? imgEl(safeUrl(m.image)) : el("div", { class: "ph" }, "🖼️"),
      avatarEl(u.avatar, fullName(u) || u.username, "mini-av"), m.video ? el("span", { class: "vidtag" }, "VID") : null);
  });
  if (items.length > F.shown) nodes.push(el("button", { class: "btn small more-btn", onclick: () => { F.shown += 30; renderFeed(); } }, el("span", { class: "btn-label" }, "Xem thêm")));
  list.replaceChildren(...nodes);
}
async function loadFeed(full = false) {
  if (F.loading) return;
  F.loading = true;
  const btn = $("#btn-sync");
  btn.classList.add("spin");
  if (!F.items.length) $("#feed-list").replaceChildren(el("div", { class: "skeleton" }), el("div", { class: "skeleton" }));
  try {
    await ensureFriends();
    const d = await api("/api/feed" + (full ? "?full=1" : ""));
    F.items = d.items; F.shown = 30;
    const note = $("#sync-note");
    if (full) { note.textContent = `Đã đồng bộ ${d.synced_friends || 0} bạn · ${d.items.length} khoảnh khắc`; note.classList.remove("hidden"); setTimeout(() => note.classList.add("hidden"), 5000); toast("Đồng bộ xong!", "ok"); }
    S.feedStale = false;
    renderFeed();
  } catch (e) { toast(e.message, "error"); if (!F.items.length) $("#feed-list").replaceChildren(el("div", { class: "empty" }, e.message)); }
  finally { F.loading = false; btn.classList.remove("spin"); }
}
$("#btn-sync").addEventListener("click", () => loadFeed(true));
$$(".seg button[data-view]").forEach((b) => b.addEventListener("click", () => { F.view = b.dataset.view; setPref("view", F.view); renderFeed(); }));
$("#btn-filter").addEventListener("click", async () => {
  await ensureFriends();
  const pick = (uid, label, sh) => { F.filter = uid; $("#filter-label").textContent = label; F.shown = 30; renderFeed(); sh.close(); };
  const rows = [];
  const sh = bottomSheet(el("h3", { style: { margin: "0 0 4px" } }, "Xem khoảnh khắc của"), el("div", { style: { overflowY: "auto" } }, ...rows));
  const holder = sh.sheet.children[1];
  holder.append(el("button", { class: "pick-row" + (!F.filter ? " on" : ""), onclick: () => pick(null, "Mọi người", sh) }, el("div", { class: "meta" }, el("strong", {}, "Mọi người")), el("span", { class: "check" }, icon("check"))));
  S.friends.filter((f) => f.uid).forEach((f) => holder.append(el("button", { class: "pick-row" + (F.filter === f.uid ? " on" : ""), onclick: () => pick(f.uid, fullName(f) || f.username || "Bạn", sh) },
    avatarEl(f.avatar, fullName(f) || f.username), el("div", { class: "meta" }, el("strong", {}, fullName(f) || f.username || "Bạn bè")), el("span", { class: "check" }, icon("check")))));
});

// ---------------------------------------------------------------- bạn bè
async function loadFriends() {
  const box = $("#friends-list");
  try {
    await ensureFriends(true);
    box.replaceChildren(...(S.friends.length ? S.friends.map((f) => el("button", { class: "row-item", onclick: () => f.uid && openThread(f.uid) },
      avatarEl(f.avatar, fullName(f) || f.username), el("div", { class: "meta" }, el("strong", {}, fullName(f) || f.username || "Bạn bè"), el("small", {}, f.username ? "@" + f.username : "")), icon("chat"))) : [el("div", { class: "empty" }, el("b", {}, "Chưa có bạn bè"), "Tìm username để kết bạn.")]));
  } catch (e) { box.replaceChildren(el("div", { class: "empty" }, e.message)); }
}
$("#form-find").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const username = new FormData(ev.target).get("username").trim().replace(/^@/, "");
  await busy(ev.submitter, async () => {
    const p = await api("/api/profile/" + encodeURIComponent(username));
    const name = fullName(p) || p.username || username;
    $("#find-result").replaceChildren(el("div", { class: "found glass" }, avatarEl(p.avatar, name), el("div", { class: "meta", style: { flex: "1" } }, el("strong", {}, name), el("small", {}, p.username ? "@" + p.username : "")),
      el("button", { class: "btn small primary", onclick: async (e) => { await busy(e.currentTarget, async () => { await api("/api/friends/request", { method: "POST", json: { username: p.username || username } }); toast("Đã gửi lời mời kết bạn", "ok"); }); } }, el("span", { class: "btn-label" }, "Kết bạn"))));
  });
});
$("#form-accept").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  await busy(ev.submitter, async () => { await api("/api/friends/accept", { method: "POST", json: { user_uid: new FormData(ev.target).get("user_uid").trim() } }); toast("Đã chấp nhận lời mời", "ok"); ev.target.reset(); ensureFriends(true); loadFriends(); });
});

// ---------------------------------------------------------------- chat
let convCache = [];
async function loadChat(quiet = false) {
  try {
    await ensureFriends();
    const d = await api("/api/chat/conversations");
    const prev = S.unread;
    S.unread = d.unread;
    updateBadge();
    if (quiet && prev != null && d.unread > prev && !S.openThread) toast("Bạn có tin nhắn mới", "msg");
    convCache = d.items;
    if (S.page === "chat") {
      $("#conv-list").replaceChildren(...(d.items.length ? d.items.map((c) => el("button", { class: "row-item", onclick: () => openThread(c.other) },
        avatarEl((S.friendMap[c.other] || {}).avatar, nameOf(c.other)), el("div", { class: "meta" }, el("strong", {}, nameOf(c.other)), el("small", {}, c.last || "…")), c.unread ? el("span", { class: "unread" }, String(c.unread)) : null)) : [el("div", { class: "empty" }, el("b", {}, "Chưa có tin nhắn"), "Chọn một người bạn để bắt đầu trò chuyện.")]));
    }
  } catch (e) { if (!quiet) $("#conv-list").replaceChildren(el("div", { class: "empty" }, e.message)); }
}
function updateBadge() { const b = $("#chat-badge"); b.textContent = S.unread > 99 ? "99+" : String(S.unread || 0); b.classList.toggle("hidden", !S.unread); }

function openThread(uid) {
  const ov = openOverlay("thread-ov");
  S.openThread = uid;
  const msgs = el("div", { class: "msgs" });
  let sig = "", timer = null;
  const load = async () => {
    try {
      const d = await api("/api/chat/messages/" + encodeURIComponent(uid));
      const s2 = JSON.stringify(d.items.map((m) => [m.id, m.text]));
      if (s2 === sig) return;
      sig = s2;
      const stick = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;
      msgs.replaceChildren(...d.items.map((m) => el("div", { class: "bubble" + (m.mine || (d.me && m.sender === d.me) ? " me" : "") }, m.text)));
      if (stick || !msgs.dataset.init) { msgs.scrollTop = msgs.scrollHeight; msgs.dataset.init = "1"; }
      api("/api/chat/read", { method: "POST", json: { other_uid: uid } }).catch(() => {});
    } catch { /* bỏ qua lỗi tạm thời */ }
  };
  const inp = el("input", { type: "text", placeholder: "Nhắn tin…", maxlength: 500, autocomplete: "off" });
  const form = el("form", { class: "composer", onsubmit: async (e) => {
    e.preventDefault();
    const text = inp.value.trim();
    if (!text) return;
    inp.value = "";
    try { await api("/api/chat/send", { method: "POST", json: { receiver_uid: uid, text } }); await load(); } catch (er) { toast(er.message, "error"); inp.value = text; }
  } }, inp, el("button", { class: "btn primary", type: "submit", "aria-label": "Gửi" }, icon("send")));
  ov._cleanup = () => { clearInterval(timer); S.openThread = null; loadChat(true); };
  ov.append(el("div", { class: "ov-head" }, el("button", { class: "icon-btn", "aria-label": "Quay lại", onclick: () => closeOverlay(ov) }, icon("back")), el("h2", {}, nameOf(uid)), el("span", { style: { width: "40px" } })), el("div", { class: "thread" }, msgs, form));
  load(); timer = setInterval(load, 4000);
}

// ---------------------------------------------------------------- cá nhân
function renderMe() {
  const m = S.me || {};
  const name = fullName(m) || m.username || "Bạn";
  $("#me-name").replaceChildren(name + " ", el("span", { class: "vip-tag" }, icon("crown", "i s"), "VIP"));
  $("#me-username").textContent = m.username ? "@" + m.username : "";
  const a = avatarEl(m.avatar, name, "xl");
  a.id = "me-avatar";
  $("#me-avatar").replaceWith(a);
}
$("#btn-edit-name").addEventListener("click", async () => {
  const m = S.me || {};
  const r = await dialog({ title: "Đổi tên hiển thị", fields: [{ name: "first_name", placeholder: "Tên", value: m.first_name, max: 60 }, { name: "last_name", placeholder: "Họ", value: m.last_name, max: 60 }], ok: "Lưu" });
  if (!r || !r.first_name || !r.last_name) return r && toast("Cần nhập cả tên và họ.", "error");
  try { S.me = await api("/api/me/name", { method: "POST", json: r }); renderMe(); loadAccounts(); toast("Đã đổi tên", "ok"); } catch (e) { toast(e.message, "error"); }
});
$("#btn-edit-avatar").addEventListener("click", () => $("#avatar-pick").click());
$("#avatar-pick").addEventListener("change", async (ev) => {
  const f = ev.target.files[0]; ev.target.value = "";
  if (!f) return;
  const fd = new FormData(); fd.append("image", f, f.name);
  try { S.me = await api("/api/me/avatar", { method: "POST", form: fd }); renderMe(); toast("Đã đổi ảnh đại diện", "ok"); } catch (e) { toast(e.message, "error"); }
});

async function loadMe() {
  try { S.me = await api("/api/me"); renderMe(); } catch { /* đã xử lý ở api() */ }
  renderTools(); loadAccounts(); loadScheduled(); loadMine(); loadStreak();
}
function renderTools() {
  $("#me-tools").replaceChildren(
    el("button", { class: "row-item", onclick: () => { goPage("feed"); loadFeed(true); } }, icon("refresh"), el("div", { class: "meta" }, el("strong", {}, "Đồng bộ toàn bộ Locket"), el("small", {}, "Tải khoảnh khắc của từng người bạn")), icon("chev", "i go")),
    el("button", { class: "row-item", onclick: async () => { try { await api("/api/lock", { method: "POST", json: {} }); } catch { /* khoá */ } showLock(); } }, icon("lock"), el("div", { class: "meta" }, el("strong", {}, "Khoá app ngay"), el("small", {}, "Cần mã khoá để mở lại (tự khoá sau 24 giờ không dùng)")), icon("chev", "i go")));
}
async function loadAccounts() {
  try {
    const st = await api("/api/status");
    S.accounts = st.accounts; S.active = st.active;
    $("#account-list").replaceChildren(...st.accounts.map((a) => el("button", { class: "row-item" + (a.key === st.active ? " active-acct" : ""), onclick: async () => { if (a.key !== st.active) { await api("/api/switch", { method: "POST", json: { key: a.key } }); location.reload(); } } },
      avatarEl(a.avatar, fullName(a) || a.username), el("div", { class: "meta" }, el("strong", {}, fullName(a) || a.username || "Tài khoản"), el("small", {}, a.username ? "@" + a.username : "")),
      el("span", { class: "icon-btn", role: "button", "aria-label": "Đăng xuất", onclick: async (e) => { e.stopPropagation(); if (await dialog({ title: "Đăng xuất?", text: "Token và lịch sử của tài khoản này sẽ bị xoá khỏi server.", ok: "Đăng xuất", danger: true })) { await api("/api/logout", { method: "POST", json: { key: a.key } }); location.reload(); } } }, icon("logout")))),
      el("button", { class: "row-item", onclick: () => { api("/api/switch", { method: "POST", json: { key: "" } }).catch(() => {}); showLogin(true); } }, icon("plus"), el("div", { class: "meta" }, el("strong", {}, "Thêm tài khoản Locket")), icon("chev", "i go")));
  } catch { /* bỏ qua */ }
}
async function loadScheduled() {
  try {
    const { items } = await api("/api/scheduled");
    $("#sched-wrap").classList.toggle("hidden", !items.length);
    $("#sched-list").replaceChildren(...items.map((s2) => el("div", { class: "row-item sched-item" },
      icon(s2.video ? "video" : "image"), el("div", { class: "meta" }, el("strong", {}, s2.caption || (s2.video ? "Video" : "Ảnh")), el("small", { class: s2.status === "failed" ? "err" : "when" }, s2.status === "failed" ? "Lỗi: " + (s2.error || "") : fmtWhen(s2.run_at * 1000))),
      el("button", { class: "icon-btn", "aria-label": "Huỷ", onclick: async () => { try { await api("/api/scheduled/cancel", { method: "POST", json: { id: s2.id } }); loadScheduled(); } catch (e) { toast(e.message, "error"); } } }, icon("trash")))));
  } catch { /* bỏ qua */ }
}
async function loadMine() {
  const grid = $("#my-grid");
  try {
    const [mine, hist] = await Promise.all([api("/api/my-moments").catch(() => ({ items: [] })), api("/api/history").catch(() => ({ items: [] }))]);
    const local = Object.fromEntries(hist.items.filter((h) => h.moment_uid).map((h) => [h.moment_uid, h.image]));
    let items = mine.items.map((m) => ({ ...m, image: local[m.id] || m.image, user: S.me || m.user }));
    if (!items.length) items = hist.items.map((h) => ({ id: h.moment_uid, image: h.image, caption: h.caption, video: "", ts: h.created, user: S.me }));
    S.myStale = false;
    grid.replaceChildren(...(items.length ? items.map((m) => el("button", { class: "tile", onclick: () => openViewer(m, { mine: true }) }, safeUrl(m.image) ? imgEl(safeUrl(m.image), "", { dataset: { fallback: "" } }) : el("div", { class: "ph" }, "🖼️"), m.video ? el("span", { class: "vid" }, "VID") : null)) : [el("div", { class: "empty" }, el("b", {}, "Chưa có bài nào"), "Chụp một khoảnh khắc đầu tiên nhé.")]));
  } catch (e) { grid.replaceChildren(el("div", { class: "empty" }, e.message)); }
}

// ---------------------------------------------------------------- chuỗi (streak) + khôi phục VIP
async function loadStreak() {
  try {
    const s = await api("/api/streak");
    S.streak = s;
    $("#streak-n").textContent = s.current;
    $("#streak-tag").classList.toggle("off", !s.current);
    $("#streak-title").textContent = `Chuỗi ${s.current} ngày` + (s.best > s.current ? ` · kỷ lục ${s.best}` : "");
    $("#streak-sub").textContent = s.broken_days
      ? (s.can_restore ? `Chuỗi bị đứt ${s.broken_days} ngày. Thành viên VIP có thể khôi phục ngay!` : `Chuỗi đã đứt ${s.broken_days} ngày, quá lâu để khôi phục. Đăng bài để bắt đầu chuỗi mới.`)
      : (s.today_done ? "Hôm nay bạn đã đăng rồi. Giữ vững nhé! 💪" : "Hôm nay chưa đăng. Chụp một khoảnh khắc để giữ chuỗi.");
    $("#btn-restore").classList.toggle("hidden", !s.can_restore);
    $("#streak-card").classList.toggle("broken", !!s.broken_days);
  } catch { /* bỏ qua */ }
}
$("#btn-restore").addEventListener("click", async (ev) => {
  await busy(ev.currentTarget, async () => {
    const s = await api("/api/streak/restore", { method: "POST", json: {} });
    toast(`Đã khôi phục chuỗi! Hiện tại ${s.current} ngày 🔥`, "ok");
    const r = $("#btn-restore").getBoundingClientRect();
    burstEmoji("🔥", r.left + r.width / 2, r.top + r.height / 2);
    loadStreak();
  });
});
$("#streak-tag").addEventListener("click", () => { goPage("me"); });
