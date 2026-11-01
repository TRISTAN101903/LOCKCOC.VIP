"use strict";
/* apkcheck.js - nút tải APK độc lập: không phụ thuộc script khác, tự bật nút sau tối đa 3 giây */
(function () {
  var APK = "/static/downloads/LockCOC.apk", btn = document.getElementById("apk-btn"), txt = document.getElementById("apk-text"), note = document.getElementById("apk-note");
  if (!btn || !txt) return;
  function enable(len) {
    btn.href = APK; btn.setAttribute("download", "LockCOC.apk"); btn.setAttribute("aria-disabled", "false");
    txt.textContent = "Tải LockCOC.apk" + (len ? " (" + (len / 1048576).toFixed(1) + " MB)" : "");
    if (note) note.textContent = "Chỉ tải file từ đúng trang này. Android sẽ hỏi quyền cài từ nguồn không xác định.";
  }
  setTimeout(function () {
    if (!/Đang kiểm tra/.test(txt.textContent)) return;
    var done = false, t = setTimeout(function () { if (!done) { done = true; enable(0); } }, 4000);
    fetch(APK, { method: "HEAD", credentials: "same-origin" }).then(function (r) {
      if (done) return; done = true; clearTimeout(t);
      var ct = r.headers.get("content-type") || "";
      if (r.ok && ct.indexOf("text/html") === -1) enable(Number(r.headers.get("content-length") || 0));
      else { txt.textContent = "Bản APK sắp có"; if (note) note.textContent = "Chủ trang đang cập nhật file APK, bạn vẫn dùng được ngay trên trình duyệt."; }
    }).catch(function () { if (done) return; done = true; clearTimeout(t); enable(0); });
  }, 2500);
})();
