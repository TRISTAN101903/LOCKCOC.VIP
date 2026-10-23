"use strict";
/* =========================================================================
   core.js - tiện ích dùng chung, API, hiệu ứng (toast, ripple, burst cảm xúc)
   ========================================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = "http://www.w3.org/2000/svg";
const MAX_REC = 60; // giây quay tối đa

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "style") Object.assign(e.style, v);
    else if (k === "dataset") Object.assign(e.dataset, v);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}
function icon(name, cls = "i") {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("class", cls);
  const u = document.createElementNS(NS, "use");
  u.setAttribute("href", "#i-" + name);
  s.append(u);
  return s;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const haptic = (p = 10) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* bỏ qua */ } };
const safeUrl = (u) => (typeof u === "string" && /^(https:\/\/|\/api\/media\/)/i.test(u) ? u : "");
const fullName = (u) => [u && u.first_name, u && u.last_name].filter(Boolean).join(" ").trim();
const shortUid = (u) => (u ? String(u).slice(0, 6) + "…" : "");
const pad2 = (n) => String(n).padStart(2, "0");
const hhmm = (d = new Date()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const fmtWhen = (ms) => { const d = new Date(ms); return `${hhmm(d)} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };

function getPref(k, def) { try { return localStorage.getItem("lc_" + k) ?? def; } catch { return def; } }
function setPref(k, v) { try { localStorage.setItem("lc_" + k, v); } catch { /* bỏ qua */ } }

function timeAgo(v) {
  if (v == null) return "";
  let ms = null;
  if (typeof v === "number") ms = v < 1e12 ? v * 1000 : v;
  else if (typeof v === "string") { const t = Date.parse(v); ms = isNaN(t) ? (/^\d+$/.test(v) ? (+v < 1e12 ? +v * 1000 : +v) : null) : t; }
  else if (typeof v === "object") { const sec = v._seconds ?? v.seconds; if (sec != null) ms = sec * 1000; }
  if (ms == null) return "";
  const d = Math.max(0, (Date.now() - ms) / 1000);
  if (d < 60) return "vừa xong";
  if (d < 3600) return `${Math.floor(d / 60)} phút trước`;
  if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
  if (d < 604800) return `${Math.floor(d / 86400)} ngày trước`;
  return new Date(ms).toLocaleDateString("vi-VN");
}

// ------------------------------------------------------------------ toast
function toast(msg, type = "ok", ms = 3600) {
  const t = el("div", { class: `toast ${type}`, role: "status" },
    el("span", { class: "ti" }, icon(type === "error" ? "close" : type === "msg" ? "chat" : "check")),
    el("span", {}, msg));
  const close = () => { t.classList.add("out"); setTimeout(() => t.remove(), 300); };
  t.addEventListener("click", close);
  $("#toasts").prepend(t);
  while ($("#toasts").children.length > 3) $("#toasts").lastChild.remove();
  const timer = setTimeout(close, ms);
  if (type === "error") haptic([20, 40, 20]); else haptic(12);
  return { close: () => { clearTimeout(timer); close(); } };
}

// ------------------------------------------------------------------ hiệu ứng chạm (ripple)
document.addEventListener("pointerdown", (ev) => {
  const host = ev.target.closest(".btn,.chip,.icon-btn,.round-btn,.row-item,.react-btn,.emoji-b,.swatch,.saved-item,.seg button,.row-card,.pick-row");
  if (!host || host.disabled) return;
  const r = host.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const rp = el("span", { class: "ripple", style: { left: ev.clientX - r.left + "px", top: ev.clientY - r.top + "px", width: size + "px", height: size + "px" } });
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.append(rp);
  setTimeout(() => rp.remove(), 700);
  if (!host.classList.contains("swatch")) haptic(6);
}, { passive: true });

// ------------------------------------------------------------------ API
let onAuthLost = () => {};
let onLocked = () => {};
async function api(path, opts = {}) {
  const init = { method: opts.method || "GET", headers: { "X-LockCOC": "1" }, credentials: "same-origin" };
  if (opts.json !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(opts.json); }
  if (opts.form) init.body = opts.form;
  let res;
  try { res = await fetch(path, init); } catch { throw new Error("Không kết nối được tới server."); }
  let data = null;
  try { data = await res.json(); } catch { /* không phải JSON */ }
  if (res.status === 423) { onLocked(); throw new Error("App đang khoá."); }
  if (res.status === 401 && path !== "/api/login") { onAuthLost(); throw new Error((data && data.error) || "Cần đăng nhập lại."); }
  if (!res.ok) throw new Error((data && data.error) || `Lỗi ${res.status}`);
  return data;
}
async function busy(btn, fn) {
  if (btn) btn.classList.add("loading");
  try { return await fn(); } catch (e) { toast(e.message, "error"); } finally { if (btn) btn.classList.remove("loading"); }
}

// ------------------------------------------------------------------ trạng thái chung
const S = {
  accounts: [], active: null, me: null, page: "camera",
  friends: [], friendMap: {}, noteTypes: null, unread: null, openThread: null,
};

async function ensureFriends(force = false) {
  if (S.friends.length && !force) return;
  try {
    const { items } = await api("/api/friends");
    S.friends = items;
    S.friendMap = Object.fromEntries(items.filter((f) => f.uid).map((f) => [f.uid, f]));
  } catch { /* bỏ qua */ }
}
async function ensureNoteTypes() {
  if (S.noteTypes) return S.noteTypes;
  try { S.noteTypes = (await api("/api/note-types")).items.filter((n) => !NOTE_HIDDEN.has(n)); } catch { S.noteTypes = []; }
  return S.noteTypes;
}
const nameOf = (uid) => { const f = S.friendMap[uid]; return f ? (fullName(f) || f.username || "Bạn bè") : "Người dùng " + shortUid(uid); };

// ------------------------------------------------------------------ ảnh / avatar
function imgEl(src, alt = "", extra = {}) {
  const i = el("img", { src, alt, loading: "lazy", referrerpolicy: "no-referrer", ...extra });
  i.addEventListener("error", () => {
    if (i.dataset.fallback && i.src !== i.dataset.fallback) { i.src = i.dataset.fallback; delete i.dataset.fallback; }
    else i.replaceWith(el("div", { class: "ph" }, "🖼️"));
  });
  return i;
}
function avatarEl(url, name, cls = "") {
  const a = el("div", { class: "avatar " + cls });
  const letter = () => { a.replaceChildren(); a.textContent = (name || "?").trim().charAt(0).toUpperCase() || "?"; };
  const u = safeUrl(url);
  if (u) { const i = el("img", { src: u, alt: "", loading: "lazy", referrerpolicy: "no-referrer" }); i.addEventListener("error", letter); a.append(i); }
  else letter();
  return a;
}

// ------------------------------------------------------------------ dữ liệu caption
const NOTE_LABELS = {
  DANG_BAN_TUONG_TU: "Đang bận tương tư", REP_TIN_NHAN_DI: "Rep tin nhắn đi", MUON_DUOC_OM: "Muốn được ôm",
  HOI_BI_NHO: "Hơi bị nhớ", DANG_GHEN: "Đang ghen", CHAY_NGAY_DI: "Chạy ngay đi", DEADLINE_RUOT: "Deadline rượt",
  DOC_SO_TAI_KHOAN: "Đọc số tài khoản", OACH_XA_LACH: "Oạch xà lạch", OVERTHINKING_VAI_CHUONG: "Overthinking vài chương",
  FEELING_CUTE: "Feeling cute", PARTY_TIME: "Party time", GOOD_MORNING: "Good morning", GOODNIGHT: "Goodnight",
  OOTD: "OOTD", MISS_YOU: "Miss you", COFFEE_TIME: "Coffee time", MIXUE_TIME: "Mixue time",
};
const NOTE_HIDDEN = new Set(["STANDARD", "REVIEW", "MUSIC", "LOCATION", "WEATHER", "TIME", "STREAK", "POLL", "COLOR_PALETTE"]);
function noteLabel(n) {
  if (NOTE_LABELS[n]) return NOTE_LABELS[n];
  const t = n.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const GRADS = [
  { n: "Hoàng hôn", c: ["#FF512F", "#DD2476"], t: "#FFFFFF" },
  { n: "Biển", c: ["#2193B0", "#6DD5ED"], t: "#08222B" },
  { n: "Bạc hà", c: ["#11998E", "#38EF7D"], t: "#05231A" },
  { n: "Tím mộng", c: ["#8E2DE2", "#4A00E0"], t: "#FFFFFF" },
  { n: "Đào", c: ["#FFECD2", "#FCB69F"], t: "#3A2113" },
  { n: "Hồng", c: ["#F6A5C0", "#E86B9A"], t: "#3A0F20" },
  { n: "Vàng locket", c: ["#FBE3A0", "#C8902F"], t: "#2A1C05" },
  { n: "Đêm", c: ["#232526", "#414345"], t: "#FFFFFF" },
  { n: "Nắng", c: ["#F7971E", "#FFD200"], t: "#2A1A00" },
  { n: "Rêu", c: ["#134E5E", "#71B280"], t: "#FFFFFF" },
  { n: "Cherry", c: ["#EB3349", "#F45C43"], t: "#FFFFFF" },
  { n: "Lavender", c: ["#C9B6FF", "#8EC5FC"], t: "#1F1840" },
  { n: "Nửa đêm", c: ["#0F2027", "#2C5364"], t: "#FFFFFF" },
  { n: "Kẹo", c: ["#FF9A9E", "#FECFEF"], t: "#4A1230" },
  { n: "Neon", c: ["#00F5A0", "#00D9F5"], t: "#031B1A" },
  { n: "Rượu vang", c: ["#4B1248", "#F0C27B"], t: "#FFFFFF" },
];
const gradIndex = (name) => GRADS.findIndex((g) => g.n === name);
const EMOJIS = ["", "✨", "💛", "🔥", "☕", "🌅", "🎧", "📍", "🥹", "😎", "🍜", "🌧️", "🎂", "💭"];
const REACTS = ["❤️", "🔥", "😂", "😮", "😢", "👍"];
const FX = [
  { id: "snow", n: "Tuyết rơi", e: "❄️" }, { id: "sparkle", n: "Lấp lánh", e: "✨" }, { id: "heart", n: "Trái tim", e: "💗" },
  { id: "leaf", n: "Lá rơi", e: "🍂" }, { id: "party", n: "Pháo giấy", e: "🎉" }, { id: "star", n: "Sao", e: "⭐" },
];

// Văn bản + kiểu hiển thị của viên caption (dùng chung editor & studio)
function pillText(ed) { return (ed.icon ? ed.icon + " " : "") + (ed.caption || (ed.note ? noteLabel(ed.note) : "")); }
function applyPill(pill, ed) {
  const text = pillText(ed);
  pill.classList.toggle("hidden", !text);
  pill.textContent = text;
  const g = ed.grad != null ? GRADS[ed.grad] : null;
  pill.style.background = g ? `linear-gradient(135deg, ${g.c[0]}, ${g.c[1]})` : "";
  pill.style.color = g ? g.t : "";
  pill.style.backdropFilter = g ? "none" : "";
  pill.style.webkitBackdropFilter = g ? "none" : "";
}
function applyFx(layer, fxId) {
  layer.replaceChildren();
  const f = FX.find((x) => x.id === fxId);
  if (!f) return;
  for (let i = 0; i < 22; i++) {
    const p = el("span", { class: "fx-p" }, f.e);
    p.style.setProperty("--x", rand(0, 96) + "%");
    p.style.setProperty("--sz", rand(11, 24) + "px");
    p.style.setProperty("--d", rand(4.5, 9) + "s");
    p.style.setProperty("--dl", -rand(0, 9) + "s");
    p.style.setProperty("--dx", rand(-70, 70) + "px");
    layer.append(p);
  }
}

// ------------------------------------------------------------------ overlay / dialog / sheet
function openOverlay(cls = "") {
  const o = el("div", { class: "overlay " + cls });
  $("#overlay-root").append(o);
  return o;
}
function closeOverlay(o) {
  if (!o || o._closing) return;
  o._closing = true;
  if (o._cleanup) o._cleanup();
  o.classList.add("out");
  setTimeout(() => { o.remove(); if (o._after) o._after(); }, 300);
}
function bottomSheet(...kids) {
  const root = $("#overlay-root");
  const close = () => { scrim.remove(); sheet.remove(); };
  const scrim = el("div", { class: "scrim", onclick: close });
  const sheet = el("div", { class: "sheet-pick col" }, ...kids);
  root.append(scrim, sheet);
  return { close, sheet };
}
function dialog({ title, text, fields = [], ok = "OK", cancel = "Huỷ", danger = false }) {
  return new Promise((resolve) => {
    const root = $("#overlay-root");
    const inputs = fields.map((f) => el("input", { type: "text", name: f.name, placeholder: f.placeholder || "", value: f.value || "", maxlength: f.max || 200, autocomplete: "off" }));
    const done = (val) => { scrim.remove(); box.remove(); resolve(val); };
    const scrim = el("div", { class: "scrim", onclick: () => done(null) });
    const okBtn = el("button", { class: "btn small " + (danger ? "danger" : "primary"), onclick: () => done(fields.length ? Object.fromEntries(fields.map((f, i) => [f.name, inputs[i].value.trim()])) : true) }, el("span", { class: "btn-label" }, ok));
    const box = el("div", { class: "dialog", role: "dialog" },
      el("h3", {}, title), text ? el("p", { class: "muted", style: { margin: 0 } }, text) : null, ...inputs,
      el("div", { class: "btns" }, el("button", { class: "btn small", onclick: () => done(null) }, el("span", { class: "btn-label" }, cancel)), okBtn));
    root.append(scrim, box);
    if (inputs[0]) setTimeout(() => inputs[0].focus(), 120);
  });
}

// ------------------------------------------------------------------ hiệu ứng cảm xúc bay (liquid)
function burstEmoji(emoji, x, y) {
  const body = document.body;
  const ring = el("div", { class: "burst-ring", style: { left: x + "px", top: y + "px" } });
  const hero = el("div", { class: "burst-hero", style: { left: x + "px", top: y + "px" } }, emoji);
  body.append(ring, hero);
  setTimeout(() => { ring.remove(); hero.remove(); }, 1200);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
    const dist = rand(70, 190);
    const p = el("div", { class: "burst-p", style: { left: x + "px", top: y + "px", animationDelay: rand(0, 0.14) + "s" } }, emoji);
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist - 20 + "px");
    p.style.setProperty("--rot", rand(-300, 300) + "deg");
    p.style.setProperty("--s", rand(15, 34) + "px");
    p.style.setProperty("--t", rand(0.8, 1.3) + "s");
    body.append(p);
    setTimeout(() => p.remove(), 1700);
  }
  haptic([10, 30, 14]);
}

// bảng chọn cảm xúc nổi (kính) phía trên nút bấm
function reactPop(anchor, onPick) {
  $$(".react-pop").forEach((n) => n.remove());
  const pop = el("div", { class: "react-pop" }, ...REACTS.map((e, i) => {
    const b = el("button", { "aria-label": e, onclick: (ev) => { const r = ev.currentTarget.getBoundingClientRect(); close(); onPick(e, r.left + r.width / 2, r.top + r.height / 2); } }, e);
    b.style.setProperty("--i", i);
    return b;
  }));
  const close = () => { pop.remove(); document.removeEventListener("pointerdown", away, true); };
  const away = (ev) => { if (!pop.contains(ev.target)) close(); };
  document.body.append(pop);
  const r = anchor.getBoundingClientRect(), w = pop.offsetWidth;
  pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  pop.style.top = Math.max(8, r.top - 62) + "px";
  setTimeout(() => document.addEventListener("pointerdown", away, true), 0);
}
