"use strict";
/* devsync.js - đồng bộ khoảnh khắc với thư viện trong máy: lưu về máy (Android app lưu thẳng vào Ảnh/Phim, web dùng bảng chia sẻ) và đưa ảnh/video từ máy lên */
(function () {
  if (typeof bottomSheet !== "function" || typeof el !== "function" || typeof api !== "function") return;
  var KS = "lc_saved", KU = "lc_upsig", KA = "lc_autosave";
  function load(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch (e) { return new Set(); } }
  function store(k, set) { try { localStorage.setItem(k, JSON.stringify(Array.from(set).slice(-20000))); } catch (e) { /* bỏ qua */ } }
  var native = !!(window.LockCOCNative && typeof window.LockCOCNative.save === "function");
  var saved = load(KS), upsig = load(KU), busy = false;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function fileUrl(it) { return "/api/sync-all/file/" + encodeURIComponent(it.id) + "?kind=" + (it.video ? "video" : "image"); }
  function nameOf(it) { var d = new Date((it.ts || Date.now() / 1000) * 1000), p = function (n) { return String(n).padStart(2, "0"); };
    return "LockCOC_" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + "_" + String(it.id).replace(/[^A-Za-z0-9]/g, "").slice(0, 8) + (it.video ? ".mp4" : ".jpg"); }
  async function listItems(who) {
    var out = [], off = 0, total = 1;
    while (off < total) { var r = await api("/api/sync-all/items?who=" + who + "&offset=" + off + "&limit=120"); total = r.total || 0; var it = r.items || []; if (!it.length) break; out = out.concat(it); off += it.length; }
    return out;
  }
  function say(t) { if (ui.msg) ui.msg.textContent = t; }
  function bar(p) { if (ui.bar) ui.bar.style.width = Math.round(p * 100) + "%"; }
  var ui = {};

  /* ---------- lưu về máy ---------- */
  async function saveToDevice(who, silent) {
    if (busy) return; busy = true;
    try {
      say("Đang lấy danh sách…"); var all = await listItems(who);
      var todo = all.filter(function (it) { return !saved.has(it.id) && (it.image || it.video); });
      if (!todo.length) { say("Đã lưu hết, không có gì mới (" + all.length + " khoảnh khắc)."); bar(1); return; }
      if (native) {
        for (var i = 0; i < todo.length; i++) {
          var it = todo[i]; try { window.LockCOCNative.save(location.origin + fileUrl(it), nameOf(it), it.video ? "video/mp4" : "image/jpeg"); saved.add(it.id); } catch (e) { /* bỏ qua */ }
          if (i % 10 === 0) { say("Đang lưu " + (i + 1) + "/" + todo.length + "…"); bar((i + 1) / todo.length); await sleep(120); }
        }
        store(KS, saved); bar(1); say("Đã gửi " + todo.length + " tệp vào thư viện (Ảnh, Phim → LockCOC)."); if (!silent) toast("Đang lưu " + todo.length + " tệp vào thư viện máy", "ok");
        return;
      }
      var size = 8, batches = Math.ceil(todo.length / size);
      for (var b = 0; b < batches; b++) {
        var part = todo.slice(b * size, b * size + size), files = [];
        for (var j = 0; j < part.length; j++) {
          say("Lô " + (b + 1) + "/" + batches + ": tải " + (j + 1) + "/" + part.length + "…"); bar((b * size + j) / todo.length);
          try { var r = await fetch(fileUrl(part[j]), { credentials: "same-origin" }); if (!r.ok) continue; var blob = await r.blob(); files.push({ it: part[j], file: new File([blob], nameOf(part[j]), { type: part[j].video ? "video/mp4" : (blob.type || "image/jpeg") }) }); } catch (e) { /* bỏ qua */ }
        }
        if (!files.length) continue;
        await new Promise(function (resolve) {
          var btn = el("button", { class: "btn primary block", type: "button" }, "Lưu lô " + (b + 1) + "/" + batches + " (" + files.length + " tệp)");
          var skip = el("button", { class: "btn small", type: "button" }, "Bỏ qua lô này");
          var row = el("div", { class: "ds-row" }, btn, skip); ui.box.appendChild(row);
          var finish = function () { row.remove(); resolve(); };
          skip.onclick = finish;
          btn.onclick = async function () {
            var fl = files.map(function (x) { return x.file; });
            try {
              if (navigator.canShare && navigator.canShare({ files: fl })) { await navigator.share({ files: fl }); }
              else { fl.forEach(function (f) { var a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }); }
              files.forEach(function (x) { saved.add(x.it.id); }); store(KS, saved); finish();
            } catch (e) { if (e && e.name === "AbortError") say("Bạn đã huỷ lô này, bấm lại để lưu."); else say("Không lưu được: " + (e && e.message || e)); }
          };
        });
      }
      bar(1); say("Xong. Đã lưu " + todo.length + " khoảnh khắc mới.");
    } catch (e) { say("Lỗi: " + (e && e.message || e)); }
    finally { busy = false; }
  }

  /* ---------- đưa từ máy lên ---------- */
  function pickAndUpload() {
    var inp = el("input", { type: "file", accept: "image/*,video/*", multiple: "", hidden: "" }); document.body.appendChild(inp);
    inp.addEventListener("change", async function () {
      var list = Array.from(inp.files || []); inp.remove(); if (!list.length || busy) return;
      var sig = function (f) { return f.name + "|" + f.size + "|" + f.lastModified; };
      var fresh = list.filter(function (f) { return !upsig.has(sig(f)); }), dup = list.length - fresh.length;
      if (!fresh.length) { say("Tất cả " + list.length + " tệp đã được đăng trước đó."); return; }
      var MAX = 20, run = fresh.slice(0, MAX);
      if (!window.confirm("Đăng " + run.length + " tệp lên Locket?" + (dup ? "\n(Bỏ qua " + dup + " tệp đã đăng)" : "") + (fresh.length > MAX ? "\n(Mỗi lần tối đa " + MAX + " tệp, chọn lại phần còn lại sau)" : "") + "\nBạn bè sẽ thấy các khoảnh khắc này.")) return;
      busy = true; var ok = 0, fail = 0;
      for (var i = 0; i < run.length; i++) {
        var f = run[i]; say("Đang đăng " + (i + 1) + "/" + run.length + "…"); bar(i / run.length);
        try {
          var fd = new FormData();
          if (f.type.indexOf("video/") === 0) { var th = typeof videoThumb === "function" ? await videoThumb(f) : null; if (!th) throw new Error("không đọc được video"); fd.append("image", th, "cover.jpg"); fd.append("video", f, f.name); }
          else fd.append("image", f, f.name);
          await api("/api/post", { method: "POST", form: fd }); upsig.add(sig(f)); ok++;
        } catch (e) { fail++; }
        await sleep(1500);
      }
      store(KU, upsig); busy = false; bar(1);
      say("Xong: đăng " + ok + " tệp" + (fail ? ", lỗi " + fail + " tệp (định dạng không hỗ trợ hoặc quá lớn)" : "") + ".");
      try { if (typeof S !== "undefined") { S.feedStale = true; S.myStale = true; } } catch (e) { /* bỏ qua */ }
    });
    inp.click();
  }

  function openSheet() {
    ui = { msg: el("div", { class: "ds-msg" }, native ? "Android: lưu thẳng vào thư viện máy." : "Trên web: mỗi lô sẽ mở bảng chia sẻ, chọn \"Lưu vào Ảnh\"."), bar: el("i"), box: el("div", { class: "ds-box" }) };
    var track = el("div", { class: "ds-bar" }, ui.bar);
    var b1 = el("button", { class: "btn primary block", type: "button" }, "Lưu khoảnh khắc của tôi về máy");
    var b2 = el("button", { class: "btn block", type: "button" }, "Lưu cả của bạn bè về máy");
    var b3 = el("button", { class: "btn block", type: "button" }, "Đăng ảnh/video từ máy lên");
    b1.onclick = function () { saveToDevice("mine"); }; b2.onclick = function () { saveToDevice("all"); }; b3.onclick = pickAndUpload;
    var kids = [el("h3", { style: { margin: "0 0 6px", textAlign: "center" } }, "Đồng bộ với thư viện máy"), el("p", { class: "ds-hint" }, "Không lưu trùng: app nhớ tệp nào đã lưu và đã đăng. Dữ liệu lấy từ phần Đồng bộ Locket, hãy mở app vài giây cho đồng bộ xong trước."), b1, b2, b3, track, ui.msg, ui.box];
    if (native) {
      var on = localStorage.getItem(KA) === "1"; var tg = el("button", { class: "btn small" + (on ? " primary" : ""), type: "button" }, on ? "Tự lưu khi mở app: BẬT" : "Tự lưu khi mở app: TẮT");
      tg.onclick = function () { on = !on; try { localStorage.setItem(KA, on ? "1" : "0"); } catch (e) { /* bỏ qua */ } tg.textContent = on ? "Tự lưu khi mở app: BẬT" : "Tự lưu khi mở app: TẮT"; tg.classList.toggle("primary", on); };
      kids.push(tg);
    }
    var sh = bottomSheet.apply(null, kids); sh.sheet.classList.add("ds-sheet");
  }
  var fab = el("button", { class: "ds-fab", type: "button", "aria-label": "Đồng bộ với thư viện máy" });
  fab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v14M3.5 14.5 7 18l3.5-3.5"/><path d="M17 20V6M13.5 9.5 17 6l3.5 3.5"/></svg>';
  fab.addEventListener("click", openSheet); document.body.appendChild(fab);
  /* app Android: tự lưu phần mới sau khi đồng bộ xong */
  if (native && localStorage.getItem(KA) === "1") setTimeout(function () { ui = {}; saveToDevice("mine", true); }, 9000);
  window.lcDevSync = { open: openSheet, save: saveToDevice };
})();
