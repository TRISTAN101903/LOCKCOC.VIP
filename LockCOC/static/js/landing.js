"use strict";
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // App đã cài như PWA/APK thì vào thẳng ứng dụng
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) { location.replace("/app"); return; }
  } catch (e) { /* bỏ qua */ }

  // ---- video demo: chỉ chạy khi đang nhìn thấy ----
  var vid = document.getElementById("demo-vid"), vb = document.getElementById("vid-btn"), userPaused = false;
  if (vid) {
    var play = function () { if (!userPaused && !reduce) { var q = vid.play(); if (q && q.catch) q.catch(function () {}); } };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) play(); else vid.pause(); }); }, { threshold: 0.35 }).observe(vid);
    } else play();
    vb.addEventListener("click", function () {
      userPaused = !vid.paused; if (userPaused) vid.pause(); else play();
      vb.textContent = userPaused ? "Phát" : "Tạm dừng"; vb.setAttribute("aria-label", vb.textContent);
    });
    vid.addEventListener("error", function () { vb.hidden = true; }, true);
  }

  // ---- số liệu thật từ máy chủ ----
  function fmt(n) { return Number(n).toLocaleString("vi-VN"); }
  function countUp(el, to) {
    if (reduce || to < 2) { el.textContent = fmt(to); return; }
    var t0 = performance.now(), dur = 1200;
    (function tick(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(to * e));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  fetch("/api/public-stats", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || typeof d.accounts !== "number" || d.accounts < 1) return; // máy chủ mới / vừa reset thì không khoe số 0
    var GOAL = 100000;
    document.getElementById("stats").hidden = false;
    countUp(document.getElementById("n-acc"), d.accounts);
    countUp(document.getElementById("n-post"), d.posts || 0);
    var pct = Math.min(100, (d.accounts / GOAL) * 100);
    var bar = document.getElementById("goal-bar");
    bar.setAttribute("aria-valuenow", String(d.accounts));
    setTimeout(function () { document.getElementById("goal-fill").style.width = pct + "%"; }, 200);
    document.getElementById("goal-note").textContent = "Đây là số thật đếm từ database, còn " + fmt(Math.max(0, GOAL - d.accounts)) + " tài khoản nữa tới mục tiêu.";
    if (d.accounts > 0) {
      var line = document.getElementById("statline");
      document.getElementById("stat-text").textContent = fmt(d.accounts) + " tài khoản đang dùng";
      line.hidden = false;
    }
  }).catch(function () { /* không có số liệu thì ẩn khối */ });

  // ---- nút tải APK: chỉ bật khi file thật sự có trên máy chủ ----
  var APK = "/static/downloads/LockCOC.apk";
  var btn = document.getElementById("apk-btn");
  var txt = document.getElementById("apk-text");
  var note = document.getElementById("apk-note");
  fetch(APK, { method: "HEAD", credentials: "same-origin" }).then(function (r) {
    var ct = r.headers.get("content-type") || "";
    if (r.ok && ct.indexOf("text/html") === -1) {
      var len = Number(r.headers.get("content-length") || 0);
      btn.href = APK; btn.setAttribute("download", "LockCOC.apk"); btn.setAttribute("aria-disabled", "false");
      txt.textContent = "Tải LockCOC.apk" + (len ? " (" + (len / 1048576 < 0.1 ? Math.max(1, Math.round(len / 1024)) + " KB" : (len / 1048576).toFixed(1) + " MB") + ")" : "");
      note.textContent = "Chỉ nên tải file từ đúng trang này.";
      var hb = document.getElementById("hero-apk");
      hb.href = APK; hb.setAttribute("download", "LockCOC.apk");
      var hm = document.getElementById("hero-meta");
      hm.textContent = "Android · " + (len ? (len / 1048576 < 0.1 ? Math.max(1, Math.round(len / 1024)) + " KB" : (len / 1048576).toFixed(1) + " MB") : "APK") + " · miễn phí";
    } else { throw new Error("none"); }
  }).catch(function () {
    txt.textContent = "Bản APK sắp có";
    note.textContent = "Chưa có file APK trên máy chủ. Trong lúc chờ, bạn vẫn dùng được ngay trên trình duyệt.";
    document.getElementById("hero-apk").href = "/app";
    document.getElementById("hero-apk-text").textContent = "Dùng ngay trên trình duyệt";
  });

  // ---- hiện dần khi cuộn ----
  var items = document.querySelectorAll(".block, .closer, .facts");
  if ("IntersectionObserver" in window && !reduce) {
    items.forEach(function (n) { n.classList.add("rv"); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    items.forEach(function (n) { io.observe(n); });
  }
})();
