"use strict";
/* lockflow.js - mã khóa app riêng cho từng tài khoản: sau khi đăng nhập hiện thông báo cấp mã (chờ 15 giây), hiện mã và bắt buộc sao chép mới tắt */
(function () {
  if (typeof api !== "function" || typeof el !== "function") return;
  var WAIT = 15;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.className = "lk-ta"; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; } ta.remove(); ok ? res() : rej(new Error("copy"));
    });
  }
  window.lcIssueCode = function () {
    return new Promise(function (resolve) {
      var title = el("h3", {}, "Đang cấp mã khóa app cho bạn…");
      var sub = el("p", { class: "lk-sub" }, "Vui lòng đợi " + WAIT + " giây");
      var fill = el("i", { class: "lk-fill" });
      var bar = el("div", { class: "lk-bar" }, fill);
      var codeBox = el("div", { class: "lk-code hidden" });
      var note = el("p", { class: "lk-note hidden" }, "Hãy sao chép mã này và cất giữ cẩn thận. Bạn cần mã này mỗi lần mở app. Thông báo chỉ tắt sau khi bạn bấm Sao chép.");
      var btn = el("button", { class: "btn primary block hidden", type: "button" }, el("span", { class: "btn-label" }, "Sao chép mã"));
      var manual = el("button", { class: "btn block hidden", type: "button" }, el("span", { class: "btn-label" }, "Tôi đã ghi lại mã"));
      var card = el("div", { class: "lk-card glass" }, el("img", { src: "/static/logo.svg", alt: "", width: "56", height: "56" }), title, sub, bar, codeBox, note, btn, manual);
      var ov = el("div", { class: "lk-issue", role: "dialog", "aria-modal": "true" }, card);
      document.body.appendChild(ov);
      requestAnimationFrame(function () { fill.style.transitionDuration = WAIT + "s"; fill.style.width = "100%"; });
      var left = WAIT, tk = setInterval(function () { left = Math.max(0, left - 1); if (left > 0) sub.textContent = "Còn " + left + " giây"; }, 1000);
      async function finish() { try { await api("/api/lock-code/ack", { method: "POST", json: {} }); } catch (e) { /* bỏ qua */ } ov.remove(); resolve(); }
      async function fetchCode() {
        await sleep(WAIT * 1000);
        for (var i = 0; i < 8; i++) {
          try { var d = await api("/api/lock-code/issue"); if (d.code) return d.code; await sleep(Math.max(1, d.wait || 1) * 1000); }
          catch (e) { sub.textContent = e.message || "Không cấp được mã, thử lại…"; if (/hết phiên|đăng nhập lại/i.test(e.message || "")) throw e; await sleep(2000); }
        }
        throw new Error("Không cấp được mã, hãy đăng nhập lại.");
      }
      fetchCode().then(function (code) {
        clearInterval(tk); title.textContent = "Mã khóa app của bạn"; sub.textContent = "Mã này dành riêng cho tài khoản của bạn";
        bar.classList.add("hidden"); codeBox.textContent = code; [codeBox, note, btn].forEach(function (x) { x.classList.remove("hidden"); });
        btn.addEventListener("click", function () {
          copyText(code).then(function () { btn.querySelector(".btn-label").textContent = "Đã sao chép ✓"; btn.disabled = true; setTimeout(finish, 900); },
            function () { manual.classList.remove("hidden"); toast("Không sao chép tự động được, hãy ghi lại mã rồi bấm nút bên dưới", "error"); });
        });
        manual.addEventListener("click", finish);
      }).catch(function (e) {
        clearInterval(tk); title.textContent = "Chưa cấp được mã"; sub.textContent = e.message || "Lỗi"; bar.classList.add("hidden");
        var b = el("button", { class: "btn primary block", type: "button" }, el("span", { class: "btn-label" }, "Đăng nhập lại"));
        b.addEventListener("click", function () { ov.remove(); resolve(); }); card.appendChild(b);
      });
    });
  };
  var other = document.getElementById("lock-other");
  if (other) other.addEventListener("click", function () { if (typeof showLogin === "function") showLogin(true); });
})();
