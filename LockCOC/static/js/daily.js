"use strict";
/* daily.js - Thử thách ngày (nằm trong LockCOC Advanced features) */
(function () {
  var P = ["Chụp một thứ màu xanh", "Bữa ăn hôm nay của bạn", "Góc bàn làm việc", "Bầu trời lúc này", "Đôi giày bạn đang mang", "Thứ làm bạn cười hôm nay", "Ly nước bạn đang uống", "Chụp bóng của bạn", "Một thứ tròn tròn", "Con đường bạn đi qua", "Món đồ cũ nhất bạn có", "Thứ bạn nhìn thấy từ cửa sổ", "Selfie không nhìn camera", "Một thứ màu đỏ", "Góc phòng yên bình nhất", "Thứ bạn đang nghe", "Bàn tay bạn đang làm gì", "Cây cối quanh bạn", "Một thứ nhỏ xíu", "Thứ bạn không thể thiếu mỗi sáng", "Chụp ánh sáng đẹp nhất hôm nay", "Đồ uống yêu thích", "Một thứ có chữ", "Thứ gì đó dễ thương", "Màn hình điện thoại bạn", "Thứ làm bạn thấy bình yên", "Một cặp đôi đồ vật", "Chụp từ góc thấp", "Chụp từ trên xuống", "Một thứ bạn tự làm"];
  var d = new Date(), day = Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5), key = "lc_chal_" + day, text = P[day % P.length];
  function get(k, f) { try { var v = localStorage.getItem(k); return v == null ? f : v; } catch (e) { return f; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }
  function days() { try { return JSON.parse(get("lc_chal_done", "[]")); } catch (e) { return []; } }
  function on() { return get(key, "0") === "1"; }
  function done() { return days().indexOf(day) >= 0; }
  function streak() { var a = days(), s = 0, cur = done() ? day : day - 1; while (a.indexOf(cur) >= 0) { s++; cur--; } return s; }
  function otd() {
    var c = get("lc_otd_" + day, null);
    if (c !== null) return Promise.resolve(Number(c));
    return fetch("/api/memories/onthisday?tz=" + d.getTimezoneOffset(), { headers: { "X-LockCOC": "1" }, credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (!j) return 0; set("lc_otd_" + day, String(j.items.length)); return j.items.length; }).catch(function () { return 0; });
  }
  window.lcDaily = { text: text, on: on, done: done, streak: streak, otd: otd, toggle: function () { set(key, on() ? "0" : "1"); } };
  var _api = api;
  api = function (path, opts) {
    var fd = path === "/api/post" && opts && opts.form, used = false;
    if (fd && on() && !done() && typeof fd.get === "function") {
      var c = String(fd.get("caption") || "").trim();
      if (c.indexOf("🎯") !== 0) { fd.set("caption", ("🎯 " + text + (c ? " · " + c : "")).slice(0, 300)); used = true; }
    }
    return _api(path, opts).then(function (r) {
      if (used) { var a = days(); if (a.indexOf(day) < 0) a.push(day); set("lc_chal_done", JSON.stringify(a.slice(-400))); }
      return r;
    });
  };
})();
