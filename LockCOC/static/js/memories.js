"use strict";
(function () {
  var active = "", TZ = new Date().getTimezoneOffset();
  var note = document.getElementById("mem-note");
  var view = document.getElementById("lib-view");

  function api(path, opts) {
    opts = opts || {};
    var h = { "X-LockCOC": "1" };
    if (active) h["X-LockCOC-Acct"] = active;
    var init = { method: opts.method || "GET", headers: h, credentials: "same-origin" };
    if (opts.json) { h["Content-Type"] = "application/json"; init.body = JSON.stringify(opts.json); }
    var sep = path.indexOf("?") < 0 ? "?" : "&";
    return fetch(path + sep + "tz=" + TZ, init).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        if (r.status === 423) { location.href = "/app"; throw new Error("App đang khoá."); }
        if (r.status === 401) throw new Error((d && d.error) || "Cần đăng nhập lại ở trang chính.");
        if (!r.ok) throw new Error((d && d.error) || ("Lỗi " + r.status));
        return d;
      });
    });
  }
  function safe(u) { try { var x = new URL(u); return x.protocol === "https:" ? x.href : ""; } catch (e) { return ""; } }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null && text !== "") n.textContent = text; return n; }
  function btn(label, cls, fn) { var b = el("button", "btn " + (cls || ""), ""); b.type = "button"; b.appendChild(el("span", "btn-label", label)); if (fn) b.addEventListener("click", fn); return b; }
  function chips(opts, cur, onPick) {
    var row = el("div", "mem-row");
    opts.forEach(function (o) {
      var c = el("button", "chip" + (o[0] === cur ? " on" : ""), o[1]); c.type = "button";
      c.addEventListener("click", function () { Array.prototype.forEach.call(row.children, function (x) { x.classList.toggle("on", x === c); }); onPick(o[0]); });
      row.appendChild(c);
    });
    return row;
  }
  function fmt(ts) { return ts ? new Date(ts * 1000).toLocaleString("vi-VN") : ""; }
  function setNote(t) { note.textContent = t || ""; }

  // ---------- trình xem ----------
  function openItem(m) {
    var box = document.getElementById("lib-media"); box.replaceChildren();
    var v = safe(m.video), i = safe(m.image);
    if (v) { var vd = document.createElement("video"); vd.controls = true; vd.playsInline = true; vd.src = v; if (i) vd.poster = i; box.appendChild(vd); }
    else if (i) { var im = new Image(); im.alt = ""; im.referrerPolicy = "no-referrer"; im.src = i; box.appendChild(im); }
    document.getElementById("lib-who").textContent = m.mine ? "Tôi" : (m.name || "Bạn bè");
    document.getElementById("lib-when").textContent = fmt(m.ts);
    document.getElementById("lib-cap").textContent = m.caption || "";
    var dl = document.getElementById("lib-dl");
    dl.href = "/api/sync-all/file/" + encodeURIComponent(m.id) + "?kind=" + (v ? "video" : "image");
    dl.querySelector(".btn-label").textContent = v ? "Tải video" : "Tải ảnh";
    view.classList.remove("hidden");
  }
  function closeItem() { view.classList.add("hidden"); var vd = view.querySelector("video"); if (vd) vd.pause(); document.getElementById("lib-media").replaceChildren(); }
  document.getElementById("lib-close").addEventListener("click", closeItem);
  view.addEventListener("click", function (e) { if (e.target === view) closeItem(); });
  function tile(m) {
    var b = el("button", "lib-tile"); b.type = "button";
    var src = safe(m.image);
    if (src) { var im = new Image(); im.loading = "lazy"; im.alt = ""; im.referrerPolicy = "no-referrer"; im.src = src; b.appendChild(im); }
    if (m.video) b.appendChild(el("span", "vid", "VID"));
    b.appendChild(el("span", "who", m.mine ? "Tôi" : (m.name || "Bạn bè")));
    b.addEventListener("click", function () { openItem(m); });
    return b;
  }
  function emptyHint(pane, msg) { pane.replaceChildren(); var d = el("div", "mem-empty", msg); d.appendChild(document.createElement("br")); var a = el("a", "", "Mở Thư viện để đồng bộ"); a.href = "/library"; d.appendChild(a); pane.appendChild(d); }

  // ---------- Ngày này ----------
  var panes = { day: document.getElementById("tab-day"), wrap: document.getElementById("tab-wrap"), film: document.getElementById("tab-film"), backup: document.getElementById("tab-backup") };
  var built = {};
  function buildDay() {
    var p = panes.day; p.replaceChildren(el("div", "mem-empty", "Đang tìm kỷ niệm…"));
    api("/api/memories/onthisday").then(function (d) {
      p.replaceChildren();
      if (!d.items.length) { emptyHint(p, "Chưa có kỷ niệm nào rơi vào ngày " + d.date + " các năm trước. Hãy đồng bộ Thư viện để có đủ dữ liệu."); return; }
      p.appendChild(el("h2", "", "Ngày " + d.date + " những năm trước"));
      var byYear = {};
      d.items.forEach(function (m) { var y = new Date(m.ts * 1000).getFullYear(); (byYear[y] = byYear[y] || []).push(m); });
      Object.keys(byYear).sort(function (a, b) { return b - a; }).forEach(function (y) {
        var ago = new Date().getFullYear() - Number(y);
        p.appendChild(el("p", "mem-year", ago + " năm trước · " + y));
        var g = el("div", "mem-grid"); byYear[y].forEach(function (m) { g.appendChild(tile(m)); }); p.appendChild(g);
      });
    }).catch(function (e) { p.replaceChildren(el("div", "mem-empty", e.message)); });
  }

  // ---------- Wrapped ----------
  var wrapState = { period: "year", ym: "" }, lastWrap = null;
  function buildWrap() {
    var p = panes.wrap; p.replaceChildren();
    var sel = el("select"); sel.setAttribute("aria-label", "Chọn tháng");
    var head = el("div", "mem-card");
    head.appendChild(chips([["year", "Năm nay"], ["lastyear", "Năm ngoái"], ["month", "Chọn tháng"]], wrapState.period, function (v) { wrapState.period = v; sel.classList.toggle("hidden", v !== "month"); loadWrap(); }));
    sel.classList.add("hidden");
    head.appendChild(sel); p.appendChild(head);
    var out = el("div", "mem-card"); out.id = "wrap-out"; p.appendChild(out);
    api("/api/memories/months").then(function (d) {
      d.items.forEach(function (m) { var o = el("option", "", m.ym.split("-").reverse().join("/") + " (" + m.count + ")"); o.value = m.ym; sel.appendChild(o); });
      wrapState.ym = sel.value || ""; sel.addEventListener("change", function () { wrapState.ym = sel.value; loadWrap(); });
      loadWrap();
    }).catch(function (e) { out.textContent = e.message; });
  }
  function loadWrap() {
    var out = document.getElementById("wrap-out"); out.replaceChildren(el("div", "mem-empty", "Đang tính…"));
    var y = new Date().getFullYear(), q = "period=year&y=" + y;
    if (wrapState.period === "lastyear") q = "period=year&y=" + (y - 1);
    if (wrapState.period === "month") { if (!wrapState.ym) { out.replaceChildren(el("div", "mem-empty", "Chưa có dữ liệu tháng nào.")); return; } q = "period=month&ym=" + wrapState.ym; }
    api("/api/memories/wrapped?" + q).then(function (w) { lastWrap = w; renderWrap(out, w); }).catch(function (e) { out.replaceChildren(el("div", "mem-empty", e.message)); });
  }
  var WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  function renderWrap(out, w) {
    out.replaceChildren();
    if (!w.total) { emptyHint(out, "Chưa có ảnh nào trong " + w.label.toLowerCase() + "."); return; }
    out.appendChild(el("h2", "", "LockCOC Wrapped · " + w.label));
    out.appendChild(el("div", "big-num", String(w.total)));
    out.appendChild(el("small", "muted", "khoảnh khắc đã lưu (" + w.mine + " của bạn, " + w.friends_posts + " của bạn bè)"));
    var sg = el("div", "stat-grid");
    function stat(b, s) { var d = el("div"); d.appendChild(el("b", "", b)); d.appendChild(el("small", "", s)); sg.appendChild(d); }
    stat(String(w.active_days), "ngày bạn đăng bài");
    stat(String(w.longest_streak), "ngày liên tiếp dài nhất");
    stat(String(w.videos), "video bạn đăng");
    stat(w.top_hour == null ? "-" : (w.top_hour + "h"), "giờ bạn hay đăng nhất");
    out.appendChild(sg);
    if (w.best_day) out.appendChild(el("p", "", "Ngày bận rộn nhất: " + w.best_day.date.split("-").reverse().join("/") + " với " + w.best_day.count + " bài."));
    if (w.top_friends.length) {
      out.appendChild(el("h2", "", "Bạn bè xuất hiện nhiều nhất"));
      var bars = el("div", "bars"), mx = w.top_friends[0].count;
      w.top_friends.forEach(function (f) { var r = el("div", "bar"); r.appendChild(el("span", "", f.name)); var t = el("span"); var i = el("i"); i.style.width = Math.max(4, f.count / mx * 100) + "%"; t.appendChild(i); r.appendChild(t); r.appendChild(el("span", "", String(f.count))); bars.appendChild(r); });
      out.appendChild(bars);
    }
    out.appendChild(el("h2", "", w.period === "month" ? "Theo ngày" : "Theo tháng"));
    var sp = el("div", "spark"), smax = Math.max(1, Math.max.apply(null, w.series.map(function (s) { return s.count; })));
    w.series.forEach(function (s) { var i = el("i"); i.style.height = Math.max(3, s.count / smax * 100) + "%"; i.title = s.label + ": " + s.count; sp.appendChild(i); });
    out.appendChild(sp);
    var row = el("div", "mem-row");
    var share = btn("Tạo ảnh để khoe", "primary", function () { share.disabled = true; makeCard(w).then(function () { share.disabled = false; }, function (e) { share.disabled = false; setNote(e.message); }); });
    row.appendChild(share); out.appendChild(row);
  }
  function loadBitmap(id) {
    return fetch("/api/sync-all/file/" + encodeURIComponent(id) + "?kind=image", { headers: { "X-LockCOC": "1", "X-LockCOC-Acct": active }, credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("x"); return r.blob(); }).then(function (b) { return createImageBitmap(b); }).catch(function () { return null; });
  }
  function makeCard(w) {
    return Promise.all((w.sample_ids || []).slice(0, 4).map(loadBitmap)).then(function (bms) {
      var c = document.createElement("canvas"); c.width = 1080; c.height = 1920; var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, "#1b1408"); g.addColorStop(1, "#080604"); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
      var rg = x.createRadialGradient(540, 520, 40, 540, 520, 800); rg.addColorStop(0, "rgba(226,176,74,.35)"); rg.addColorStop(1, "rgba(226,176,74,0)"); x.fillStyle = rg; x.fillRect(0, 0, 1080, 1920);
      x.textAlign = "center"; x.fillStyle = "#e2b04a"; x.font = "800 56px Inter, system-ui, sans-serif"; x.fillText("LOCKCOC WRAPPED", 540, 150);
      x.fillStyle = "#f2e9d6"; x.font = "600 44px Inter, system-ui, sans-serif"; x.fillText(w.label, 540, 220);
      var ok = bms.filter(Boolean), n = ok.length;
      if (n) { var sz = n === 1 ? 640 : 330, gap = 18, cols = n === 1 ? 1 : 2, startX = (1080 - (cols * sz + (cols - 1) * gap)) / 2;
        ok.forEach(function (b, i) { var cx = startX + (i % cols) * (sz + gap), cy = 270 + Math.floor(i / cols) * (sz + gap); x.save(); x.beginPath(); x.roundRect(cx, cy, sz, sz, 28); x.clip(); var s = Math.max(sz / b.width, sz / b.height); x.drawImage(b, cx + (sz - b.width * s) / 2, cy + (sz - b.height * s) / 2, b.width * s, b.height * s); x.restore(); }); }
      var y0 = n ? (n === 1 ? 990 : 1000) : 420;
      x.fillStyle = "#e2b04a"; x.font = "800 190px Inter, system-ui, sans-serif"; x.fillText(String(w.total), 540, y0 + 130);
      x.fillStyle = "#cfc4ad"; x.font = "500 38px Inter, system-ui, sans-serif"; x.fillText("khoảnh khắc đã lưu", 540, y0 + 190);
      var lines = [w.active_days + " ngày đăng bài", w.longest_streak + " ngày liên tiếp dài nhất", w.videos + " video"];
      x.fillStyle = "#f2e9d6"; x.font = "600 46px Inter, system-ui, sans-serif"; lines.forEach(function (t, i) { x.fillText(t, 540, y0 + 290 + i * 66); });
      if (w.top_friends.length) { x.fillStyle = "#e2b04a"; x.font = "700 40px Inter, system-ui, sans-serif"; x.fillText("Bạn bè nổi bật", 540, y0 + 540);
        x.fillStyle = "#f2e9d6"; x.font = "500 42px Inter, system-ui, sans-serif"; w.top_friends.slice(0, 3).forEach(function (f, i) { x.fillText((i + 1) + ". " + f.name + " · " + f.count, 540, y0 + 600 + i * 58); }); }
      x.fillStyle = "#7d725c"; x.font = "500 30px Inter, system-ui, sans-serif"; x.fillText("lockcoc-vip.onrender.com", 540, 1850);
      return new Promise(function (res) { c.toBlob(res, "image/png"); });
    }).then(function (blob) {
      var file = new File([blob], "lockcoc-wrapped.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: "LockCOC Wrapped" }).catch(function () {});
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "lockcoc-wrapped.png"; document.body.appendChild(a); a.click(); a.remove(); setNote("Đã tải ảnh Wrapped về máy.");
    });
  }

  // ---------- Phim ----------
  var film = { days: "30", who: "all", uid: "", music: null, picked: [], job: null, timer: null };
  function qs(o) { return Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return k + "=" + encodeURIComponent(o[k]); }).join("&"); }
  function buildFilm() {
    var p = panes.film; p.replaceChildren();
    var c1 = el("div", "mem-card"); c1.appendChild(el("h2", "", "Phim kỷ niệm tự động"));
    c1.appendChild(el("small", "muted", "App chọn ảnh rải đều theo thời gian, ghép thành clip dọc có chuyển cảnh. Dựng trên máy chủ nên có thể mất 1 đến 3 phút."));
    c1.appendChild(chips([["7", "7 ngày"], ["30", "30 ngày"], ["365", "1 năm"], ["", "Tất cả"]], film.days, function (v) { film.days = v; pick(); }));
    c1.appendChild(chips([["all", "Tất cả"], ["mine", "Của tôi"], ["friends", "Bạn bè"]], film.who, function (v) { film.who = v; pick(); }));
    var strip = el("div", "film-strip"); strip.id = "film-strip"; c1.appendChild(strip);
    var info = el("small", "muted"); info.id = "film-info"; c1.appendChild(info);
    p.appendChild(c1);
    var c2 = el("div", "mem-card"); c2.appendChild(el("h2", "", "Nhạc nền (tuỳ chọn)"));
    var r = el("div", "mem-row"); var inp = el("input"); inp.type = "text"; inp.placeholder = "Tên bài hát hoặc ca sĩ"; r.appendChild(inp);
    var sb = btn("Tìm", "", function () { search(inp.value); }); r.appendChild(sb); c2.appendChild(r);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); search(inp.value); } });
    var list = el("div", "mem-songs"); list.id = "film-songs"; c2.appendChild(list);
    var cur = el("small", "muted", "Chưa chọn nhạc."); cur.id = "film-music"; c2.appendChild(cur);
    p.appendChild(c2);
    var c3 = el("div", "mem-card"); c3.id = "film-out"; c3.classList.add("film-out");
    var go = btn("Dựng phim", "primary", startFilm); go.id = "film-go"; c3.appendChild(go); p.appendChild(c3);
    pick();
  }
  function pick() {
    var info = document.getElementById("film-info"), strip = document.getElementById("film-strip"); info.textContent = "Đang chọn ảnh…";
    api("/api/memories/pick?" + qs({ who: film.who, days: film.days, limit: 12 })).then(function (d) {
      film.picked = d.items; strip.replaceChildren();
      d.items.forEach(function (m) { var s = safe(m.image); if (s) { var im = new Image(); im.alt = ""; im.referrerPolicy = "no-referrer"; im.src = s; strip.appendChild(im); } });
      info.textContent = d.items.length < 2 ? "Cần ít nhất 2 ảnh. Hãy đồng bộ Thư viện hoặc chọn khoảng dài hơn." : ("Chọn " + d.items.length + " ảnh trong tổng " + d.total + " ảnh. Phim dài khoảng " + Math.round(d.items.length * 2) + " giây.");
    }).catch(function (e) { info.textContent = e.message; });
  }
  function search(t) {
    var list = document.getElementById("film-songs"); if (!t.trim()) return; list.replaceChildren(el("small", "muted", "Đang tìm…"));
    api("/api/music/search?q=" + encodeURIComponent(t.trim())).then(function (d) {
      list.replaceChildren();
      d.items.filter(function (s) { return s.preview; }).forEach(function (s) {
        var b = el("button", "mem-song"); b.type = "button";
        var a = safe(s.art); if (a) { var im = new Image(); im.alt = ""; im.referrerPolicy = "no-referrer"; im.src = a; b.appendChild(im); }
        var dv = el("div"); dv.appendChild(el("span", "", s.title)); dv.appendChild(el("small", "", s.artist)); b.appendChild(dv);
        b.addEventListener("click", function () { film.music = s; Array.prototype.forEach.call(list.children, function (x) { x.classList.toggle("on", x === b); }); document.getElementById("film-music").textContent = "Nhạc: " + s.title + " – " + s.artist; });
        list.appendChild(b);
      });
      if (!list.children.length) list.appendChild(el("small", "muted", "Không thấy bài nào có đoạn nghe thử."));
    }).catch(function (e) { list.replaceChildren(el("small", "muted", e.message)); });
  }
  function startFilm() {
    if (film.picked.length < 2) { setNote("Cần ít nhất 2 ảnh."); return; }
    var go = document.getElementById("film-go"); go.disabled = true; setNote("");
    api("/api/film/start", { method: "POST", json: { ids: film.picked.map(function (m) { return m.id; }), per: 2.0, music_url: film.music ? film.music.preview : "" } })
      .then(function (j) { watchFilm(j); }).catch(function (e) { go.disabled = false; setNote(e.message); });
  }
  function watchFilm(j) {
    var out = document.getElementById("film-out");
    function show(j) {
      if (j.state === "running") { setNote((j.phase || "Đang dựng") + "…"); return false; }
      var go = document.getElementById("film-go"); if (go) go.disabled = false;
      if (j.state === "error") { setNote(j.error || "Dựng phim lỗi."); return true; }
      if (j.state === "done") {
        setNote("Phim đã sẵn sàng (" + (j.seconds || "?") + " giây).");
        var old = out.querySelector(".film-res"); if (old) old.remove();
        var res = el("div", "film-res"); res.style.display = "grid"; res.style.gap = "10px";
        var v = document.createElement("video"); v.controls = true; v.playsInline = true; v.src = "/api/film/file/" + j.id + "?t=" + Date.now(); res.appendChild(v);
        var row = el("div", "mem-row");
        var dl = el("a", "btn", ""); dl.href = "/api/film/file/" + j.id + "?dl=1"; dl.appendChild(el("span", "btn-label", "Tải về")); dl.style.textDecoration = "none"; row.appendChild(dl);
        var ci = el("input"); ci.type = "text"; ci.placeholder = "Caption khi đăng (tuỳ chọn)"; ci.maxLength = 120; row.appendChild(ci);
        var post = btn("Đăng lên Locket", "primary", function () { post.disabled = true; api("/api/film/post", { method: "POST", json: { id: j.id, caption: ci.value } }).then(function () { setNote("Đã đăng phim lên Locket."); }).catch(function (e) { setNote(e.message); }).then(function () { post.disabled = false; }); });
        row.appendChild(post); res.appendChild(row); out.appendChild(res);
      }
      return true;
    }
    if (show(j)) return;
    if (film.timer) clearInterval(film.timer);
    film.timer = setInterval(function () { api("/api/film/status").then(function (s) { if (show(s)) { clearInterval(film.timer); film.timer = null; } }).catch(function (e) { setNote(e.message); clearInterval(film.timer); film.timer = null; var g = document.getElementById("film-go"); if (g) g.disabled = false; }); }, 3000);
  }

  // ---------- Sao lưu ----------
  var bk = { who: "all", uid: "", days: "" };
  function buildBackup() {
    var p = panes.backup; p.replaceChildren();
    var c = el("div", "mem-card"); c.appendChild(el("h2", "", "Sao lưu ảnh và video về máy"));
    c.appendChild(el("small", "muted", "Locket không cho xuất dữ liệu. Ở đây bạn tải về file ZIP (kèm danh-sach.csv). Mỗi phần tối đa 60 ảnh/video nên máy chủ miễn phí xử lý ổn định. Cần đồng bộ Thư viện trước."));
    c.appendChild(chips([["all", "Tất cả"], ["mine", "Của tôi"], ["friends", "Bạn bè"]], bk.who, function (v) { bk.who = v; plan(); }));
    c.appendChild(chips([["", "Mọi lúc"], ["365", "1 năm qua"], ["30", "30 ngày qua"]], bk.days, function (v) { bk.days = v; plan(); }));
    var sel = el("select"); sel.setAttribute("aria-label", "Người bạn"); var o0 = el("option", "", "Mọi người"); o0.value = ""; sel.appendChild(o0);
    c.appendChild(sel); sel.addEventListener("change", function () { bk.uid = sel.value; plan(); });
    p.appendChild(c);
    var c2 = el("div", "mem-card"); c2.id = "bk-plan"; p.appendChild(c2);
    api("/api/memories/people").then(function (d) { d.items.forEach(function (m) { if (!m.uid) return; var o = el("option", "", m.name + " (" + m.count + ")"); o.value = m.uid; sel.appendChild(o); }); }).catch(function () {});
    plan();
  }
  function plan() {
    var c2 = document.getElementById("bk-plan"); c2.replaceChildren(el("small", "muted", "Đang đếm…"));
    var f = { who: bk.who, days: bk.days, uid: bk.uid };
    api("/api/backup/plan?" + qs(f)).then(function (d) {
      c2.replaceChildren();
      if (!d.total) { emptyHint(c2, "Không có ảnh nào khớp bộ lọc."); return; }
      c2.appendChild(el("h2", "", d.total + " ảnh/video (" + d.videos + " có video)"));
      var parts = Math.ceil(d.total / d.size), box = el("div", "part-links");
      for (var i = 0; i < parts; i++) { (function (i) {
        var a = el("a", "btn", ""); a.href = "/api/backup.zip?" + qs(f) + "&size=" + d.size + "&part=" + i + "&tz=" + TZ; a.setAttribute("download", ""); a.appendChild(el("span", "btn-label", "Phần " + (i + 1) + " (" + (i * d.size + 1) + "–" + Math.min(d.total, (i + 1) * d.size) + ")"));
        a.addEventListener("click", function () { setNote("Đang gom phần " + (i + 1) + ", có thể mất tới 1 phút trước khi trình duyệt bắt đầu tải."); });
        box.appendChild(a); })(i); }
      c2.appendChild(box);
    }).catch(function (e) { c2.replaceChildren(el("small", "muted", e.message)); });
  }

  // ---------- tab ----------
  var builders = { day: buildDay, wrap: buildWrap, film: buildFilm, backup: buildBackup };
  function go(tab) {
    if (!builders[tab]) tab = "day";
    Array.prototype.forEach.call(document.querySelectorAll(".mem-tabs .chip"), function (c) { c.classList.toggle("on", c.dataset.tab === tab); c.setAttribute("aria-selected", c.dataset.tab === tab ? "true" : "false"); });
    Object.keys(panes).forEach(function (k) { panes[k].classList.toggle("hidden", k !== tab); });
    setNote("");
    if (!built[tab]) { built[tab] = true; builders[tab](); }
    try { history.replaceState(null, "", "#" + tab); } catch (e) { /* bỏ qua */ }
  }
  Array.prototype.forEach.call(document.querySelectorAll(".mem-tabs .chip"), function (c) { c.addEventListener("click", function () { go(c.dataset.tab); }); });
  api("/api/status").then(function (st) { active = st.active || ""; }).catch(function () {}).then(function () { go((location.hash || "").slice(1) || "day"); });
})();
