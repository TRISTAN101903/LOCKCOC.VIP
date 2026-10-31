"use strict";
/* reveal.js - thẻ tính năng, bảng so sánh, câu hỏi tung lên khi cuộn tới (kiểu keynote) */
(function () {
  if (!("IntersectionObserver" in window) || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
  var items = document.querySelectorAll(".grid > article, .dl-card, .compare tbody tr, .faq details, .facts > div, h2");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var n = e.target, i = Array.prototype.indexOf.call(n.parentNode.children, n);
      n.style.transitionDelay = Math.min(i, 8) * 55 + "ms";
      n.classList.add("rv-in"); io.unobserve(n);
    });
  }, { threshold: 0.12 });
  Array.prototype.forEach.call(items, function (n) { n.classList.add("rv"); io.observe(n); });
})();
