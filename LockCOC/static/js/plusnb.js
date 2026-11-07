"use strict";
/* plusnb.js - mục ☆ Plus (thay Chat trên thanh dưới): Sổ lưu niệm, Lịch kỷ niệm và mọi chức năng LockCOC gom về một chỗ */
(function () {
  if (typeof goPage !== "function" || typeof el !== "function" || typeof openOverlay !== "function") return;
  var page = document.getElementById("page-plus"); if (!page) return;
  var STICK = ["⭐", "💛", "📌", "🌼", "✨", "🎀", "🍀", "🌙", "🍓", "☁️"];
  var TPL = [
    [[5, 4, 54, -4], [47, 12, 48, 5], [6, 47, 46, 3], [49, 55, 44, -6]],
    [[30, 3, 56, 3], [4, 33, 46, -5], [50, 38, 46, 6], [24, 66, 42, -2]],
    [[4, 5, 46, -6], [50, 3, 46, 4], [27, 37, 50, -2], [8, 69, 40, 5]]
  ];
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(seed) { var x = (seed >>> 0) || 1; return function () { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dstr(ts) { var d = new Date((ts || 0) * 1000); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function isMine(m) { return !!(m._mine || (m.user && typeof S !== "undefined" && S.me && m.user.uid && m.user.uid === S.me.uid)); }
  function nameOf2(m) { var u = m.user || {}; return isMine(m) ? "Tôi" : ((u.first_name || u.username || "Bạn").toString().slice(0, 14)); }

  /* ---------- dữ liệu ---------- */
  var cache = { items: null, at: 0 };
  async function loadAll(force) {
    if (cache.items && !force && Date.now() - cache.at < 120000) return cache.items;
    var mine = [], fr = [];
    try { var d = await api("/api/my-moments"); mine = (d.items || []).map(function (m) { return Object.assign({}, m, { user: (typeof S !== "undefined" && S.me) || m.user, _mine: true }); }); } catch (e) { /* bỏ qua */ }
    try { if (typeof F !== "undefined" && F.items && F.items.length) fr = F.items; else { var f = await api("/api/feed"); fr = f.items || []; } } catch (e) { /* bỏ qua */ }
    var seen = {}, all = [];
    mine.concat(fr).forEach(function (m) { if (!m || !m.id || seen[m.id] || !safeUrl(m.image)) return; seen[m.id] = 1; all.push(m); });
    all.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    cache = { items: all, at: Date.now() };
    return all;
  }

  /* ---------- Sổ lưu niệm ---------- */
  function polaroid(m, slot, idx, pageSeed) {
    var r = rnd(hash(m.id) ^ pageSeed), jx = (r() - .5) * 4, jy = (r() - .5) * 4, jr = (r() - .5) * 5;
    var depth = (0.6 + r() * 0.9).toFixed(2), tapeR = ((r() - .5) * 26).toFixed(1), stick = r() < 0.42 ? STICK[Math.floor(r() * STICK.length)] : "";
    var ph = el("div", { class: "nb-ph" });
    ph.style.left = Math.max(0, slot[0] + jx) + "%"; ph.style.top = Math.max(0, slot[1] + jy) + "%"; ph.style.width = slot[2] + "%";
    ph.style.setProperty("--r", (slot[3] + jr).toFixed(1)); ph.style.setProperty("--d", depth); ph.style.setProperty("--i", idx);
    var card = el("button", { class: "nb-card", type: "button", "aria-label": "Mở ảnh" },
      el("span", { class: "nb-img" }, imgEl(safeUrl(m.image)), m.video ? el("span", { class: "nb-play" }, "▶") : null),
      el("span", { class: "nb-cap" }, el("b", {}, (m.caption || dstr(m.ts)).toString().slice(0, 34)), el("small", {}, nameOf2(m) + " · " + dstr(m.ts))));
    card.addEventListener("click", function () { openViewer(m, { mine: isMine(m) }); });
    var tape = el("i", { class: "nb-tape" }); tape.style.setProperty("--tr", tapeR + "deg");
    card.append(tape);
    if (stick) { var st = el("span", { class: "nb-stick" }, stick); st.style.setProperty("--sr", ((r() - .5) * 40).toFixed(0) + "deg"); card.append(st); }
    ph.append(card);
    return ph;
  }
  function openNotebook() {
    var ov = openOverlay("notebook"), tab = "all", seed = 7, pager = el("div", { class: "nb-pager" }), pages = [];
    var ind = el("span", { class: "nb-ind" }, "");
    var tabs = [["all", "Tất cả"], ["mine", "Của tôi"], ["fr", "Bạn bè"], ["day", "Ngày này"]];
    var row = el("div", { class: "nb-tabs" });
    var tbtn = tabs.map(function (t) { var b = el("button", { class: "chip" + (t[0] === tab ? " on" : ""), type: "button" }, t[1]); b.addEventListener("click", function () { tab = t[0]; tbtn.forEach(function (x, i) { x.classList.toggle("on", tabs[i][0] === tab); }); build(); }); return b; });
    row.append.apply(row, tbtn);
    var dice = el("button", { class: "icon-btn nb-dice", type: "button", "aria-label": "Xáo trộn" }, "🎲");
    var head = el("div", { class: "ov-head" }, el("button", { class: "icon-btn", type: "button", "aria-label": "Đóng", onclick: function () { closeOverlay(ov); } }, icon("close")), el("h2", {}, "Sổ lưu niệm"), dice);
    ov.append(head, row, pager, el("div", { class: "nb-foot" }, ind));
    var items = [], raf = 0;
    function filtered() {
      var now = new Date();
      return items.filter(function (m) {
        if (tab === "mine") return isMine(m);
        if (tab === "fr") return !isMine(m);
        if (tab === "day") { var d = new Date((m.ts || 0) * 1000); return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() < now.getFullYear(); }
        return true;
      });
    }
    function upd() {
      raf = 0; var w = pager.clientWidth || 1, sl = pager.scrollLeft;
      pages.forEach(function (pg, i) {
        var p = (i * w - sl) / w; if (p < -1.3 || p > 1.3) return;
        pg.style.setProperty("--p", p.toFixed(3));
        if (Math.abs(p) < 0.45) pg.classList.add("on"); else if (Math.abs(p) > 0.9) pg.classList.remove("on");
      });
      var cur = Math.min(pages.length, Math.max(1, Math.round(sl / w) + 1)); ind.textContent = pages.length ? "Trang " + cur + " / " + pages.length : "";
    }
    function build(shuffle) {
      var list = filtered().slice(0, 160);
      if (shuffle) { var r = rnd(seed); for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; } }
      pages = [];
      if (!list.length) {
        pager.replaceChildren(el("div", { class: "nb-empty" }, el("b", {}, tab === "day" ? "Hôm nay chưa có kỷ niệm nào từ các năm trước" : "Chưa có ảnh nào để dán vào sổ"), el("small", {}, "Đăng thêm khoảnh khắc hoặc đồng bộ bảng tin rồi quay lại nhé.")));
        ind.textContent = ""; return;
      }
      var nodes = [];
      for (var p = 0; p < list.length; p += 4) {
        var group = list.slice(p, p + 4), tp = TPL[(p / 4 + (shuffle ? seed : 0)) % TPL.length], sheet = el("div", { class: "nb-sheet" });
        group.forEach(function (m, k) { sheet.append(polaroid(m, tp[k], k, shuffle ? seed : 0)); });
        var pg = el("section", { class: "nb-page" }, sheet, el("span", { class: "nb-curl" }));
        pages.push(pg); nodes.push(pg);
      }
      pager.replaceChildren.apply(pager, nodes); pager.scrollLeft = 0;
      requestAnimationFrame(upd);
    }
    dice.addEventListener("click", function () { seed = (seed * 31 + Date.now()) % 99991 + 1; dice.classList.remove("spin"); void dice.offsetWidth; dice.classList.add("spin"); build(true); });
    pager.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    pager.replaceChildren(el("div", { class: "nb-empty" }, el("b", {}, "Đang dán ảnh vào sổ…")));
    loadAll().then(function (all) { items = all; build(); }).catch(function (e) { pager.replaceChildren(el("div", { class: "nb-empty" }, el("b", {}, e.message || "Không tải được ảnh"))); });
  }

  /* ---------- Lịch kỷ niệm ---------- */
  function openCalendar() {
    var ov = openOverlay("nbcal"), cur = new Date(); cur.setDate(1);
    var title = el("b", { class: "cal-title" }), grid = el("div", { class: "cal-grid" }), mine = [];
    function draw() {
      var y = cur.getFullYear(), mo = cur.getMonth(); title.textContent = "Tháng " + (mo + 1) + " · " + y;
      var first = (new Date(y, mo, 1).getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate(), by = {};
      mine.forEach(function (m) { var d = new Date((m.ts || 0) * 1000); if (d.getFullYear() === y && d.getMonth() === mo) (by[d.getDate()] = by[d.getDate()] || []).push(m); });
      var cells = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(function (t) { return el("span", { class: "cal-dow" }, t); }), n = 0;
      for (var i = 0; i < first; i++) cells.push(el("span", { class: "cal-cell off" }));
      for (var d = 1; d <= days; d++) {
        var arr = by[d], c = el("button", { class: "cal-cell" + (arr ? " has" : ""), type: "button" }, el("em", {}, d));
        if (arr) { n++; c.prepend(imgEl(safeUrl(arr[0].image))); if (arr.length > 1) c.append(el("u", {}, "+" + (arr.length - 1))); (function (a) { c.addEventListener("click", function () { if (a.length === 1) { openViewer(a[0], { mine: true }); return; } var sh = bottomSheet(el("h3", { style: { margin: "0 0 8px" } }, dstr(a[0].ts)), el("div", { class: "cal-day" }, ...a.map(function (m) { return el("button", { class: "tile", type: "button", onclick: function () { sh.close(); openViewer(m, { mine: true }); } }, imgEl(safeUrl(m.image))); }))); }); })(arr); }
        cells.push(c);
      }
      grid.replaceChildren.apply(grid, cells); sub.textContent = n ? n + " ngày có kỷ niệm trong tháng này" : "Tháng này chưa có bài nào";
    }
    var sub = el("small", { class: "cal-sub" }, "");
    var prev = el("button", { class: "icon-btn", type: "button", "aria-label": "Tháng trước", onclick: function () { cur.setMonth(cur.getMonth() - 1); draw(); } }, "‹");
    var next = el("button", { class: "icon-btn", type: "button", "aria-label": "Tháng sau", onclick: function () { cur.setMonth(cur.getMonth() + 1); draw(); } }, "›");
    ov.append(el("div", { class: "ov-head" }, el("button", { class: "icon-btn", type: "button", "aria-label": "Đóng", onclick: function () { closeOverlay(ov); } }, icon("close")), el("h2", {}, "Lịch kỷ niệm")),
      el("div", { class: "cal-bar" }, prev, el("div", {}, title, sub), next), grid);
    draw();
    loadAll().then(function (all) { mine = all.filter(isMine); draw(); }).catch(function () { /* bỏ qua */ });
  }

  /* ---------- trang Plus ---------- */
  function fcard(cls, art, title, sub, tag, fn) {
    var b = el("button", { class: "pl-card " + cls, type: "button" }, el("span", { class: "pl-art" }, art), el("strong", {}, title), el("small", {}, sub), tag ? el("em", { class: "pl-tag" }, tag) : null);
    b.addEventListener("click", fn); return b;
  }
  function go(href) { return function () { location.href = href; }; }
  function pickAI() {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.style.display = "none"; document.body.appendChild(inp);
    inp.onchange = function () { var f = inp.files && inp.files[0]; inp.remove(); if (!f) return; openEditor({ kind: "image", image: f, name: f.name }); setTimeout(function () { var b = document.querySelector(".ai-btn"); if (b) b.click(); }, 500); };
    inp.click();
  }
  function boothSheet() {
    var B = window.lcBooth, sh;
    function opt(mode, t, s) { return el("button", { class: "pick-row", type: "button", onclick: function () { sh.close(); if (B) { B.start(mode); goPage("camera"); } else toast("Photobooth chưa sẵn sàng", "error"); } }, el("div", { class: "meta" }, el("strong", {}, t), el("small", {}, s))); }
    sh = bottomSheet(el("h3", { style: { margin: "0 0 6px" } }, "Photobooth"), opt("polaroid", "Polaroid", "Một tấm, khung kem, ngày LED"), opt("cuts", "Dải 4 tấm", "Chụp liền 4 tấm ghép thành dải"), opt("duo", "Duo 35mm", "Hai tấm phim cuộn"));
  }
  function render() {
    var D = window.lcDaily, P = window.lcPerf, B = window.lcBooth;
    var heroPics = el("div", { class: "pl-pics" }, el("i", { class: "pp a" }), el("i", { class: "pp b" }), el("i", { class: "pp c" }));
    var hero = el("button", { class: "pl-hero", type: "button" }, heroPics, el("div", { class: "pl-ht" }, el("small", {}, "MỚI · KỶ NIỆM"), el("strong", {}, "Sổ lưu niệm"), el("span", {}, "Ảnh của bạn và bạn bè được dán vào sổ, lật trang để xem lại."), el("em", { class: "pl-go" }, "Mở sổ ›")));
    hero.addEventListener("click", openNotebook);
    var badge = document.getElementById("chat-badge"), un = badge && !badge.classList.contains("hidden") ? badge.textContent : "";
    var daily = el("div", { class: "daily-card plus-daily pl-daily" });
    function drawDaily() { if (!D) return; daily.replaceChildren(el("small", {}, "Thử thách hôm nay"), el("strong", { class: "adv-ch" }, D.text), el("small", {}, D.streak() ? D.streak() + " ngày liên tiếp" : "Chưa bắt đầu chuỗi"),
      el("button", { class: "chip" + (D.on() || D.done() ? " on" : ""), type: "button", disabled: D.done(), onclick: function () { D.toggle(); drawDaily(); } }, D.done() ? "Đã làm hôm nay" : (D.on() ? "Đang gắn vào bài đăng kế tiếp" : "Tham gia (gắn vào bài đăng kế tiếp)"))); }
    drawDaily();
    var fx = el("button", { class: "chip" + (P && P.pretty() ? " on" : ""), type: "button" }, P && P.pretty() ? "Hiệu ứng đẹp: Bật" : "Chế độ mượt: Bật");
    fx.addEventListener("click", function () { if (!P) return; P.set(!P.pretty()); fx.classList.toggle("on", P.pretty()); fx.textContent = P.pretty() ? "Hiệu ứng đẹp: Bật" : "Chế độ mượt: Bật"; });
    var snd = el("button", { class: "chip" + (B && B.sndOn() ? " on" : ""), type: "button" }, B && B.sndOn() ? "Tiếng chụp: Bật" : "Tiếng chụp: Tắt");
    snd.addEventListener("click", function () { if (!B) return; B.sndSet(!B.sndOn()); snd.classList.toggle("on", B.sndOn()); snd.textContent = B.sndOn() ? "Tiếng chụp: Bật" : "Tiếng chụp: Tắt"; });
    var memCard = fcard("c-day", "🕰️", "Ngày này năm xưa", "Kỷ niệm cùng ngày các năm trước", "", go("/memories#day"));
    page.replaceChildren(
      el("header", { class: "page-head" }, el("h1", {}, "Plus ", icon("star", "i s"))),
      el("div", { class: "plus-body pl-body" },
        el("p", { class: "fine plus-lead" }, "Mọi chức năng của LockCOC ở một chỗ."),
        hero,
        el("div", { class: "sec" }, icon("sparkle"), "Kỷ niệm"),
        el("div", { class: "pl-grid" },
          fcard("c-cal", "🗓️", "Lịch kỷ niệm", "Mỗi ngày một ảnh, chạm để xem lại", "Mới", openCalendar), memCard,
          fcard("c-wrap", "🎁", "Wrapped", "Tổng kết tháng, năm để khoe", "", go("/memories#wrap")),
          fcard("c-film", "🎞️", "Phim kỷ niệm", "Tự ghép ảnh thành clip có nhạc", "", go("/memories#film")),
          fcard("c-grid", "🧩", "Lưới ảnh", "Ghép nhiều ảnh thành một tấm vuông", "", go("/memories#collage")),
          fcard("c-lib", "🖼️", "Thư viện ảnh", "Đồng bộ và xem toàn bộ ảnh Locket", "", go("/library"))),
        el("div", { class: "sec" }, icon("camera"), "Sáng tạo"),
        el("div", { class: "pl-grid" },
          fcard("c-booth", "📸", "Photobooth", "Polaroid, dải 4 tấm, Duo 35mm", "3 chế độ", boothSheet),
          fcard("c-film2", "🎬", "Bộ lọc phim", "Màu điện ảnh, Kodak, Fuji, VHS…", "19 look", function () { goPage("camera"); toast("Chọn bộ lọc ở màn Soạn khoảnh khắc", "ok"); }),
          fcard("c-ai", "✨", "LockCOC AI", "Làm nét, ghép ảnh, tạo ảnh bằng AI", "Mới", pickAI),
          fcard("c-vip", "👑", "Khung VIP và widget", "Khung thương hiệu cho ảnh và video", "VIP", function () { goPage("camera"); toast("Chọn khung ở màn Soạn khoảnh khắc", "ok"); })),
        el("div", { class: "sec" }, icon("chat"), "Kết nối và công cụ"),
        el("div", { class: "pl-grid" },
          fcard("c-chat", "💬", "Tin nhắn", "Trò chuyện với bạn bè", un ? un + " chưa đọc" : "", function () { goPage("chat"); }),
          fcard("c-sync", "🔄", "Đồng bộ thư viện máy", "Hai chiều với Ảnh trong điện thoại", "", function () { var b = document.querySelector(".ds-open"); if (b) b.click(); else toast("Mở Hồ sơ để đồng bộ thư viện", "msg"); }),
          fcard("c-bak", "📦", "Sao lưu về máy", "Tải ảnh, video thành file ZIP", "", go("/memories#backup")),
          fcard("c-me", "👤", "Hồ sơ và mã khóa", "Mã khóa app, tự lưu, tự áp khung", "", function () { goPage("me"); })),
        el("div", { class: "sec" }, icon("flame"), "Thử thách"), daily,
        el("div", { class: "sec" }, icon("clock"), "Tuỳ chọn"), el("div", { class: "hrow" }, fx, snd),
        el("p", { class: "fine" }, "Chế độ mượt tắt bớt hiệu ứng nặng để app chạy trơn hơn trên máy yếu hoặc mạng chậm.")));
    var pp = heroPics.children;
    loadAll().then(function (all) { for (var i = 0; i < 3 && i < all.length; i++) pp[i].style.backgroundImage = "url(\"" + safeUrl(all[i].image).replace(/"/g, "") + "\")"; }).catch(function () { /* bỏ qua */ });
    if (D && D.otd) D.otd().then(function (n) { if (n) { var t = memCard.querySelector(".pl-tag"); if (!t) { t = el("em", { class: "pl-tag" }); memCard.append(t); } t.textContent = n + " ảnh"; } }).catch(function () { /* bỏ qua */ });
  }

  var _gp = goPage;
  goPage = function (p) {
    _gp(p);
    if (p === "plus") render();
    if (p === "chat") { document.querySelectorAll("#nav button").forEach(function (b) { b.classList.toggle("active", b.dataset.go === "plus"); }); var h = document.querySelector("#page-chat .page-head"); if (h && !h.querySelector(".plus-back")) { var bk = el("button", { class: "chip plus-back", type: "button", onclick: function () { goPage("plus"); } }, "← Plus"); h.append(bk); } }
  };
})();
