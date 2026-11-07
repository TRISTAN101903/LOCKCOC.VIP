"use strict";
/* accountkey.js - hiện mã tài khoản TRIS-XXXX-XXXX-XXXX trong Hồ sơ (chỉ có sau khi đăng nhập, mỗi tài khoản một mã) */
(function () {
  if (typeof api !== "function" || typeof el !== "function") return;
  var code = "", val = null;
  function copy(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) { var ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); } ta.remove(); });
  }
  function card() {
    var host = document.querySelector("#page-me .me-head"); if (!host) return null;
    var c = host.querySelector(".ak-card"); if (c) return c;
    val = el("b", { class: "ak-code" }, "…");
    var btn = el("button", { class: "btn small", type: "button" }, el("span", { class: "btn-label" }, "Sao chép"));
    btn.addEventListener("click", function () { if (!code) return; copy(code).then(function () { toast("Đã sao chép mã tài khoản", "ok"); }, function () { toast("Không sao chép được", "error"); }); });
    c = el("div", { class: "ak-card glass" }, el("small", {}, "Mã khóa app của bạn"), val, btn);
    var act = host.querySelector(".me-actions"); host.insertBefore(c, act || null); return c;
  }
  async function refresh() {
    var c = card(); if (!c) return;
    var vm = document.getElementById("view-main"); if (vm && vm.classList.contains("hidden")) return;
    try { var d = await api("/api/account-key"); code = d.code || ""; val.textContent = code || "—"; c.classList.toggle("hidden", !code); }
    catch (e) { code = ""; c.classList.add("hidden"); }
  }
  var _api = api;
  api = async function (path) {
    var r = await _api.apply(this, arguments);
    if (path === "/api/login" || path === "/api/switch") setTimeout(refresh, 400);
    return r;
  };
  var n = 0, iv = setInterval(function () { if (card()) { clearInterval(iv); refresh(); } else if (++n > 40) clearInterval(iv); }, 500);
  document.addEventListener("click", function (e) { var t = e.target; if (t && t.closest && t.closest("[data-page='me'], [data-go='me']")) setTimeout(refresh, 300); }, true);
})();
