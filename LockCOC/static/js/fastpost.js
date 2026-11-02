"use strict";
/* fastpost.js - đăng nhanh: nén ảnh lớn trước khi gửi và hiện phần trăm tải lên */
(function () {
  if (typeof api !== "function") return;
  var _api = api, pill = null;
  function say(t) {
    if (!pill) { pill = document.createElement("div"); pill.className = "fp-pill"; document.body.appendChild(pill); }
    pill.textContent = t; pill.classList.add("on");
  }
  function hide() { if (pill) pill.classList.remove("on"); }
  function shrink(file, maxSide) {
    return new Promise(function (res) {
      if (!file || !/^image\//.test(file.type || "image/jpeg") || file.size < 450 * 1024) return res(file);
      createImageBitmap(file).then(function (b) {
        var k = Math.min(1, maxSide / Math.max(b.width, b.height));
        if (k >= 1 && file.size < 1.4e6) return res(file);
        var c = document.createElement("canvas"); c.width = Math.round(b.width * k); c.height = Math.round(b.height * k);
        var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(b, 0, 0, c.width, c.height);
        c.toBlob(function (bl) { res(bl && bl.size < file.size ? new File([bl], String(file.name || "photo").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file); }, "image/jpeg", 0.86);
      }).catch(function () { res(file); });
    });
  }
  function send(path, fd) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest(); x.open("POST", path); x.setRequestHeader("X-LockCOC", "1"); x.withCredentials = true; x.timeout = 300000;
      x.upload.onprogress = function (e) { if (e.lengthComputable) { var p = Math.round(e.loaded / e.total * 100); say(p < 100 ? "Đang tải lên " + p + "%" : "Đang gửi lên Locket…"); } };
      x.onload = function () {
        hide(); var d = null; try { d = JSON.parse(x.responseText); } catch (e) { /* không phải JSON */ }
        if (x.status === 423) { if (typeof onLocked === "function") onLocked(); return reject(new Error("App đang khoá.")); }
        if (x.status === 401) { if (typeof onAuthLost === "function") onAuthLost(); return reject(new Error((d && d.error) || "Cần đăng nhập lại.")); }
        if (x.status < 200 || x.status >= 300) return reject(new Error((d && d.error) || "Lỗi " + x.status));
        resolve(d);
      };
      x.onerror = function () { hide(); reject(new Error("Không kết nối được tới server.")); };
      x.ontimeout = function () { hide(); reject(new Error("Quá thời gian chờ, thử lại với clip ngắn hơn.")); };
      x.send(fd);
    });
  }
  api = async function (path, opts) {
    if (path === "/api/post" && opts && opts.form instanceof FormData) {
      say("Đang chuẩn bị…");
      try { var fd = opts.form, im = fd.get("image"); if (im instanceof Blob) { var sm = await shrink(im, 1440); if (sm !== im) fd.set("image", sm, sm.name || "photo.jpg"); } } catch (e) { /* bỏ qua, gửi nguyên bản */ }
      return send(path, opts.form);
    }
    return _api.apply(this, arguments);
  };
})();
