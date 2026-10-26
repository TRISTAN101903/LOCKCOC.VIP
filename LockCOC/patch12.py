import os
R="LockCOC" if os.path.isdir("LockCOC") else "."
def w(p,s):
    open(os.path.join(R,p),"w",encoding="utf-8").write(s)
def rd(p): return open(os.path.join(R,p),encoding="utf-8").read()
w("static/js/polish.js", r'''"use strict";
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
''')
w("static/polish.css", r'''/* polish.css - mượt hơn, gọn hơn */
.page { overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.feed:not(.grid) > * { content-visibility: auto; contain-intrinsic-size: auto 420px; }
.page-head h1 { font-size: 28px; font-weight: 750; letter-spacing: -.03em; }
.page-head .icon-btn, .chip, .seg button, .row-item, .pick-row { transition: transform .18s var(--ease), background .2s; }
.icon-btn:active, .chip:active, .seg button:active, .row-item:active, .pick-row:active { transform: scale(.94); }
a.icon-btn { display: inline-grid; place-items: center; color: inherit; text-decoration: none; }
#nav button { transition: color .2s, transform .2s var(--spring); }
#nav button.active:not(.cam-tab) { color: var(--gold1); transform: translateY(-2px); }
.feed img, .my-grid img { background: var(--surface); animation: lcFade .35s var(--ease); }
@keyframes lcFade { from { opacity: 0; } to { opacity: 1; } }
.lite .ambient { animation: none; filter: none; }
.lite .view, .lite .page { animation-duration: .01s; }
@media (prefers-reduced-motion: reduce) { .ambient { animation: none; } }

.post-pill { position: fixed; z-index: 99; left: 50%; top: calc(var(--safe-t) + 12px); transform: translateX(-50%); width: min(92vw, 420px);
  padding: 12px 14px 14px; border-radius: 22px; background: rgba(24, 20, 14, .94); border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow); animation: lcDrop .35s var(--spring); }
.post-pill.out { opacity: 0; transform: translate(-50%, -12px); transition: .3s; }
.pp-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 14px; }
.pp-t { color: var(--text); }
.pp-x { padding: 5px 12px; border-radius: 12px; background: var(--surface2); color: var(--danger); font-size: 13px; }
.pp-bar { height: 5px; margin-top: 10px; border-radius: 3px; background: var(--surface2); overflow: hidden; }
.pp-bar i { display: block; height: 100%; width: 0; background: var(--gold); transition: width .25s linear; }
.post-pill.work .pp-bar i { background: linear-gradient(90deg, var(--gold3), var(--gold1), var(--gold3)); background-size: 200% 100%; animation: lcSlide 1.2s linear infinite; }
@keyframes lcSlide { to { background-position: -200% 0; } }
@keyframes lcDrop { from { opacity: 0; transform: translate(-50%, -16px) scale(.96); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
body.posting .toast.msg { display: none; }
.post-pill { background: #181410; }
.page-head { padding-left: 14px; padding-right: 12px; gap: 6px; }
.page-head .head-tools { gap: 6px; min-width: 0; flex: 0 1 auto; }
.page-head h1 { font-size: 24px; }
.head-tools .chip { max-width: 112px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 12px; padding-right: 10px; }
.head-tools .icon-btn { flex: none; }
''')
p="templates/index.html"; s=rd(p)
if "polish.css" not in s:
    s=s.replace('<link rel="stylesheet" href="/static/style.css">','<link rel="stylesheet" href="/static/style.css">\n  <link rel="stylesheet" href="/static/polish.css">',1)
    s=s.replace('  <script src="/static/js/boot.js"></script>','  <script src="/static/js/polish.js"></script>\n  <script src="/static/js/boot.js"></script>',1)
    w(p,s)
p="static/js/library.js"; s=rd(p)
old=".then(function () { return tick(); }).then(function () { return load(true); });"
new=".then(function () { return tick(); }).then(function (st) { if (st && st.state !== \"running\" && !st.total) syncBtn.click(); return load(true); });"
if old in s: w(p,s.replace(old,new))
else: print("[loi] library.js khong khop (co the da sua)")
print("xong patch12")
