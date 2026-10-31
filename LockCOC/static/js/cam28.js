"use strict";
/* cam28.js - camera gọn: chế độ HOT hiện sẵn, còn lại nằm trong "Thêm"; tắt việc nền khi không ở trang camera */
(function () {
  var row = document.querySelector(".cam-modes");
  if (!row) return;
  var pills = {}, sep = row.querySelector(".sep");
  Array.prototype.forEach.call(row.querySelectorAll(".mode-pill"), function (b) { pills[b.textContent.trim()] = b; });
  var extraNames = ["Boomerang", "Lưới", "Đèn"], panel = document.createElement("div");
  panel.className = "cam-more hidden";
  extraNames.forEach(function (n) { if (pills[n]) panel.appendChild(pills[n]); });
  if (sep) sep.remove();
  var more = document.createElement("button");
  more.type = "button"; more.className = "mode-pill tool more-btn"; more.setAttribute("aria-expanded", "false"); more.textContent = "Thêm ▾";
  row.appendChild(more);
  row.parentNode.insertBefore(panel, row.nextSibling);
  function sync() {
    var open = !panel.classList.contains("hidden");
    more.textContent = open ? "Thêm ▴" : "Thêm ▾"; more.setAttribute("aria-expanded", open ? "true" : "false");
    more.classList.toggle("on", !open && extraNames.some(function (n) { return pills[n] && pills[n].classList.contains("on"); }));
  }
  more.addEventListener("click", function () { panel.classList.toggle("hidden"); sync(); });
  panel.addEventListener("click", function () { setTimeout(sync, 50); });
  if (pills["Boomerang"] && pills["Boomerang"].classList.contains("on")) panel.classList.remove("hidden");
  sync();
})();
