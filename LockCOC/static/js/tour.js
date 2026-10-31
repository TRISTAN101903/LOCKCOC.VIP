"use strict";
/* tour.js - hai video: Giới thiệu (kiểu keynote) và Giao diện. Tự phát khi cuộn tới, có nút tạm dừng */
(function () {
  var v = document.getElementById("tour-vid"), b = document.getElementById("tour-btn"), box = document.querySelector(".tour-in");
  if (!v || !b) return;
  var paused = false, still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SRC = { keynote: ["/static/downloads/keynote.mp4", "/static/downloads/keynote-poster.jpg", "16 / 9"], intro: ["/static/downloads/intro.mp4", "/static/downloads/intro-poster.jpg", "828 / 1720"], tour: ["/static/downloads/tour.mp4", "/static/downloads/tour-poster.jpg", "828 / 1900"] };
  function label() { b.textContent = v.paused ? "Phát" : "Tạm dừng"; }
  function pick(k) {
    var s = SRC[k]; if (!s) return;
    Array.prototype.forEach.call(document.querySelectorAll(".tour-tab"), function (t) { var on = t.dataset.k === k; t.classList.toggle("on", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    box.style.aspectRatio = s[2]; box.classList.toggle("wide", k === "keynote"); v.poster = s[1]; v.src = s[0]; v.load(); paused = false;
    v.play().catch(function () {}); setTimeout(label, 150);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tour-tab"), function (t) { t.addEventListener("click", function () { pick(t.dataset.k); }); });
  b.addEventListener("click", function () { if (v.paused) { paused = false; v.play().catch(function () {}); } else { paused = true; v.pause(); } label(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && !paused && !still) v.play().catch(function () {}); else v.pause(); label(); });
    }, { threshold: 0.45 }).observe(v);
  }
  label();
})();
