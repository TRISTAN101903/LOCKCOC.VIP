"use strict";
/* lockflow.js - mã khóa app riêng cho từng tài khoản (hiệu lực 7 ngày).
   Chỉ cấp mã khi tài khoản chưa có mã còn hạn; có rồi thì đăng nhập vào thẳng. */
(function () {
  if (typeof api !== "function" || typeof el !== "function") return;
  var WAIT = 15, needIssue = true;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var _api = api;
  api = async function (path) {
    var r = await _api.apply(this, arguments);
    if (path === "/api/login") needIssue = !(r && r.issue === false);
    return r;
  };
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.className = "lk-ta"; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; } ta.remove(); ok ? res() : rej(new Error("copy"));
    });
  }
  function fmtDate(ts) { var d = new Date(ts * 1000); return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }
  var STEPS = ["Xác thực tài khoản", "Tạo mã riêng cho tài khoản", "Gắn hạn dùng 7 ngày"];

  window.lcIssueCode = function () {
    if (!needIssue) { needIssue = true; return Promise.resolve(); }
    return new Promise(function (resolve) {
      var NS = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 120 120");
      var tr = document.createElementNS(NS, "circle"), arc = document.createElementNS(NS, "circle");
      [tr, arc].forEach(function (c) { c.setAttribute("cx", "60"); c.setAttribute("cy", "60"); c.setAttribute("r", "54"); });
      tr.setAttribute("class", "lk-track"); arc.setAttribute("class", "lk-arc"); svg.append(tr, arc);
      var num = el("b", { class: "lk-num" }, String(WAIT)), unit = el("small", { class: "lk-unit" }, "giây");
      var mid = el("div", { class: "lk-mid" }, num, unit);
      var stage = el("div", { class: "lk-stage" }, svg, mid);
      var title = el("h3", {}, "Đang cấp mã khóa app");
      var sub = el("p", { class: "lk-sub" }, "Giữ nguyên màn hình trong giây lát");
      var lis = STEPS.map(function (t) { return el("li", {}, el("i", {}), el("span", {}, t)); });
      var steps = el("ul", { class: "lk-steps" }, ...lis);
      var codeBox = el("div", { class: "lk-code hidden" });
      var meta = el("p", { class: "lk-meta hidden" }, "");
      var note = el("p", { class: "lk-note hidden" }, "Cất mã cẩn thận, bạn cần nó để mở app. Thông báo chỉ tắt sau khi bạn sao chép.");
      var btn = el("button", { class: "lk-copy hidden", type: "button" }, "Sao chép mã");
      var manual = el("button", { class: "lk-alt hidden", type: "button" }, "Tôi đã ghi lại mã");
      var card = el("div", { class: "lk-card" }, el("div", { class: "lk-brand" }, "LockCOC · Mã khóa app"), stage, title, sub, steps, codeBox, meta, note, btn, manual);
      var ov = el("div", { class: "lk-issue", role: "dialog", "aria-modal": "true" }, card);
      document.body.appendChild(ov);
      arc.getBoundingClientRect(); setTimeout(function () { arc.style.transitionDuration = WAIT + "s"; arc.style.strokeDashoffset = "0"; }, 60);
      var t0 = Date.now();
      function tick() {
        var e = (Date.now() - t0) / 1000, left = Math.max(0, Math.ceil(WAIT - e));
        num.textContent = String(left);
        var cur = Math.min(STEPS.length - 1, Math.floor(e / (WAIT / STEPS.length)));
        lis.forEach(function (li, i) { li.className = i < cur ? "done" : (i === cur ? "now" : ""); });
      }
      tick(); var tk = setInterval(tick, 250);
      async function finish() { try { await api("/api/lock-code/ack", { method: "POST", json: {} }); } catch (e) { /* bỏ qua */ } ov.remove(); resolve(); }
      async function fetchCode() {
        await sleep(WAIT * 1000);
        for (var i = 0; i < 8; i++) {
          try { var d = await api("/api/lock-code/issue"); if (d.code) return d; await sleep(Math.max(1, d.wait || 1) * 1000); }
          catch (e) { sub.textContent = e.message || "Không cấp được mã, thử lại…"; if (/hết phiên|đăng nhập lại/i.test(e.message || "")) throw e; await sleep(2000); }
        }
        throw new Error("Không cấp được mã, hãy đăng nhập lại.");
      }
      fetchCode().then(function (d) {
        clearInterval(tk); lis.forEach(function (li) { li.className = "done"; });
        stage.classList.add("hidden"); steps.classList.add("hidden");
        title.textContent = "Mã khóa app của bạn"; sub.textContent = "Dành riêng cho tài khoản này";
        var parts = d.code.split("-"), n = 0;
        parts.forEach(function (p, gi) {
          var g = el("span", { class: "lk-g" });
          p.split("").forEach(function (ch) { var c = el("span", { class: "lk-c" }, ch); c.style.animationDelay = (n++ * 45) + "ms"; g.appendChild(c); });
          codeBox.appendChild(g);
        });
        meta.textContent = "Có hiệu lực 7 ngày" + (d.exp ? ", đến " + fmtDate(d.exp) : "");
        [codeBox, meta, note, btn].forEach(function (x) { x.classList.remove("hidden"); });
        btn.addEventListener("click", function () {
          copyText(d.code).then(function () { btn.textContent = "Đã sao chép"; btn.disabled = true; setTimeout(finish, 900); },
            function () { manual.classList.remove("hidden"); toast("Không sao chép tự động được, hãy ghi lại mã rồi bấm nút bên dưới", "error"); });
        });
        manual.addEventListener("click", finish);
      }).catch(function (e) {
        clearInterval(tk); stage.classList.add("hidden"); steps.classList.add("hidden");
        title.textContent = "Chưa cấp được mã"; sub.textContent = e.message || "Lỗi";
        var b = el("button", { class: "lk-copy", type: "button" }, "Đăng nhập lại");
        b.addEventListener("click", function () { ov.remove(); resolve(); }); card.appendChild(b);
      });
    });
  };
  var other = document.getElementById("lock-other");
  if (other) other.addEventListener("click", function () { if (typeof showLogin === "function") showLogin(true); });
})();
