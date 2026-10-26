"use strict";
/* polish.js - mượt hơn: cache bảng tin, tiến trình đăng, nháp caption, ảnh lazy */
(function () {
  var lite = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2;
  if (lite) document.documentElement.classList.add("lite");

  function ck(p) { var a = ""; try { a = S.active || ""; } catch (e) { /* chưa có */ } return "lc_c_" + a + "_" + p; }
  function cget(p) { try { var v = localStorage.getItem(ck(p)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function cset(p, d) { try { localStorage.setItem(ck(p), JSON.stringify(d)); } catch (e) { /* đầy bộ nhớ */ } }

  /* ---- tiến trình đăng bài ---- */
  function progress(onCancel) {
    var bar = el("i"), txt = el("span", { class: "pp-t" }, "Đang tải lên 0%");
    var cancel = el("button", { class: "pp-x", type: "button" }, "Huỷ");
    var box = el("div", { class: "post-pill", role: "status" }, el("div", { class: "pp-row" }, txt, cancel), el("div", { class: "pp-bar" }, bar));
    cancel.addEventListener("click", onCancel);
    document.body.appendChild(box); document.body.classList.add("posting");
    var t0 = 0, timer = null, upDone = false;
    return {
      set: function (p) { bar.style.width = p + "%"; txt.textContent = p < 100 ? "Đang tải lên " + p + "%" : "Đã tải lên"; },
      phase: function () {
        if (upDone) return; upDone = true; bar.style.width = "100%"; box.classList.add("work"); t0 = Date.now();
        timer = setInterval(function () {
          var s = Math.round((Date.now() - t0) / 1000);
          txt.textContent = s < 40 ? "Máy chủ đang xử lý… " + s + "s" : "Máy chủ free xử lý khá chậm, vẫn đang chạy… " + s + "s";
        }, 1000);
      },
      close: function () { clearInterval(timer); document.body.classList.remove("posting"); box.classList.add("out"); setTimeout(function () { box.remove(); }, 300); }
    };
  }
  function postXhr(path, opts) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest(), pill;
      x.open("POST", path); x.timeout = 300000;
      x.setRequestHeader("X-LockCOC", "1");
      try { if (S.active) x.setRequestHeader("X-LockCOC-Acct", S.active); } catch (e) { /* bỏ qua */ }
      pill = progress(function () { x.abort(); });
      x.upload.onprogress = function (e) { if (e.lengthComputable) pill.set(Math.round(e.loaded / e.total * 100)); };
      x.upload.onload = function () { pill.phase(); };
      x.onload = function () {
        pill.close(); var d = null; try { d = JSON.parse(x.responseText); } catch (e) { /* không phải JSON */ }
        if (x.status === 423) { onLocked(); return reject(new Error("App đang khoá.")); }
        if (x.status === 401) { onAuthLost(); return reject(new Error((d && d.error) || "Cần đăng nhập lại.")); }
        if (x.status < 200 || x.status >= 300) return reject(new Error((d && d.error) || "Lỗi " + x.status));
        try { localStorage.removeItem("lc_draft"); } catch (e) { /* bỏ qua */ }
        resolve(d);
      };
      x.onerror = function () { pill.close(); reject(new Error("Không kết nối được tới server.")); };
      x.ontimeout = function () { pill.close(); reject(new Error("Máy chủ xử lý quá lâu. Thử nhạc/video ngắn hơn.")); };
      x.onabort = function () { pill.close(); reject(new Error("Đã huỷ chờ. Nếu máy chủ làm xong, bài vẫn có thể được đăng.")); };
      x.send(opts.form);
    });
  }

  /* ---- bọc api + loadFeed ---- */
  var _api = api;
  api = function (path, opts) {
    opts = opts || {};
    if (path === "/api/post" && opts.form) return postXhr(path, opts);
    return _api(path, opts).then(function (d) {
      if (path === "/api/feed" && d && d.items) cset("feed", d.items.slice(0, 60));
      return d;
    });
  };
  var _lf = loadFeed;
  loadFeed = function (full) {
    if (!F.items.length) {
      var c = cget("feed");
      if (c && c.length) { F.items = c; F.shown = 30; try { renderFeed(); } catch (e) { /* chờ dữ liệu thật */ } }
    }
    return _lf(full);
  };

  /* ---- nháp caption ---- */
  function capInput(n) { return n.querySelector ? n.querySelector(".edit-actions .searchbar input") : null; }
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t && t.closest && t.closest(".edit-actions .searchbar")) {
      try { localStorage.setItem("lc_draft", JSON.stringify({ t: t.value, at: Date.now() })); } catch (e) { /* bỏ qua */ }
    }
  });
  /* ---- ảnh lazy + nháp ---- */
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        var imgs = n.tagName === "IMG" ? [n] : n.querySelectorAll ? n.querySelectorAll("img") : [];
        Array.prototype.forEach.call(imgs, function (im) { if (!im.hasAttribute("loading")) im.loading = "lazy"; im.decoding = "async"; });
        var ci = capInput(n);
        if (ci && !ci.value) {
          try {
            var d = JSON.parse(localStorage.getItem("lc_draft") || "null");
            if (d && d.t && Date.now() - d.at < 6 * 3600e3) { ci.value = d.t; ci.dispatchEvent(new Event("input", { bubbles: true })); }
          } catch (e) { /* bỏ qua */ }
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
