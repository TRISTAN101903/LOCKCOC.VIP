"use strict";
/* =========================================================================
   boot.js - khởi động, điều hướng, màn khoá, đăng nhập
   ========================================================================= */

let chatTimer = null;
function showView(id) {
  ["view-lock", "view-login", "view-main"].forEach((v) => $("#" + v).classList.toggle("hidden", v !== "view-" + id));
  const sp = $("#splash");
  if (sp) { sp.classList.add("out"); setTimeout(() => sp.remove(), 500); }
}
function showLock() { camStop(); clearInterval(chatTimer); showView("lock"); setTimeout(() => $("#form-lock input").focus(), 100); }
function showLogin(addMode = false) {
  camStop(); showView("login");
  const saved = S.accounts || [];
  $("#saved-accounts").classList.toggle("hidden", !saved.length);
  $("#saved-list").replaceChildren(...saved.map((a) => el("button", { class: "saved-item", onclick: async () => { await api("/api/switch", { method: "POST", json: { key: a.key } }); enterMain(); } },
    avatarEl(a.avatar, fullName(a) || a.username), el("div", { class: "meta" }, el("strong", {}, fullName(a) || a.username || "Tài khoản"), el("small", {}, a.username ? "@" + a.username : "")))));
}
onLocked = showLock;
onAuthLost = async () => { try { const st = await api("/api/status"); S.accounts = st.accounts; } catch { /* bỏ qua */ } showLogin(); };

function goPage(p) {
  if (S.page === "camera" && p !== "camera") camStop();
  S.page = p;
  $$(".page").forEach((pg) => pg.classList.toggle("hidden", pg.dataset.page !== p));
  $$("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.go === p));
  haptic(6);
  if (p === "camera") camStart();
  if (p === "feed" && (S.feedStale || !F.items.length)) loadFeed(false);
  if (p === "friends") loadFriends();
  if (p === "chat") loadChat();
  if (p === "me") loadMe();
}
$$("#nav button").forEach((b) => b.addEventListener("click", () => goPage(b.dataset.go)));
document.addEventListener("visibilitychange", () => { if (document.hidden) camStop(); else if (S.page === "camera" && !$("#view-main").classList.contains("hidden") && !$(".overlay")) camStart(); });

async function enterMain() {
  showView("main");
  S.friends = []; S.unread = null;
  try { S.me = await api("/api/me"); renderMe(); } catch { return; }
  ensureFriends();
  goPage("camera");
  clearInterval(chatTimer);
  chatTimer = setInterval(() => { if (!document.hidden) loadChat(true); }, 20000);
  loadChat(true);
  loadStreak();
}

$("#form-lock").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  await busy(ev.submitter, async () => {
    await api("/api/unlock", { method: "POST", json: { code: new FormData(ev.target).get("code") } });
    ev.target.reset();
    await boot();
  });
});
$("#form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  await busy(ev.submitter, async () => {
    await api("/api/login", { method: "POST", json: { email: fd.get("email"), password: fd.get("password") } });
    ev.target.reset();
    toast("Đăng nhập thành công", "ok");
    await enterMain();
  });
});

async function boot() {
  let st;
  try { st = await api("/api/status"); } catch (e) { if (e.message === "App đang khoá.") return; showView("login"); return toast(e.message, "error"); }
  if (st.locked) return showLock();
  S.accounts = st.accounts; S.active = st.active;
  $("#lib-warning").classList.toggle("hidden", st.lib !== false);
  if (st.active) enterMain(); else showLogin();
}
if ("serviceWorker" in navigator) { /* app dùng được như PWA không cần service worker */ }
boot();
