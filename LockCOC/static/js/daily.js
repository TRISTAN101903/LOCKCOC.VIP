"use strict";
/* daily.js - Thử thách ngày + nhắc "Ngày này năm xưa" */
(function () {
  var P = ["Chụp một thứ màu xanh", "Bữa ăn hôm nay của bạn", "Góc bàn làm việc", "Bầu trời lúc này", "Đôi giày bạn đang mang", "Thứ làm bạn cười hôm nay", "Ly nước bạn đang uống", "Chụp bóng của bạn", "Một thứ tròn tròn", "Con đường bạn đi qua", "Món đồ cũ nhất bạn có", "Thứ bạn nhìn thấy từ cửa sổ", "Selfie không nhìn camera", "Một thứ màu đỏ", "Góc phòng yên bình nhất", "Thứ bạn đang nghe", "Bàn tay bạn đang làm gì", "Cây cối quanh bạn", "Một thứ nhỏ xíu", "Thứ bạn không thể thiếu mỗi sáng", "Chụp ánh sáng đẹp nhất hôm nay", "Đồ uống yêu thích", "Một thứ có chữ", "Thú cưng hoặc thứ gì đó dễ thương", "Màn hình điện thoại bạn", "Thứ làm bạn thấy bình yên", "Một cặp đôi đồ vật", "Chụp từ góc thấp", "Chụp từ trên xuống", "Một thứ bạn tự làm"];
  var d = new Date(), day = Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5), key = "lc_chal_" + day;
  var text = P[day % P.length];
  function get(k, f) { try { var v = localStorage.getItem(k); return v == null ? f : v; } catch (e) { return f; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }
  function days() { try { return JSON.parse(get("lc_chal_done", "[]")); } catch (e) { return []; } }
  function streak() { var a = days(), s = 0, cur = get(key + "_ok", "") ? day : day - 1; while (a.indexOf(cur) >= 0) { s++; cur--; } return s; }

  var box = null, tog = null, meta = null;
  function on() { return get(key, "0") === "1"; }
  function done() { return days().indexOf(day) >= 0; }
  function paint() {
    if (!box) return;
    tog.textContent = done() ? "Đã làm hôm nay" : (on() ? "Đang gắn vào bài" : "Tham gia");
    tog.classList.toggle("on", on() || done()); tog.disabled = done();
    var s = streak(); meta.textContent = s ? (s + " ngày liên tiếp") : "Chưa bắt đầu";
  }
  function mount() {
    var hint = document.getElementById("cam-hint");
    if (!hint || box) return;
    box = document.createElement("div"); box.className = "daily-card";
    var t = document.createElement("div"); t.className = "dc-text";
    var h = document.createElement("small"); h.textContent = "Thử thách hôm nay"; var b = document.createElement("strong"); b.textContent = text; meta = document.createElement("small"); meta.className = "dc-meta";
    t.append(h, b, meta);
    tog = document.createElement("button"); tog.type = "button"; tog.className = "chip dc-btn";
    tog.addEventListener("click", function () { set(key, on() ? "0" : "1"); paint(); });
    box.append(t, tog); hint.parentNode.insertBefore(box, hint); paint();
    var cache = get("lc_otd_" + day, null);
    if (cache !== null) { nudge(Number(cache)); return; }
    fetch("/api/memories/onthisday?tz=" + new Date().getTimezoneOffset(), { headers: { "X-LockCOC": "1" }, credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (!j) return; set("lc_otd_" + day, String(j.items.length)); nudge(j.items.length); }).catch(function () {});
  }
  function nudge(n) {
    if (!n || !box || document.querySelector(".otd-chip")) return;
    var a = document.createElement("a"); a.className = "otd-chip"; a.href = "/memories#day"; a.textContent = "Ngày này năm xưa: " + n + " kỷ niệm";
    box.parentNode.insertBefore(a, box.nextSibling);
  }
  var _api = api;
  api = function (path, opts) {
    var fd = path === "/api/post" && opts && opts.form, used = false;
    if (fd && on() && !done() && typeof fd.get === "function") {
      var c = String(fd.get("caption") || "").trim(), pre = "🎯 " + text;
      if (c.indexOf("🎯") !== 0) { fd.set("caption", (pre + (c ? " · " + c : "")).slice(0, 300)); used = true; }
    }
    return _api(path, opts).then(function (r) {
      if (used) { var a = days(); if (a.indexOf(day) < 0) a.push(day); set("lc_chal_done", JSON.stringify(a.slice(-400))); set(key + "_ok", "1"); paint(); }
      return r;
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  new MutationObserver(function () { if (!box || !box.isConnected) { box = null; mount(); } }).observe(document.body, { childList: true, subtree: true });
})();
