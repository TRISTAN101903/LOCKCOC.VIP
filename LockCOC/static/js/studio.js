"use strict";
/* =========================================================================
   studio.js - Studio caption: nhạc, chữ, widget động, hiệu ứng
   (nhạc & widget được gửi dưới dạng caption văn bản; hiệu ứng chỉ xem trước)
   ========================================================================= */

const WCODES = { 0: "Trời quang", 1: "Ít mây", 2: "Có mây", 3: "Nhiều mây", 45: "Sương mù", 48: "Sương mù", 51: "Mưa phùn", 53: "Mưa phùn", 55: "Mưa phùn", 61: "Mưa nhẹ", 63: "Mưa", 65: "Mưa to", 80: "Mưa rào", 81: "Mưa rào", 82: "Mưa rào lớn", 95: "Dông" };
let audioPrev = null;
function stopPreview() { if (audioPrev) { audioPrev.pause(); audioPrev = null; } $$(".song .icon-btn.on").forEach((b) => b.classList.remove("on")); }

function openStudio(ed, onChange) {
  const root = $("#overlay-root");
  const body = el("div", { class: "studio-body" });
  const prevText = el("span", { class: "p" });
  const tabsBar = el("div", { class: "tabs" });
  let tab = "music";

  const syncPrev = () => {
    const t = pillText(ed);
    prevText.textContent = t || "Chưa có caption";
    onChange();
  };
  const setCaption = (text, icon) => { ed.caption = text; if (icon !== undefined) ed.icon = icon; syncPrev(); };

  const done = () => { stopPreview(); box.classList.add("out"); scrim.remove(); setTimeout(() => box.remove(), 300); };
  const scrim = el("div", { class: "scrim", onclick: done });
  const box = el("div", { class: "studio glass", role: "dialog" },
    el("div", { class: "studio-head" },
      el("div", { class: "logo" }, icon("sparkle")),
      el("div", { style: { flex: "1" } }, el("h2", {}, "Studio"), el("p", {}, "Nhạc · chữ · widget · hiệu ứng")),
      el("button", { class: "icon-btn", "aria-label": "Đóng", onclick: done }, icon("close"))),
    el("div", { class: "studio-prev" }, "Xem trước:", prevText),
    tabsBar, body,
    el("div", { class: "studio-foot" }, el("button", { class: "btn primary block", onclick: done }, icon("check"), el("span", { class: "btn-label" }, "Xong"))));
  root.append(scrim, box);

  const TABS = [["music", "Nhạc", "music"], ["text", "Chữ", "palette"], ["widget", "Widget", "clock"], ["fx", "Hiệu ứng", "snow"]];
  TABS.forEach(([id, label, ic]) => tabsBar.append(el("button", { class: "chip" + (id === tab ? " on" : ""), dataset: { t: id }, onclick: () => { tab = id; render(); } }, icon(ic, "i s"), label)));

  function render() {
    stopPreview();
    $$(".chip", tabsBar).forEach((c) => c.classList.toggle("on", c.dataset.t === tab));
    body.replaceChildren();
    ({ music: renderMusic, text: renderText, widget: renderWidget, fx: renderFx })[tab]();
    syncPrev();
  }

  // ---------------- Nhạc
  let musicStateEl = null;
  function updMusicState() {
    if (!musicStateEl) return;
    musicStateEl.replaceChildren();
    if (!ed.song && !ed.music) return;
    const t = (ed.song && ed.song.title) || (ed.music && ed.music.title) || "đã chọn";
    musicStateEl.append(icon("music", "i s"), el("span", {}, (ed.music ? "Nhạc + thẻ nhạc sẽ vào bài đăng: " : "Thẻ nhạc sẽ vào ảnh: ") + t),
      el("button", { class: "icon-btn", "aria-label": "Bỏ nhạc", onclick: () => { stopPreview(); ed.music = null; ed.song = null; updMusicState(); syncPrev(); } }, icon("close", "i s")));
  }
  function songRow(t) {
    const art = el("div", { class: "art" }, safeUrl(t.art) ? imgEl(safeUrl(t.art), "") : null);
    const play = t.preview && /^https:\/\//.test(t.preview) ? el("button", { class: "icon-btn", "aria-label": "Nghe thử", onclick: (e) => {
      e.stopPropagation();
      const b = e.currentTarget, was = b.classList.contains("on");
      stopPreview();
      if (was) return;
      audioPrev = new Audio(t.preview); audioPrev.volume = 0.7;
      audioPrev.play().catch(() => toast("Không phát được bản nghe thử.", "error"));
      audioPrev.onended = stopPreview;
      b.classList.add("on");
    } }, icon("play")) : null;
    return el("div", { class: "song", onclick: () => { stopPreview(); ed.song = { title: t.title, artist: t.artist || "", art: t.art || "" };
      if (t.preview) { ed.music = { url: t.preview, title: t.title }; toast("Đã chọn bài hát · thẻ nhạc và nhạc sẽ vào bài đăng", "ok", 2200); }
      else { ed.music = null; toast("Đã chọn bài hát · thẻ nhạc sẽ hiện trên ảnh (bài này không có đoạn nhạc để ghép)", "msg", 2800); }
      updMusicState(); syncPrev(); } },
      art, el("div", { class: "meta" }, el("strong", {}, t.title), el("small", {}, t.artist || "Spotify")), play);
  }
  function renderMusic() {
    const list = el("div", {});
    const show = (items) => { list.replaceChildren(...(items.length ? items.map(songRow) : [el("div", { class: "empty" }, "Không tìm thấy bài nào.")])); };
    const search = async (q) => {
      list.replaceChildren(el("div", { class: "skeleton", style: { borderRadius: "22px", aspectRatio: "6/1" } }));
      try { show((await api("/api/music/search?q=" + encodeURIComponent(q))).items); } catch (e) { list.replaceChildren(el("div", { class: "empty" }, e.message)); }
    };
    const qIn = el("input", { type: "text", placeholder: "Tìm bài hát hoặc ca sĩ", maxlength: 80, enterkeyhint: "search" });
    const form = el("form", { class: "searchbar", onsubmit: (e) => { e.preventDefault(); if (qIn.value.trim()) search(qIn.value.trim()); } },
      icon("search"), qIn, el("button", { class: "btn small primary", type: "submit" }, el("span", { class: "btn-label" }, "Tìm")));
    const lIn = el("input", { type: "text", placeholder: "Dán link Spotify (open.spotify.com/track/…)", maxlength: 200 });
    const lform = el("form", { class: "searchbar", onsubmit: async (e) => {
      e.preventDefault();
      const b = e.submitter || $("button", lform);
      await busy(b, async () => { const { item } = await api("/api/music/link?url=" + encodeURIComponent(lIn.value.trim())); list.replaceChildren(songRow(item)); });
    } }, icon("link"), lIn, el("button", { class: "btn small", type: "submit" }, el("span", { class: "btn-label" }, "Lấy")));
    const fIn = el("input", { type: "file", accept: "audio/*,.mp3,.m4a,.aac,.wav,.ogg", class: "hidden" });
    const sIn = el("input", { type: "number", min: "0", max: "600", value: "0", inputmode: "numeric", "aria-label": "Bắt đầu từ giây", class: "sec-in" });
    fIn.addEventListener("change", () => {
      const f = fIn.files && fIn.files[0];
      if (!f) return;
      if (f.size > 30 * 1024 * 1024) { fIn.value = ""; return toast("File nhạc quá lớn (tối đa 30MB).", "error"); }
      ed.music = { file: f, start: Math.max(0, +sIn.value || 0), title: f.name };
      ed.song = { title: f.name.replace(/\.[^.]+$/, ""), artist: "", art: "" }; syncPrev();
      updMusicState(); toast("Đã chọn file nhạc", "ok", 1800);
    });
    sIn.addEventListener("input", () => { if (ed.music && ed.music.file) ed.music.start = Math.max(0, +sIn.value || 0); });
    const upRow = el("div", { class: "searchbar" }, icon("music"), el("small", { class: "grow" }, "Nhạc của bạn · từ giây"), sIn,
      el("button", { class: "btn small", type: "button", onclick: () => fIn.click() }, el("span", { class: "btn-label" }, "Chọn file")), fIn);
    musicStateEl = el("div", { class: "music-state" });
    updMusicState();
    body.append(musicStateEl, form, lform, upRow, el("div", { class: "sec" }, icon("music", "i"), "Đang thịnh hành"), list);
    api("/api/music/trending").then((d) => { if (!qIn.value) show(d.items); }).catch((e) => list.replaceChildren(el("div", { class: "empty" }, e.message)));
  }

  // ---------------- Chữ
  function renderText() {
    const cap = el("input", { type: "text", value: ed.caption || "", placeholder: "Viết caption…", maxlength: 120, oninput: (e) => { ed.caption = e.target.value; syncPrev(); } });
    body.append(el("div", { class: "searchbar" }, cap));
    body.append(el("div", { class: "sec" }, icon("palette"), "Màu nền"));
    const sw = el("div", { class: "hrow" }, el("button", { class: "swatch" + (ed.grad == null ? " on" : ""), "aria-label": "Kính", onclick: () => { ed.grad = null; render(); } }));
    sw.firstChild.style.background = "rgba(255,255,255,.18)";
    GRADS.forEach((g, i) => {
      const b = el("button", { class: "swatch" + (ed.grad === i ? " on" : ""), "aria-label": g.n, onclick: () => { ed.grad = i; render(); } });
      b.style.background = `linear-gradient(135deg, ${g.c[0]}, ${g.c[1]})`;
      sw.append(b);
    });
    body.append(sw, el("div", { class: "sec" }, icon("sparkle"), "Biểu tượng"));
    body.append(el("div", { class: "hrow" }, ...EMOJIS.map((e) => el("button", { class: "emoji-b" + (ed.icon === e || (!ed.icon && !e) ? " on" : ""), onclick: () => { ed.icon = e; render(); } }, e ? gl(e) : "∅"))));
    body.append(el("div", { class: "sec" }, icon("list"), "Nhãn có sẵn của Locket"));
    const notes = el("div", { class: "hrow" });
    body.append(notes);
    notes.append(el("button", { class: "chip" + (!ed.note ? " on" : ""), onclick: () => { ed.note = null; render(); } }, "Không"));
    ensureNoteTypes().then((list) => list.slice(0, 40).forEach((n) => notes.append(el("button", { class: "chip" + (ed.note === n ? " on" : ""), onclick: () => { ed.note = n; ed.caption = ed.caption || ""; render(); } }, noteLabel(n)))));
  }

  // ---------------- Widget
  function wcard(c1, c2, ic, label, big, btnText, onUse, extra) {
    const c = el("div", { class: "wcard" + (extra ? " rating" : "") });
    c.style.setProperty("--c1", c1); c.style.setProperty("--c2", c2);
    if (extra) { c.append(el("div", { style: { display: "flex", alignItems: "center", gap: "14px" } }, el("div", { class: "wi" }, icon(ic)), el("div", { class: "wm" }, el("small", {}, label), el("b", {}, big))), extra); }
    else c.append(el("div", { class: "wi" }, icon(ic)), el("div", { class: "wm" }, el("small", {}, label), el("b", {}, big)), el("button", { class: "btn small", onclick: onUse }, el("span", { class: "btn-label" }, btnText)));
    return c;
  }
  function renderWidget() {
    // Đồng hồ (tự chạy)
    const clockB = el("b", {}, hhmm());
    const tick = setInterval(() => { if (!clockB.isConnected) return clearInterval(tick); clockB.textContent = hhmm(); }, 5000);
    const wc = wcard("#2b2d42", "#5c677d", "clock", "Đồng hồ", "", "Dùng", () => setCaption(`${hhmm()} · ${new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}`, "🕐"));
    $(".wm b", wc).replaceWith(clockB);
    body.append(wc);

    // Thời tiết
    const wb = el("b", {}, "—");
    const ww = wcard("#1a73e8", "#74b9ff", "cloud", "Thời tiết", "", "Lấy", async (ev) => {
      await busy(ev.currentTarget, async () => {
        let lat = 10.82, lon = 106.63;
        try { const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })); lat = p.coords.latitude; lon = p.coords.longitude; }
        catch { toast("Chưa có vị trí, dùng TP.HCM làm mặc định.", "msg", 2600); }
        const d = await api(`/api/weather?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`);
        if (d.temp == null) throw new Error("Không lấy được thời tiết.");
        const t = `${Math.round(d.temp)}°C · ${WCODES[d.code] || "Thời tiết"}`;
        wb.textContent = t; setCaption(t, "🌤️");
      });
    });
    $(".wm b", ww).replaceWith(wb);
    body.append(ww);

    // Pin
    const bb = el("b", {}, "—");
    const wbat = wcard("#134e5e", "#71b280", "battery", "Pin thiết bị", "", "Dùng", async (ev) => {
      if (!navigator.getBattery) return toast("Thiết bị không cho đọc pin.", "error");
      const b = await navigator.getBattery();
      const t = `${Math.round(b.level * 100)}%${b.charging ? " ⚡" : ""}`;
      bb.textContent = t; setCaption("Pin " + t, "🔋");
    });
    $(".wm b", wbat).replaceWith(bb);
    body.append(wbat);

    // Đánh giá sao
    let stars = 0;
    const comment = el("input", { type: "text", placeholder: "Nhận xét ngắn…", maxlength: 60 });
    const starRow = el("div", { class: "stars" }, ...[1, 2, 3, 4, 5].map((n) => el("button", { "aria-label": n + " sao", onclick: () => { stars = n; $$("button", starRow).forEach((b, i) => b.classList.toggle("on", i < n)); apply(); haptic(8); } }, icon("star"))));
    const apply = () => { if (stars) setCaption(`${"⭐".repeat(stars)}${comment.value ? " " + comment.value : ""}`, ""); };
    comment.addEventListener("input", apply);
    body.append(wcard("#8e2de2", "#4a00e0", "star", "Đánh giá", "", "", null, el("div", { class: "col", style: { display: "grid", gap: "10px" } }, starRow, comment)));
    body.append(el("p", { class: "fine" }, "Widget được gửi dưới dạng caption văn bản (Locket không nhận widget tuỳ biến từ API không chính thức)."));
  }

  // ---------------- Hiệu ứng
  function renderFx() {
    body.append(el("p", { class: "fine" }, "Hiệu ứng chỉ hiển thị khi xem trước trên app này; biểu tượng tương ứng sẽ được gửi kèm làm icon caption."));
    const grid = el("div", { class: "hrow", style: { flexWrap: "wrap" } });
    grid.append(el("button", { class: "chip" + (!ed.fx ? " on" : ""), onclick: () => { ed.fx = null; render(); onChange(); } }, "Tắt"));
    FX.forEach((f) => grid.append(el("button", { class: "chip" + (ed.fx === f.id ? " on" : ""), onclick: () => { ed.fx = f.id; if (!ed.icon) ed.icon = f.e; render(); onChange(); } }, gl(f.e), " " + f.n)));
    body.append(grid);
  }

  render();
}
