"use strict";
/* x32.js - trang LockCOC Plus gọn: chỉ vài mục quen thuộc, còn lại bấm "Xem thêm" */
(function () {
  var _gp = goPage;
  goPage = function (p) {
    _gp(p);
    if (p !== "plus") return;
    var list = document.querySelector("#page-plus .plus-list");
    if (!list || list.dataset.fold) return;
    list.dataset.fold = "1";
    var rows = Array.prototype.slice.call(list.children), KEEP = 3;
    if (rows.length <= KEEP) return;
    rows.slice(KEEP).forEach(function (r) { r.classList.add("fold-hide"); });
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip plus-more"; b.textContent = "Xem thêm " + (rows.length - KEEP) + " mục";
    b.addEventListener("click", function () {
      var open = list.classList.toggle("unfold");
      b.textContent = open ? "Thu gọn" : "Xem thêm " + (rows.length - KEEP) + " mục";
    });
    list.parentNode.insertBefore(b, list.nextSibling);
  };
})();
