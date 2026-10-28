"use strict";
/* advanced.js - nội dung 2 tab mới của "LockCOC Advanced features": Photobooth (sau khi chụp) và Thử thách */
(function () {
  var NEED = { single: 1, polaroid: 1, cuts: 4, duo: 2 };
  function LB() { return window.lcBooth; }

  function filmOnly(blob, css) {
    return createImageBitmap(blob).then(function (bm) {
      var s = Math.min(1, 1440 / Math.max(bm.width, bm.height)), c = document.createElement("canvas");
      c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s);
      var g = c.getContext("2d"); if (css && css !== "none") g.filter = css; g.drawImage(bm, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.92); });
    });
  }
  function waitCam(ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function chk() {
        var busy = document.querySelector("#overlay-root .overlay");
        if (!busy && typeof cam !== "undefined" && cam.stream) return res(true);
        if (Date.now() - t0 > ms) return res(false);
        setTimeout(chk, 150);
      })();
    });
  }

  function booth(ed, body, onChange, rerender, closeStudio) {
    var B = LB();
    if (!B) { body.append(el("p", { class: "fine" }, "Photobooth chưa sẵn sàng, hãy tải lại trang.")); return; }
    var snd = el("button", { class: "chip" + (B.sndOn() ? " on" : ""), type: "button", onclick: function () { B.sndSet(!B.sndOn()); rerender(); } }, B.sndOn() ? "Tiếng chụp: Bật" : "Tiếng chụp: Tắt");
    if (ed.kind === "video") {
      body.append(el("p", { class: "fine" }, "Photobooth (Polaroid, 4-Cuts, Duo, màu phim) chỉ áp dụng cho ảnh. Với video bạn vẫn dùng được Nhạc, Chữ, Widget và Thử thách."), el("div", { class: "hrow" }, snd));
      return;
    }
    if (!ed.shots) { ed.shots = [ed.image]; ed.bmode = "single"; }
    var mode = ed.bmode || "single", seq = 0, prev = el("img", { class: "adv-prev", alt: "Xem trước" }), url = null;
    function showPrev() { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(ed.image); prev.src = url; }
    var info = el("small", { class: "fine" });
    var more = el("div", { class: "hrow" });
    async function apply() {
      var my = ++seq, n = NEED[mode], have = ed.shots.length;
      more.replaceChildren();
      if (mode !== "single" && have < n) {
        info.textContent = "Kiểu này cần " + n + " ảnh, bạn mới có " + have + ".";
        more.append(
          el("button", { class: "btn small primary", type: "button", onclick: function () { go(ed.shots.slice()); } }, el("span", { class: "btn-label" }, "Chụp thêm " + (n - have) + " tấm")),
          have > 1 ? el("button", { class: "btn small", type: "button", onclick: function () { go([]); } }, el("span", { class: "btn-label" }, "Chụp lại từ đầu")) : null);
        return;
      }
      info.textContent = mode === "single" ? "Giữ ảnh gốc, có thể thêm màu phim." : ("Đã ghép từ " + n + " ảnh. Đổi khung, màu phim hay hiệu ứng thoải mái.");
      if (mode !== "single") more.append(el("button", { class: "btn small", type: "button", onclick: function () { go([]); } }, el("span", { class: "btn-label" }, "Chụp lại bộ ảnh")));
      try {
        var out = mode === "single" ? (B.B.film === "none" ? ed.shots[0] : await filmOnly(ed.shots[0], B.pick(B.FILMS, B.B.film).css)) : await B.render(mode, ed.shots.slice(0, n));
        if (my !== seq || !out) return;
        ed.image = out; ed.bmode = mode; showPrev(); if (ed._rm) ed._rm(); onChange();
      } catch (e) { toast("Không áp dụng được: " + (e && e.message || "lỗi"), "error"); }
    }
    function go(pre) {
      closeStudio();
      var x = document.querySelector("#overlay-root .ov-head .icon-btn"); if (x) x.click();
      waitCam(7000).then(function (ok) { if (!ok) return toast("Camera chưa bật, hãy thử lại.", "error"); B.run(mode, pre); });
    }
    var modes = el("div", { class: "hrow" }, ...[["single", "Gốc"], ["polaroid", "Polaroid"], ["cuts", "4-Cuts"], ["duo", "Duo"]].map(function (m) {
      return el("button", { class: "chip" + (mode === m[0] ? " on" : ""), type: "button", onclick: function () { ed.bmode = m[0]; rerender(); } }, m[1]);
    }));
    // render lại cả tab sau khi đổi kiểu để hiện đúng tuỳ chọn
    var frames = el("div", { class: "hrow" }, ...B.FRAMES.map(function (f) { return el("button", { class: "dotbtn" + (B.B.frame === f.id ? " on" : ""), type: "button", "aria-label": f.n, title: f.n, style: { background: f.dot }, onclick: function () { B.B.frame = f.id; B.save(); rerender(); } }); }));
    var films = el("div", { class: "hrow" }, ...B.FILMS.map(function (f) { return el("button", { class: "chip" + (B.B.film === f.id ? " on" : ""), type: "button", onclick: function () { B.B.film = f.id; B.save(); rerender(); } }, f.n); }));
    var fx = el("div", { class: "hrow" }, ...(mode === "single" ? [] : [
      el("button", { class: "chip" + (B.B.led ? " on" : ""), type: "button", onclick: function () { B.B.led = !B.B.led; B.save(); rerender(); } }, "Ngày LED"),
      el("button", { class: "chip" + (B.B.grain ? " on" : ""), type: "button", onclick: function () { B.B.grain = !B.B.grain; B.save(); rerender(); } }, "Hạt phim")]), snd);
    body.append(prev, el("div", { class: "sec" }, icon("image"), "Kiểu ảnh"), modes, info, more);
    if (mode !== "single") body.append(el("div", { class: "sec" }, icon("layers"), "Khung"), frames);
    body.append(el("div", { class: "sec" }, icon("palette"), "Màu phim"), films);
    body.append(el("div", { class: "sec" }, icon("sparkle"), "Hiệu ứng"), fx);
    showPrev(); apply();
  }

  function daily(body) {
    var D = window.lcDaily;
    if (!D) { body.append(el("p", { class: "fine" }, "Chưa tải được thử thách.")); return; }
    function draw() {
      card.replaceChildren(
        el("small", {}, "Thử thách hôm nay"), el("strong", { class: "adv-ch" }, D.text),
        el("small", {}, D.streak() ? D.streak() + " ngày liên tiếp" : "Chưa bắt đầu chuỗi"),
        el("button", { class: "chip" + (D.on() || D.done() ? " on" : ""), type: "button", disabled: D.done(), onclick: function () { D.toggle(); draw(); } },
          D.done() ? "Đã làm hôm nay" : (D.on() ? "Đang gắn vào bài đăng" : "Tham gia và gắn vào bài này")));
    }
    var card = el("div", { class: "daily-card adv-daily" }); draw();
    body.append(card, el("p", { class: "fine" }, "Khi tham gia, bài đăng này sẽ có thêm dòng 🎯 và tính một ngày vào chuỗi thử thách."));
    var links = el("div", { class: "hrow" }, el("a", { class: "chip", href: "/memories#day" }, "Ngày này năm xưa"), el("a", { class: "chip", href: "/memories#wrap" }, "Wrapped"), el("a", { class: "chip", href: "/memories#film" }, "Phim kỷ niệm"));
    body.append(el("div", { class: "sec" }, icon("sparkle"), "Kỷ niệm"), links);
    D.otd().then(function (n) { if (n) links.firstChild.textContent = "Ngày này năm xưa (" + n + ")"; });
  }
  window.lcAdv = { booth: booth, daily: daily };
})();
