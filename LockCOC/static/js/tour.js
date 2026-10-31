"use strict";
/* tour.js - video giao diện app: tự phát khi cuộn tới, có nút tạm dừng */
(function () {
  var v = document.getElementById("tour-vid"), b = document.getElementById("tour-btn");
  if (!v || !b) return;
  var paused = false, still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function label() { b.textContent = v.paused ? "Phát" : "Tạm dừng"; }
  b.addEventListener("click", function () { if (v.paused) { paused = false; v.play().catch(function () {}); } else { paused = true; v.pause(); } label(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && !paused && !still) v.play().catch(function () {}); else v.pause(); label(); });
    }, { threshold: 0.45 }).observe(v);
  }
  label();
})();
