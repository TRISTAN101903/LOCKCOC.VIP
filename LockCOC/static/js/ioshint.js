"use strict";
(function () {
  var b = document.getElementById("ios-btn"); if (!b) return;
  var ua = navigator.userAgent || "", ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var safari = ios && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Zalo|Line\/|; wv\)/i.test(ua);
  var note = document.createElement("p"); note.className = "fine ios-note";
  if (ios && !safari) {
    note.textContent = "Trình duyệt này không cài được hồ sơ. Hãy mở trang bằng Safari (bấm nút để sao chép liên kết).";
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var u = location.origin + "/";
      try { navigator.clipboard.writeText(u); } catch (x) { /* bỏ qua */ }
      alert("Hãy dán liên kết này vào Safari rồi bấm lại nút tải:\n" + u);
    });
  } else if (!ios) {
    note.textContent = "Nút này dành cho iPhone và iPad. Máy Android hãy dùng nút Tải APK.";
  } else {
    note.textContent = "Không được? Mở bằng Safari, bấm Chia sẻ, chọn Thêm vào MH chính.";
  }
  b.insertAdjacentElement("afterend", note);
})();
