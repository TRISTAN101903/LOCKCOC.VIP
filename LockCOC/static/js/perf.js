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
    var upTimer = 0;
    function applyUpdate() {
      var busy = document.querySelector(".overlay:not(.hidden), .sheet-pick");
      if (busy) { upTimer = setTimeout(applyUpdate, 4000); return; }
      location.reload();
    }
    navigator.serviceWorker.addEventListener("message", function (e) {
      if (!e.data || e.data.t !== "upd" || upTimer) return;
      var last = 0; try { last = +sessionStorage.getItem("lc_upd") || 0; } catch (x) { /* bỏ qua */ }
      if (Date.now() - last < 60000) return;
      try { sessionStorage.setItem("lc_upd", String(Date.now())); } catch (x) { /* bỏ qua */ }
      upTimer = setTimeout(applyUpdate, 700);
    });
  }
})();
