"use strict";
/* chatplus.js - tin nhắn mới: nhóm theo ngày, giờ, gửi tức thì, biểu cảm nhanh, âm báo, tìm kiếm */
(function () {
  function toMs(t) {
    if (t == null) return 0;
    if (typeof t === "number") return t < 1e12 ? t * 1000 : t;
    var n = Number(t); if (!isNaN(n) && String(t).trim() !== "") return n < 1e12 ? n * 1000 : n;
    var d = Date.parse(t); return isNaN(d) ? 0 : d;
  }
  function two(n) { return String(n).padStart(2, "0"); }
  function hm(ms) { var d = new Date(ms); return two(d.getHours()) + ":" + two(d.getMinutes()); }
  function dayLabel(ms) {
    var d = new Date(ms), n = new Date(), a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), b = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    var diff = Math.round((b - a) / 864e5);
    return diff === 0 ? "Hôm nay" : diff === 1 ? "Hôm qua" : two(d.getDate()) + "/" + two(d.getMonth() + 1) + "/" + d.getFullYear();
  }
  var EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s){1,12}$/u;
  var QUICK = ["❤️", "😂", "😮", "🔥", "👍", "🥹"];

  openThread = function (uid) {
    var ov = openOverlay("thread-ov");
    S.openThread = uid;
    var msgs = el("div", { class: "msgs" }), sig = "", timer = null, serverItems = [], me = null, pend = [], first = true;
    var jump = el("button", { class: "jump hidden", type: "button", "aria-label": "Xuống cuối" }, icon("chev"));
    var nearBottom = function () { return msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 90; };
    jump.addEventListener("click", function () { msgs.scrollTo({ top: msgs.scrollHeight, behavior: "smooth" }); });
    msgs.addEventListener("scroll", function () { jump.classList.toggle("hidden", nearBottom()); }, { passive: true });

    function bubbleNode(text, mine, cls) {
      return el("div", { class: "bubble" + (mine ? " me" : "") + (EMOJI_ONLY.test(text) && text.length <= 12 ? " big" : "") + (cls ? " " + cls : "") }, text);
    }
    function render() {
      var stick = nearBottom() || first, out = [], lastDay = "", prev = null;
      var all = serverItems.map(function (m) { return { text: m.text, mine: !!(m.mine || (me && m.sender === me) || (m.sender && String(m.sender) !== String(uid))), ms: toMs(m.time) }; });
      pend.forEach(function (p) { all.push({ text: p.text, mine: true, ms: p.ms, p: p }); });
      all.forEach(function (m, i) {
        var dl = m.ms ? dayLabel(m.ms) : "";
        if (dl && dl !== lastDay) { out.push(el("div", { class: "day-sep" }, el("span", {}, dl))); lastDay = dl; prev = null; }
        var next = all[i + 1];
        var lastInGroup = !next || next.mine !== m.mine || !m.ms || !next.ms || next.ms - m.ms > 300000 || (next.ms && dayLabel(next.ms) !== dl);
        var node = bubbleNode(m.text, m.mine, m.p ? (m.p.failed ? "fail" : "pending") : "");
        if (m.p && m.p.failed) node.addEventListener("click", function () { m.p.failed = false; deliver(m.p); render(); });
        out.push(node);
        if (lastInGroup && (m.ms || m.p)) out.push(el("div", { class: "msg-time" + (m.mine ? " me" : "") }, m.p ? (m.p.failed ? "Gửi lỗi · chạm để gửi lại" : "Đang gửi…") : hm(m.ms)));
        prev = m;
      });
      msgs.replaceChildren.apply(msgs, out);
      if (stick) { msgs.scrollTop = msgs.scrollHeight; first = false; }
    }
    async function load() {
      try {
        var d = await api("/api/chat/messages/" + encodeURIComponent(uid));
        me = d.me;
        var s2 = JSON.stringify(d.items.map(function (m) { return [m.id, m.text]; }));
        if (s2 === sig) return;
        var hadAny = sig !== "", prevN = serverItems.length;
        sig = s2; serverItems = d.items;
        var last = d.items[d.items.length - 1];
        if (hadAny && d.items.length > prevN && last && !(last.mine || (me && last.sender === me))) { lcSfx.pop(); haptic(10); }
        render();
        api("/api/chat/read", { method: "POST", json: { other_uid: uid } }).catch(function () {});
      } catch (e) { /* lỗi tạm thời */ }
    }
    async function deliver(p) {
      try { await api("/api/chat/send", { method: "POST", json: { receiver_uid: uid, text: p.text } }); pend = pend.filter(function (x) { return x !== p; }); sig = ""; await load(); render(); }
      catch (er) { p.failed = true; toast(er.message, "error"); render(); }
    }
    function send(text) {
      text = (text || "").trim(); if (!text) return;
      var p = { text: text, ms: Date.now() }; pend.push(p); render(); lcSfx.send(); haptic(8);
      deliver(p);
    }

    var inp = el("input", { type: "text", placeholder: "Nhắn tin…", maxlength: 500, autocomplete: "off", enterkeyhint: "send" });
    var form = el("form", { class: "composer", onsubmit: function (e) { e.preventDefault(); var t = inp.value; inp.value = ""; send(t); } },
      inp, el("button", { class: "btn primary", type: "submit", "aria-label": "Gửi" }, icon("send")));
    var quick = el("div", { class: "quick-react" }, ...QUICK.map(function (e) { return el("button", { type: "button", onclick: function () { send(e); } }, e); }));
    var f = S.friendMap[uid] || {};
    var name = nameOf(uid);
    ov._cleanup = function () { clearInterval(timer); S.openThread = null; loadChat(true); };
    ov.append(
      el("div", { class: "ov-head chat-head" },
        el("button", { class: "icon-btn", "aria-label": "Quay lại", onclick: function () { closeOverlay(ov); } }, icon("back")),
        avatarEl(f.avatar, name), el("div", { class: "ch-meta" }, el("strong", {}, name), el("small", {}, f.username ? "@" + f.username : "")),
        el("span", { style: { width: "40px" } })),
      msgs, jump, quick, form);
    load(); timer = setInterval(function () { if (!document.hidden) load(); }, 3000);
  };

  /* ---- danh sách hội thoại: ô tìm kiếm ---- */
  var list = document.getElementById("conv-list");
  if (list) {
    var q = el("input", { class: "conv-search", type: "search", placeholder: "Tìm cuộc trò chuyện…", autocomplete: "off" });
    list.parentNode.insertBefore(q, list);
    var applyF = function () {
      var v = q.value.trim().toLowerCase();
      Array.prototype.forEach.call(list.children, function (r) { r.classList.toggle("hidden", !!v && r.textContent.toLowerCase().indexOf(v) < 0); });
    };
    q.addEventListener("input", applyF);
    new MutationObserver(applyF).observe(list, { childList: true });
  }
})();
