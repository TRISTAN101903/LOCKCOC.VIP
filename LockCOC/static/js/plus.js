"use strict";
/* plus.js - mục LockCOC Plus: Photobooth, kỷ niệm, thử thách, hiệu năng (tách khỏi phần Locket) */
(function () {
  var page = document.getElementById("page-plus");
  var btn = document.getElementById("btn-plus");
  if (!page) return;

  function card(title, sub, ic, onclick, href) {
    var tag = href ? "a" : "button", n = el(tag, { class: "row-item plus-row", type: href ? null : "button", href: href || null, onclick: onclick || null },
      icon(ic), el("div", { class: "meta" }, el("strong", {}, title), el("small", {}, sub)), icon("chev", "i go"));
    return n;
  }
  function boothCard(mode, title, sub, shots) {
    return el("button", { class: "plus-booth", type: "button", onclick: () => { if (window.lcBooth) { window.lcBooth.start(mode); goPage("camera"); } } },
      el("span", { class: "pb-n" }, shots), el("strong", {}, title), el("small", {}, sub));
  }
  function render() {
    var D = window.lcDaily, B = window.lcBooth, P = window.lcPerf;
    var memRow = card("Ngày này năm xưa", "Ảnh và video cùng ngày các năm trước", "image", null, "/memories#day");
    var daily = el("div", { class: "daily-card adv-daily plus-daily" });
    function drawDaily() {
      if (!D) return;
      daily.replaceChildren(el("small", {}, "Thử thách hôm nay"), el("strong", { class: "adv-ch" }, D.text),
        el("small", {}, D.streak() ? D.streak() + " ngày liên tiếp" : "Chưa bắt đầu chuỗi"),
        el("button", { class: "chip" + (D.on() || D.done() ? " on" : ""), type: "button", disabled: D.done(), onclick: () => { D.toggle(); drawDaily(); } },
          D.done() ? "Đã làm hôm nay" : (D.on() ? "Đang gắn vào bài đăng kế tiếp" : "Tham gia (gắn vào bài đăng kế tiếp)")));
    }
    drawDaily();
    var fx = el("button", { class: "chip" + (P && P.pretty() ? " on" : ""), type: "button" }, P && P.pretty() ? "Hiệu ứng đẹp: Bật" : "Chế độ mượt: Bật");
    fx.addEventListener("click", () => { P.set(!P.pretty()); fx.classList.toggle("on", P.pretty()); fx.textContent = P.pretty() ? "Hiệu ứng đẹp: Bật" : "Chế độ mượt: Bật"; });
    var snd = el("button", { class: "chip" + (B && B.sndOn() ? " on" : ""), type: "button" }, B && B.sndOn() ? "Tiếng chụp: Bật" : "Tiếng chụp: Tắt");
    snd.addEventListener("click", () => { B.sndSet(!B.sndOn()); snd.classList.toggle("on", B.sndOn()); snd.textContent = B.sndOn() ? "Tiếng chụp: Bật" : "Tiếng chụp: Tắt"; });
    page.replaceChildren(
      el("header", { class: "page-head" }, el("h1", {}, "LockCOC Plus ", icon("star", "i s")), el("button", { class: "chip", type: "button", onclick: () => goPage("camera") }, "Đóng")),
      el("div", { class: "plus-body" },
        el("p", { class: "fine plus-lead" }, "Những tính năng ngoài Locket gốc. Camera chính giờ chỉ còn chụp và quay cho gọn."),
        el("div", { class: "sec" }, icon("camera"), "Chụp Photobooth"),
        el("div", { class: "plus-booths" },
          boothCard("polaroid", "Polaroid", "Khung kem, ngày LED", "1"),
          boothCard("cuts", "4-Cuts", "Dải 4 tấm liền", "4"),
          boothCard("duo", "Duo 35mm", "2 tấm phim cuộn", "2")),
        el("div", { class: "sec" }, icon("flame"), "Thử thách"), daily,
        el("div", { class: "sec" }, icon("sparkle"), "Kỷ niệm và công cụ"),
        el("div", { class: "plus-list" }, memRow,
          card("Wrapped", "Tổng kết tháng, năm, xuất ảnh để khoe", "star", null, "/memories#wrap"),
          card("Phim kỷ niệm", "Tự ghép ảnh thành clip có nhạc", "video", null, "/memories#film"),
          card("Lưới ảnh", "Ghép nhiều ảnh thành một tấm vuông", "layers", null, "/memories#collage"),
          card("Sao lưu về máy", "Tải ảnh, video thành file ZIP", "list", null, "/memories#backup"),
          card("Thư viện ảnh", "Đồng bộ và xem toàn bộ ảnh Locket", "image", null, "/library")),
        el("div", { class: "sec" }, icon("clock"), "Tuỳ chọn"), el("div", { class: "hrow" }, fx, snd),
        el("p", { class: "fine" }, "Chế độ mượt tắt bớt hiệu ứng nặng để app chạy trơn hơn trên máy yếu hoặc mạng chậm.")));
    if (D) D.otd().then((n) => { if (n) memRow.querySelector("strong").textContent = "Ngày này năm xưa (" + n + ")"; });
  }
  var _gp = goPage;
  goPage = function (p) {
    if (p !== "camera" && window.lcBooth && window.lcBooth.B.mode !== "single") window.lcBooth.stop();
    _gp(p);
    if (p === "plus") render();
  };
  if (btn) btn.addEventListener("click", () => goPage("plus"));
})();
