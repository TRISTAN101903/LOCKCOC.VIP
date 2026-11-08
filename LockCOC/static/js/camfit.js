"use strict";
/* camfit.js - khung ngắm tự co theo chỗ trống thật của màn hình (không dựa vào vh), + lưới 3x3 + rung nhẹ khi chụp */
(function () {
  var pg = document.getElementById("page-camera"), vf = document.getElementById("viewfinder");
  if (!pg || !vf) return;
  var zb = pg.querySelector(".zoom-bar"), timer = 0;
  function fit() {
    timer = 0;
    if (!pg.offsetParent || pg.classList.contains("booth-on")) { pg.style.removeProperty("--vfw"); return; }
    var hdr = pg.querySelector(".cam-top"), r = pg.getBoundingClientRect(), cs = getComputedStyle(pg);
    var top = hdr ? hdr.getBoundingClientRect().bottom : r.top + 40, bottom = r.bottom - (parseFloat(cs.paddingBottom) || 0);
    var kids = Array.prototype.slice.call(pg.children), i = kids.indexOf(vf), below = 0;
    for (var k = i + 1; k < kids.length; k++) {
      var e = kids[k]; if (e.offsetParent === null && getComputedStyle(e).position !== "fixed") continue;
      var st = getComputedStyle(e); if (st.position === "absolute" || st.position === "fixed") continue;
      below += e.getBoundingClientRect().height + (parseFloat(st.marginTop) || 0) + (parseFloat(st.marginBottom) || 0);
    }
    var vs = getComputedStyle(vf), avail = bottom - top - below - 10 - (parseFloat(vs.marginTop) > 0 && vs.marginTop !== "auto" ? 0 : 0);
    var maxW = Math.min(pg.clientWidth - 28, 560, window.innerHeight * 0.62);
    var w = Math.max(170, Math.min(maxW, Math.floor(avail)));
    pg.style.setProperty("--vfw", w + "px");
  }
  function later() { if (!timer) timer = setTimeout(fit, 60); }
  window.addEventListener("resize", later); window.addEventListener("orientationchange", later);
  var strip = document.getElementById("filter-strip");
  if (window.MutationObserver) {
    var mo = new MutationObserver(later);
    if (strip) mo.observe(strip, { attributes: true, attributeFilter: ["class"] });
    mo.observe(pg, { attributes: true, attributeFilter: ["class"] });
    var np = document.getElementById("nav"); if (np) mo.observe(np, { attributes: true, attributeFilter: ["class"] });
  }
  if (typeof goPage === "function") { var _g = goPage; goPage = function () { var r = _g.apply(this, arguments); setTimeout(later, 120); return r; }; }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#btn-filters,#btn-timer,.mode-btn,[data-mode],#booth-modes")) setTimeout(later, 80); });
  setTimeout(later, 300); setTimeout(later, 1500);

  /* lưới 3x3 */
  var grid = document.createElement("div"); grid.className = "vf-grid"; grid.setAttribute("aria-hidden", "true"); vf.appendChild(grid);
  var on = false; try { on = localStorage.getItem("lc_grid") === "1"; } catch (e) { on = false; }
  function setGrid(v) { on = v; grid.classList.toggle("on", v); if (gb) gb.classList.toggle("on", v); try { localStorage.setItem("lc_grid", v ? "1" : "0"); } catch (e) { /* bỏ qua */ } }
  var gb = null;
  if (zb) { gb = document.createElement("button"); gb.type = "button"; gb.className = "chip grid-chip"; gb.textContent = "Lưới"; gb.setAttribute("aria-label", "Bật tắt lưới 3x3"); gb.addEventListener("click", function () { setGrid(!on); }); zb.appendChild(gb); }
  setGrid(on);

  /* rung nhẹ khi bấm chụp (nếu máy hỗ trợ) */
  var sh = document.getElementById("shutter");
  if (sh && navigator.vibrate) sh.addEventListener("click", function () { try { navigator.vibrate(12); } catch (e) { /* bỏ qua */ } });
})();
