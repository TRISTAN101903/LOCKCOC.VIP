"use strict";
(function () {
  var grid = document.getElementById("lib-grid");
  var status = document.getElementById("lib-status");
  var syncBtn = document.getElementById("lib-sync");
  var progWrap = document.getElementById("lib-progwrap");
  var moreBtn = document.getElementById("lib-more");
  var view = document.getElementById("lib-view");
  var who = "all", offset = 0, total = 0, active = "", poll = null, PAGE = 60;

  function api(path, opts) {
    opts = opts || {};
    var h = { "X-LockCOC": "1" };
    if (active) h["X-LockCOC-Acct"] = active;
    return fetch(path, { method: opts.method || "GET", headers: h, credentials: "same-origin" }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        if (r.status === 423) { location.href = "/app"; throw new Error("App đang khoá."); }
        if (r.status === 401) throw new Error((d && d.error) || "Cần đăng nhập lại ở trang chính.");
        if (!r.ok) throw new Error((d && d.error) || ("Lỗi " + r.status));
        return d;
      });
    });
  }
  function safe(u) { try { var x = new URL(u); return x.protocol === "https:" ? x.href : ""; } catch (e) { return ""; } }
  function fmt(ts) { return ts ? new Date(ts * 1000).toLocaleString("vi-VN") : ""; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

/* (đoạn chèn vào library.js) chọn nhiều + xoá khoảnh khắc */
  var SEL = { on: false, ids: {} }, cur = null;
  var bar = el("div", "lib-selbar hidden");
  var selCount = el("b", "", "0 đã chọn");
  var selAll = el("button", "btn", "Chọn tất cả"); selAll.type = "button";
  var selDel = el("button", "btn danger", "Xoá"); selDel.type = "button";
  var selCancel = el("button", "btn", "Xong"); selCancel.type = "button";
  bar.append(selCount, selAll, selDel, selCancel); document.body.appendChild(bar);
  var selBtn = el("button", "btn", "Chọn để xoá"); selBtn.type = "button";
  var chips = document.querySelector(".lib-chips"); if (chips && chips.parentNode) chips.parentNode.insertBefore(selBtn, chips.nextSibling);
  function selN() { return Object.keys(SEL.ids).length; }
  function selRefresh() { selCount.textContent = selN() + " đã chọn"; selDel.disabled = !selN(); }
  function setSel(on) {
    SEL.on = on; if (!on) SEL.ids = {};
    grid.classList.toggle("selecting", on); bar.classList.toggle("hidden", !on);
    Array.prototype.forEach.call(grid.querySelectorAll(".lib-tile.picked"), function (t) { t.classList.remove("picked"); });
    selRefresh();
  }
  function pick(b, m) {
    if (!m.mine) { status.textContent = "Chỉ xoá được bài của bạn."; return; }
    if (SEL.ids[m.id]) { delete SEL.ids[m.id]; b.classList.remove("picked"); } else { SEL.ids[m.id] = 1; b.classList.add("picked"); }
    selRefresh();
  }
  selBtn.addEventListener("click", function () { setSel(!SEL.on); });
  selCancel.addEventListener("click", function () { setSel(false); });
  selAll.addEventListener("click", function () {
    Array.prototype.forEach.call(grid.querySelectorAll(".lib-tile[data-mine='1']"), function (t) { SEL.ids[t.dataset.id] = 1; t.classList.add("picked"); });
    selRefresh();
  });
  function delIds(ids) {
    var left = ids.slice(), okAll = [], failN = 0;
    function step() {
      if (!left.length) return Promise.resolve();
      var part = left.splice(0, 10);
      return fetch("/api/moments/delete-many", { method: "POST", credentials: "same-origin", headers: { "X-LockCOC": "1", "Content-Type": "application/json", "X-LockCOC-Acct": active || "" }, body: JSON.stringify({ ids: part }) })
        .then(function (r) { return r.json(); }).then(function (d) { okAll = okAll.concat(d.ok || []); failN += (d.fail || []).length; status.textContent = "Đã xoá " + okAll.length + "/" + ids.length + "…"; return step(); });
    }
    return step().then(function () {
      okAll.forEach(function (id) { var t = grid.querySelector(".lib-tile[data-id='" + id + "']"); if (t) t.remove(); delete SEL.ids[id]; });
      total = Math.max(0, total - okAll.length);
      status.textContent = "Đã xoá " + okAll.length + " bài" + (failN ? ", " + failN + " bài lỗi" : "") + ".";
      selRefresh();
    }).catch(function (e) { status.textContent = e.message; });
  }
  selDel.addEventListener("click", function () {
    var ids = Object.keys(SEL.ids);
    if (!ids.length || !confirm("Xoá " + ids.length + " khoảnh khắc khỏi Locket? Không thể hoàn tác.")) return;
    selDel.disabled = true; delIds(ids).then(function () { selRefresh(); });
  });
  var viewDel = el("button", "btn danger hidden", "Xoá bài này"); viewDel.type = "button";
  var vact = document.querySelector(".lib-view-actions"); if (vact) vact.appendChild(viewDel);
  viewDel.addEventListener("click", function () {
    if (!cur || !confirm("Xoá khoảnh khắc này khỏi Locket? Không thể hoàn tác.")) return;
    var id = cur.id; delIds([id]).then(function () { close(); });
  });

  function tile(m) {
    var b = el("button", "lib-tile"); b.type = "button";
    var src = safe(m.image);
    if (src) { var im = new Image(); im.loading = "lazy"; im.alt = ""; im.referrerPolicy = "no-referrer"; im.src = src; b.appendChild(im); }
    if (m.video) b.appendChild(el("span", "vid", "VID"));
    b.appendChild(el("span", "who", m.mine ? "Tôi" : (m.name || "Bạn bè")));
    b.dataset.id = m.id; b.dataset.mine = m.mine ? "1" : "0";
    b.addEventListener("click", function () { if (SEL.on) pick(b, m); else open(m); });
    return b;
  }
  function open(m) {
    cur = m; viewDel.classList.toggle("hidden", !m.mine);
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
  function close() { view.classList.add("hidden"); var vd = view.querySelector("video"); if (vd) vd.pause(); document.getElementById("lib-media").replaceChildren(); }
  document.getElementById("lib-close").addEventListener("click", close);
  view.addEventListener("click", function (e) { if (e.target === view) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  function load(reset) {
    if (reset) { offset = 0; grid.replaceChildren(); }
    return api("/api/sync-all/items?who=" + who + "&offset=" + offset + "&limit=" + PAGE).then(function (d) {
      total = d.total;
      d.items.forEach(function (m) { grid.appendChild(tile(m)); });
      offset += d.items.length;
      if (!grid.children.length) grid.appendChild(el("div", "lib-empty", total ? "" : "Chưa có ảnh nào. Bấm “Đồng bộ ngay” để tải từ Locket."));
      moreBtn.classList.toggle("hidden", offset >= total);
    }).catch(function (e) { status.textContent = e.message; });
  }

  function render(st) {
    var running = st.state === "running";
    progWrap.classList.toggle("hidden", !running);
    syncBtn.disabled = running;
    if (running) status.textContent = (st.phase || "Đang đồng bộ") + " · đã thấy " + (st.found || 0) + " ảnh";
    else if (st.state === "error") status.textContent = st.error || "Đồng bộ lỗi.";
    else status.textContent = st.total ? ("Đã lưu " + st.total + " ảnh/video.") : "Chưa đồng bộ lần nào.";
  }
  function tick() {
    return api("/api/sync-all/status").then(function (st) {
      render(st);
      if (st.state === "running") { if (!poll) poll = setInterval(tick, 2000); }
      else if (poll) { clearInterval(poll); poll = null; load(true); }
      return st;
    }).catch(function (e) { status.textContent = e.message; if (poll) { clearInterval(poll); poll = null; } });
  }
  syncBtn.addEventListener("click", function () {
    syncBtn.disabled = true;
    api("/api/sync-all", { method: "POST" }).then(function (st) { render(st); if (!poll) poll = setInterval(tick, 2000); })
      .catch(function (e) { status.textContent = e.message; syncBtn.disabled = false; });
  });
  moreBtn.addEventListener("click", function () { load(false); });
  Array.prototype.forEach.call(document.querySelectorAll(".lib-chips .chip"), function (c) {
    c.addEventListener("click", function () {
      who = c.dataset.who;
      Array.prototype.forEach.call(document.querySelectorAll(".lib-chips .chip"), function (x) { x.classList.toggle("on", x === c); x.setAttribute("aria-selected", x === c ? "true" : "false"); });
      load(true);
    });
  });

  api("/api/status").then(function (st) { active = st.active || ""; }).catch(function () {}).then(function () { return tick(); }).then(function (st) { if (st && st.state !== "running" && !st.total) syncBtn.click(); return load(true); });
})();
