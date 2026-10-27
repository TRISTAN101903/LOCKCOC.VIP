"use strict";
/* nativemusic.js - đăng bài với thẻ nhạc gốc của Locket (nghe thử được), thay cho thẻ vẽ cứng vào ảnh */
(function () {
  var ed = null;
  function on() { try { return localStorage.getItem("lc_nm") !== "0"; } catch (e) { return true; } }
  function ok() { return !!(on() && ed && ed.song && ed.song.title && !(ed.music && ed.music.file)); }

  var _oe = openEditor; openEditor = function (i) { ed = null; return _oe(i); };
  var _os = openStudio; openStudio = function (e, cb) { ed = e; return _os(e, cb); };
  var _burn = burnSongCard; burnSongCard = function (img, song) { return ok() ? Promise.resolve(img) : _burn(img, song); };

  var _api = api;
  api = function (path, opts) {
    if (path === "/api/post" && opts && opts.form && ok()) {
      var fd = opts.form, s = ed.song, pv = ed.music && ed.music.url;
      ["music", "music_start", "music_url", "music_card"].forEach(function (k) { fd.delete(k); });
      fd.set("nm_title", s.title); fd.set("nm_artist", s.artist || "");
      if (s.art) fd.set("nm_art", String(s.art).replace("200x200", "600x600"));
      if (pv && /^https:\/\//.test(pv)) fd.set("nm_preview", pv);
      fd.set("nm_link", "https://open.spotify.com/search/" + encodeURIComponent(s.title + " " + (s.artist || "")));
    }
    return _api(path, opts).then(function (d) { if (path === "/api/post") ed = null; return d; });
  };

  function chip() {
    var b = el("button", { class: "chip nm-chip" + (on() ? " on" : ""), type: "button" }, on() ? "Thẻ nhạc Locket: Bật" : "Thẻ nhạc Locket: Tắt");
    b.addEventListener("click", function () {
      try { localStorage.setItem("lc_nm", on() ? "0" : "1"); } catch (e) { /* bỏ qua */ }
      b.classList.toggle("on", on()); b.textContent = on() ? "Thẻ nhạc Locket: Bật" : "Thẻ nhạc Locket: Tắt";
    });
    return el("div", { class: "nm-row" }, b, el("small", {}, "Bật: bạn bè thấy thẻ nhạc nghe được trên Locket (thay caption). Tắt: thẻ vẽ vào ảnh."));
  }
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        var ms = n.classList && n.classList.contains("music-state") ? n : (n.querySelector && n.querySelector(".music-state"));
        if (ms && ms.parentNode && !ms.parentNode.querySelector(".nm-row")) ms.parentNode.insertBefore(chip(), ms.nextSibling);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
