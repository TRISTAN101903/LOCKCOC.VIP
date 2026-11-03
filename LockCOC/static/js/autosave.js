"use strict";
/* autosave.js - tự lưu ảnh/video vừa đăng về máy (bật/tắt trong Hồ sơ). Server miễn phí xoá dữ liệu khi ngủ nên bản trong máy là bản bền. */
(function () {
  if (typeof api !== "function" || typeof el !== "function") return;
  var K = "lc_autosave_post";
  function isOn() { try { return localStorage.getItem(K) !== "0"; } catch (e) { return true; } }
  function setOn(v) { try { localStorage.setItem(K, v ? "1" : "0"); } catch (e) { /* bỏ qua */ } }
  var native = function () { return !!(window.LockCOCNative && typeof window.LockCOCNative.save === "function"); };
  function stamp() { var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); }
  async function saveIt(im, vd, res) {
    try {
      var isVid = vd instanceof Blob && vd.size > 0;
      if (native()) {
        if (isVid) return; /* server không giữ video đã đăng, dùng đồng bộ thư viện để lưu video */
        var h = await api("/api/history"), it = (h.items || []).filter(function (x) { return x.image && (!res.id || String(x.id) === String(res.id)); })[0] || (h.items || []).filter(function (x) { return x.image; })[0];
        if (!it) return;
        window.LockCOCNative.save(location.origin + "/api/save-media?u=" + encodeURIComponent(it.image) + "&kind=image&n=" + stamp(), "LockCOC_" + stamp() + ".jpg", "image/jpeg");
        toast("Đã lưu ảnh vừa đăng vào thư viện máy", "ok"); return;
      }
      var blob = isVid ? vd : im; if (!(blob instanceof Blob) || !blob.size) return;
      var ext = isVid ? ((blob.type || "").indexOf("webm") >= 0 ? ".webm" : ".mp4") : ".jpg";
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "LockCOC_" + stamp() + ext; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); toast("Đã lưu bài vừa đăng về máy", "ok");
    } catch (e) { /* bỏ qua, không làm hỏng việc đăng */ }
  }
  var _api = api;
  api = async function (path, opts) {
    var track = path === "/api/post" && opts && opts.form instanceof FormData && !opts.form.get("schedule_at"), im = null, vd = null;
    if (track) { try { im = opts.form.get("image"); vd = opts.form.get("video"); } catch (e) { track = false; } }
    var r = await _api.apply(this, arguments);
    if (track && isOn() && r && r.ok && !r.scheduled) setTimeout(function () { saveIt(im, vd, r); }, 300);
    return r;
  };
  function mount() {
    var host = document.querySelector("#page-me .me-actions"); if (!host) return false; if (host.querySelector(".as-toggle")) return true;
    var lab = function () { return "Tự lưu bài vừa đăng: " + (isOn() ? "Bật" : "Tắt"); };
    var b = el("button", { class: "btn small as-toggle", type: "button" }, el("span", { class: "btn-label" }, lab()));
    b.addEventListener("click", function () { setOn(!isOn()); b.querySelector(".btn-label").textContent = lab(); toast(isOn() ? "Sẽ tự lưu mỗi bài bạn đăng" : "Đã tắt tự lưu", "ok"); });
    host.appendChild(b); return true;
  }
  if (!mount()) { var n = 0, iv = setInterval(function () { if (mount() || ++n > 40) clearInterval(iv); }, 500); }
})();
