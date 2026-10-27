"use strict";
/* fx.js - hiệu ứng trang giới thiệu: tiến trình cuộn, hiện dần 2 chiều, nghiêng điện thoại, ánh sáng theo chuột */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement, top = document.querySelector(".top");
  var sp = document.createElement("div"); sp.className = "sp"; document.body.appendChild(sp);
  var phone = document.querySelector(".phone"), col = document.querySelector(".phone-col");
  var vbtn = document.getElementById("vid-btn"), note = document.querySelector(".cap-note");
  if (vbtn && col && note) col.insertBefore(vbtn, note);
  var ticking = false, lastY = window.scrollY;

  function frame() {
    ticking = false;
    var y = window.scrollY, max = Math.max(1, root.scrollHeight - window.innerHeight);
    sp.style.setProperty("--p", Math.min(1, y / max).toFixed(4));
    if (top) top.classList.toggle("scrolled", y > 24);
    if (col && !reduce && y < window.innerHeight * 1.6) col.style.setProperty("--py", (-y * 0.07).toFixed(1) + "px");
    lastY = y;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();
  if (reduce) return;

  // nghiêng điện thoại theo con trỏ (máy tính)
  if (phone && window.matchMedia("(hover: hover)").matches) {
    var hero = document.querySelector(".hero");
    hero.addEventListener("pointermove", function (e) {
      var r = phone.getBoundingClientRect(), dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      phone.style.setProperty("--ry", (dx * 16).toFixed(2) + "deg"); phone.style.setProperty("--rx", (-dy * 12).toFixed(2) + "deg");
    });
    hero.addEventListener("pointerleave", function () { phone.style.setProperty("--ry", "0deg"); phone.style.setProperty("--rx", "0deg"); });
  }

  // ánh sáng vàng đi theo chuột trên các thẻ
  document.addEventListener("pointermove", function (e) {
    var c = e.target.closest && e.target.closest(".grid article, .dl-card");
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  // hiện dần theo chiều cuộn, cuộn lên cũng có hiệu ứng
  if (!("IntersectionObserver" in window)) return;
  var list = [];
  function add(sel, dirFn, step) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (n, i) {
      n.classList.add("rv"); n.dataset.dir = dirFn(i); n.style.setProperty("--d", Math.min(i, 5) * step + "ms"); list.push(n);
    });
  }
  add(".block, .closer", function () { return "down"; }, 0);
  add(".facts div", function () { return "down"; }, 70);
  add(".grid article", function () { return "down"; }, 80);
  add(".dl-card", function (i) { return i % 2 ? "r" : "l"; }, 90);
  add(".faq details", function () { return "down"; }, 60);
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var n = e.target;
      if (e.isIntersecting) { n.classList.add("in"); }
      else { n.dataset.dir = e.boundingClientRect.top < 0 ? "up" : (n.dataset.dir === "l" || n.dataset.dir === "r" ? n.dataset.dir : "down"); n.classList.remove("in"); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  list.forEach(function (n) { io.observe(n); });
})();
