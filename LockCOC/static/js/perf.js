"use strict";
/* perf.js - chế độ mượt (mặc định), bật/tắt hiệu ứng nặng, tải app nhanh bằng service worker */
(function () {
  var root = document.documentElement;
  function get() { try { return localStorage.getItem("lc_fx") === "1"; } catch (e) { return false; } }
  function apply() { root.classList.toggle("lite", !get()); }
  apply();
  window.lcPerf = { pretty: get, set: function (v) { try { localStorage.setItem("lc_fx", v ? "1" : "0"); } catch (e) { /* bỏ qua */ } apply(); } };

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { /* bỏ qua */ });
    });
    navigator.serviceWorker.addEventListener("message", function (e) {
      if (!e.data || e.data.t !== "upd" || document.querySelector(".upd-pill")) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "upd-pill"; b.textContent = "Có bản cập nhật mới · chạm để tải lại";
      b.addEventListener("click", function () { location.reload(); });
      document.body.appendChild(b);
    });
  }
})();
