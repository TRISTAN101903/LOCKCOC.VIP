"use strict";
(function () {
  // App đã cài như PWA/APK thì vào thẳng ứng dụng
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) { location.replace("/app"); return; }
  } catch (e) { /* bỏ qua */ }

  // Ảnh thật (nếu có) phủ lên hình minh họa: bỏ file vào static/promo/1.jpg ... 4.jpg
  document.querySelectorAll("[data-photo]").forEach(function (box) {
    var im = new Image();
    im.alt = "";
    im.decoding = "async";
    im.onload = function () { box.insertBefore(im, box.firstChild); box.classList.add("has-photo"); };
    im.src = box.getAttribute("data-photo");
  });

  // Demo đổi không khí
  var use = document.getElementById("demo-use");
  var t = document.getElementById("demo-title");
  var a = document.getElementById("demo-artist");
  var c = document.getElementById("demo-cap");
  var chips = document.querySelectorAll(".chip[data-scene]");
  chips.forEach(function (b) {
    b.addEventListener("click", function () {
      chips.forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-selected", "false"); });
      b.classList.add("on"); b.setAttribute("aria-selected", "true");
      use.setAttribute("href", "#s-" + b.dataset.scene);
      t.textContent = b.dataset.title; a.textContent = b.dataset.artist; c.textContent = b.dataset.cap;
    });
  });

  // Hiện dần khi cuộn
  var items = document.querySelectorAll(".block, .stubs li, .tile, .closer");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(function (n) { n.classList.add("rv"); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (n) { io.observe(n); });
  }
})();
