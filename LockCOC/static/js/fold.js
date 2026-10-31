"use strict";
/* fold.js - trang giới thiệu: chỉ hiện tính năng HOT, phần còn lại bấm "Xem thêm" */
(function () {
  var grid = document.querySelector("#tinh-nang .grid");
  if (!grid) return;
  var HOT = /^(Chat kiểu mới|Chụp Đêm|Chụp liên tiếp|Photobooth|Ngày này năm xưa|Wrapped|Thẻ nhạc)/;
  var arts = Array.prototype.slice.call(grid.children), extra = [];
  arts.forEach(function (a) {
    var h = a.querySelector("h3"), t = h ? h.textContent.trim() : "";
    if (HOT.test(t)) {
      a.classList.add("hot");
      var em = document.createElement("em"); em.className = "hotb"; em.textContent = "HOT";
      var old = h.querySelector(".nw"); if (old) old.remove();
      h.appendChild(em);
    } else { a.classList.add("more"); extra.push(a); }
  });
  if (!extra.length) return;
  grid.classList.add("fold");
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "btn btn-ghost fold-btn"; btn.setAttribute("aria-expanded", "false");
  btn.textContent = "Xem thêm " + extra.length + " tính năng";
  btn.addEventListener("click", function () {
    var open = grid.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? "Thu gọn" : "Xem thêm " + extra.length + " tính năng";
  });
  grid.parentNode.insertBefore(btn, grid.nextSibling);
})();
