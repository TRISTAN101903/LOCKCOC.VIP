"use strict";
/* chatplus.js v2 - tin nhắn kiểu mới: tách ngày, bong bóng vàng, thẻ ảnh khoảnh khắc, ✓✓ đã xem,
   nút mắt (đọc ẩn danh), thu hồi tin, gửi khoảnh khắc vào chat */
(function () {
  function toMs(t) {
    if (t == null) return 0;
    if (typeof t === "number") return t < 1e12 ? t * 1000 : t;
    var n = Number(t); if (!isNaN(n) && String(t).trim() !== "") return n < 1e12 ? n * 1000 : n;
    var d = Date.parse(t); return isNaN(d) ? 0 : d;
  }
  function two(n) { return String(n).padStart(2, "0"); }
  function hm(ms) { var d = new Date(ms); return two(d.getHours()) + ":" + two(d.getMinutes()); }
  var WD = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  function dayLabel(ms) {
    var d = new Date(ms), n = new Date(), a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), b = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    var diff = Math.round((b - a) / 864e5);
    if (diff === 0) return "Hôm nay";
    if (diff === 1) return "Hôm qua";
    return WD[d.getDay()] + ", " + two(d.getDate()) + "/" + two(d.getMonth() + 1) + (d.getFullYear() !== n.getFullYear() ? "/" + d.getFullYear() : "");
  }
  var EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|️|‍|\s){1,12}$/u;
  function lsGet(k, f) { try { var v = localStorage.getItem(k); return v == null ? f : v; } catch (e) { return f; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }

  function lightbox(att) {
    var box = el("div", { class: "lb-back", role: "dialog", "aria-modal": "true" });
    var close = function () { box.remove(); };
    box.addEventListener("click", function (e) { if (e.target === box || e.target.closest(".lb-x")) close(); });
    var media;
    if (att.video && safeUrl(att.video)) { media = el("video", { src: att.video, controls: "", playsinline: "", autoplay: "" }); }
    else { media = el("img", { src: safeUrl(att.image), alt: "Khoảnh khắc", referrerpolicy: "no-referrer" }); }
    box.append(media, el("button", { class: "lb-x icon-btn", type: "button", "aria-label": "Đóng" }, icon("close")));
    document.body.appendChild(box);
  }
  function momentCard(att) {
    var u = safeUrl(att.image), v = safeUrl(att.video);
    var c = el("button", { class: "m-card" + (u || v ? "" : " empty"), type: "button" });
    if (u) { var im = el("img", { src: u, alt: "Khoảnh khắc", loading: "lazy", referrerpolicy: "no-referrer" }); im.addEventListener("error", function () { c.classList.add("empty"); im.remove(); c.append(el("span", {}, "Khoảnh khắc")); }); c.append(im); }
    else c.append(el("span", {}, v ? "Video" : "Khoảnh khắc"));
    if (v) c.append(el("i", { class: "m-play" }, icon("play")));
    if (u || v) c.addEventListener("click", function () { lightbox(att); });
    return c;
  }

  openThread = function (uid) {
    var ov = openOverlay("thread-ov");
    S.openThread = uid;
    var msgs = el("div", { class: "msgs" }), sig = "", timer = null, items = [], me = null, cid = null, otherRead = 0, pend = [], first = true;
    var ghost = lsGet("lc_ghost", "1") === "1";
    var jump = el("button", { class: "jump hidden", type: "button", "aria-label": "Xuống cuối" }, icon("chev"));
    var nearBottom = function () { return msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 90; };
    jump.addEventListener("click", function () { msgs.scrollTo({ top: msgs.scrollHeight, behavior: "smooth" }); });
    msgs.addEventListener("scroll", function () { jump.classList.toggle("hidden", nearBottom()); }, { passive: true });

    function rowActions(m, node) {
      var t = null, fired = false;
      function open() {
        fired = true; haptic(14);
        var rows = [];
        if (m.text) rows.push(el("button", { class: "row-item", type: "button", onclick: function () { sh.close(); (navigator.clipboard ? navigator.clipboard.writeText(m.text) : Promise.reject()).then(function () { toast("Đã sao chép", "ok", 1400); }, function () { toast("Không sao chép được", "error"); }); } }, icon("list"), el("div", { class: "meta" }, el("strong", {}, "Sao chép"))));
        if (m.mine && m.id && cid) rows.push(el("button", { class: "row-item", type: "button", onclick: async function () {
          sh.close();
          try { await api("/api/chat/delete", { method: "POST", json: { cid: cid, id: m.id } }); toast("Đã thu hồi tin nhắn", "ok", 1600); sig = ""; load(); } catch (er) { toast(er.message, "error"); }
        } }, icon("trash"), el("div", { class: "meta" }, el("strong", {}, "Thu hồi tin nhắn"), el("small", {}, "Xoá khỏi cuộc trò chuyện của cả hai"))));
        if (!rows.length) return;
        var sh = bottomSheet(...rows);
      }
      node.addEventListener("pointerdown", function () { fired = false; t = setTimeout(open, 480); });
      ["pointerup", "pointerleave", "pointercancel", "pointermove"].forEach(function (ev) { node.addEventListener(ev, function () { clearTimeout(t); }); });
      node.addEventListener("contextmenu", function (e) { e.preventDefault(); if (!fired) open(); });
    }
    function bubble(m) {
      var wrap = el("div", { class: "m-wrap" + (m.mine ? " me" : "") });
      if (m.attach) wrap.append(momentCard(m.attach));
      if (m.text) {
        var big = EMOJI_ONLY.test(m.text) && m.text.length <= 12;
        wrap.append(el("div", { class: "bubble" + (m.mine ? " me" : "") + (big ? " big" : "") + (m.p ? (m.p.failed ? " fail" : " pending") : "") }, m.text));
      }
      if (m.reactions && m.reactions.length) wrap.append(el("div", { class: "m-react" + (m.mine ? " me" : "") }, m.reactions.map(function (r) { return r.emoji; }).join(" ")));
      if (!m.p) rowActions(m, wrap);
      return wrap;
    }
    function render() {
      var stick = nearBottom() || first, out = [], lastDay = "";
      var all = items.map(function (m) { return Object.assign({}, m, { ms: toMs(m.time) }); });
      pend.forEach(function (p) { all.push({ text: p.text, mine: true, ms: p.ms, p: p, attach: p.moment ? { image: p.thumb || "", moment: p.moment } : null }); });
      all.forEach(function (m, i) {
        var dl = m.ms ? dayLabel(m.ms) : "";
        if (dl && dl !== lastDay) { out.push(el("div", { class: "day-sep" }, el("span", {}, dl))); lastDay = dl; }
        var next = all[i + 1];
        var lastInGroup = !next || next.mine !== m.mine || !m.ms || !next.ms || next.ms - m.ms > 300000 || (next.ms && dayLabel(next.ms) !== dl);
        var node = bubble(m);
        if (m.p && m.p.failed) node.addEventListener("click", function () { m.p.failed = false; deliver(m.p); render(); });
        out.push(node);
        if (lastInGroup && (m.ms || m.p)) {
          var meta = el("div", { class: "msg-time" + (m.mine ? " me" : "") });
          if (m.p) meta.textContent = m.p.failed ? "Gửi lỗi · chạm để gửi lại" : "Đang gửi…";
          else {
            meta.append(hm(m.ms));
            if (m.mine) { var seen = otherRead && m.ms <= otherRead; meta.append(el("span", { class: "tick" + (seen ? " seen" : "") }, seen ? "✓✓" : "✓")); }
          }
          out.push(meta);
        }
      });
      msgs.replaceChildren.apply(msgs, out);
      if (stick) { msgs.scrollTop = msgs.scrollHeight; first = false; }
    }
    async function load() {
      try {
        var d = await api("/api/chat/messages/" + encodeURIComponent(uid));
        me = d.me; cid = d.cid || cid; otherRead = toMs(d.other_read);
        var s2 = JSON.stringify([otherRead, d.items.map(function (m) { return [m.id, m.text, m.attach && (m.attach.image || m.attach.moment), (m.reactions || []).length]; })]);
        if (s2 === sig) return;
        var hadAny = sig !== "", prevN = items.length;
        sig = s2; items = d.items;
        var last = d.items[d.items.length - 1];
        if (hadAny && d.items.length > prevN && last && !last.mine) { lcSfx.pop(); haptic(10); }
        render();
        api("/api/chat/read", { method: "POST", json: { other_uid: uid, ghost: ghost } }).catch(function () {});
      } catch (e) { /* lỗi tạm thời */ }
    }
    async function deliver(p) {
      try {
        await api("/api/chat/send", { method: "POST", json: p.moment ? { receiver_uid: uid, moment_uid: p.moment, text: p.text || "" } : { receiver_uid: uid, text: p.text } });
        pend = pend.filter(function (x) { return x !== p; }); sig = ""; await load(); render();
      } catch (er) { p.failed = true; toast(er.message, "error"); render(); }
    }
    function send(text, moment, thumb) {
      text = (text || "").trim(); if (!text && !moment) return;
      var p = { text: text, ms: Date.now(), moment: moment || "", thumb: thumb || "" }; pend.push(p); render(); lcSfx.send(); haptic(8);
      deliver(p);
    }

    function pickMoment() {
      var grid = el("div", { class: "mp-grid" }, el("small", { class: "muted" }, "Đang tải ảnh của bạn…"));
      var sh = bottomSheet(el("h3", { style: { margin: "0 0 6px" } }, "Gửi khoảnh khắc vào chat"), grid);
      api("/api/sync-all/items?who=mine&limit=36").then(function (d) {
        grid.replaceChildren();
        if (!d.items.length) { grid.append(el("small", { class: "muted" }, "Chưa có ảnh nào. Vào LockCOC Plus → Thư viện ảnh để đồng bộ trước.")); return; }
        d.items.forEach(function (m) {
          var u = safeUrl(m.image); if (!u) return;
          grid.append(el("button", { class: "mp-it", type: "button", onclick: function () { sh.close(); send("", m.id, u); } }, el("img", { src: u, alt: "", loading: "lazy", referrerpolicy: "no-referrer" })));
        });
      }).catch(function (e) { grid.replaceChildren(el("small", { class: "muted" }, e.message)); });
    }

    var inp = el("input", { type: "text", placeholder: "Nhắn tin…", maxlength: 500, autocomplete: "off", enterkeyhint: "send" });
    var attachBtn = el("button", { class: "btn c-attach", type: "button", "aria-label": "Gửi khoảnh khắc", onclick: pickMoment }, icon("image"));
    var form = el("form", { class: "composer c2", onsubmit: function (e) { e.preventDefault(); var t = inp.value; inp.value = ""; send(t); } },
      attachBtn, inp, el("button", { class: "btn primary c-send", type: "submit", "aria-label": "Gửi" }, icon("send")));
    var f = S.friendMap[uid] || {};
    var name = nameOf(uid);
    var eye = el("button", { class: "icon-btn eye" + (ghost ? " on" : ""), type: "button", "aria-label": "Đọc ẩn danh" }, icon("eye"));
    eye.addEventListener("click", function () {
      ghost = !ghost; lsSet("lc_ghost", ghost ? "1" : "0"); eye.classList.toggle("on", ghost);
      toast(ghost ? "Đọc ẩn danh: Bật. Người kia không thấy bạn đã xem." : "Đọc ẩn danh: Tắt. Người kia sẽ thấy “đã xem”.", "msg", 2600);
    });
    var more = el("button", { class: "icon-btn", type: "button", "aria-label": "Thêm" }, "⋮");
    more.addEventListener("click", function () {
      var sh = bottomSheet(
        el("button", { class: "row-item", type: "button", onclick: function () { sh.close(); eye.click(); } }, icon("eye"), el("div", { class: "meta" }, el("strong", {}, "Đọc ẩn danh"), el("small", {}, ghost ? "Đang bật" : "Đang tắt"))),
        el("button", { class: "row-item", type: "button", onclick: function () { sh.close(); sig = ""; load(); } }, icon("refresh"), el("div", { class: "meta" }, el("strong", {}, "Tải lại cuộc trò chuyện"))),
        el("button", { class: "row-item", type: "button", onclick: function () { sh.close(); msgs.scrollTo({ top: msgs.scrollHeight, behavior: "smooth" }); } }, icon("chev"), el("div", { class: "meta" }, el("strong", {}, "Xuống tin mới nhất"))));
    });
    ov._cleanup = function () { clearInterval(timer); S.openThread = null; loadChat(true); };
    ov.append(
      el("div", { class: "ov-head chat-head" },
        el("button", { class: "icon-btn", "aria-label": "Quay lại", onclick: function () { closeOverlay(ov); } }, icon("back")),
        avatarEl(f.avatar, name, "ring"), el("div", { class: "ch-meta" }, el("strong", {}, name), el("small", {}, f.username ? "@" + f.username : "")),
        eye, more),
      msgs, jump, form);
    load(); timer = setInterval(function () { if (!document.hidden) load(); }, 4000);
  };

  /* ---- danh sách hội thoại: ô tìm kiếm ---- */
  var list = document.getElementById("conv-list");
  if (list && !document.querySelector(".conv-search")) {
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
