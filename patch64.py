import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."

def rd(path):
    return open(os.path.join(R, path), encoding="utf-8").read()

def wr(path, text):
    open(os.path.join(R, path), "w", encoding="utf-8").write(text)

JS = """
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
"""
open(os.path.join(R, "static/js/plusnb.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))

CSS = r"""
/*plusnb*/
.plus-btn{display:none!important}
/* ---- trang Plus ---- */
.pl-body{gap:10px}
.pl-hero{position:relative;display:grid;grid-template-columns:46% 1fr;align-items:center;gap:8px;width:100%;padding:18px 16px 18px 6px;border-radius:30px;text-align:left;color:inherit;overflow:hidden;background:radial-gradient(120% 120% at 0% 0%,rgba(251,227,160,.22),transparent 60%),linear-gradient(145deg,#2a2013,#15110b);border:1px solid rgba(226,176,74,.35)}
.pl-pics{position:relative;height:170px}
.pl-pics .pp{position:absolute;width:58%;aspect-ratio:1/1.2;border-radius:6px;background:#f6efe2 linear-gradient(135deg,#d9c8a4,#b79c6a) center/cover;border:6px solid #fffaf0;border-bottom-width:20px;box-shadow:0 6px 14px rgba(0,0,0,.45)}
.pl-pics .a{left:2%;top:18px;transform:rotate(-9deg)}
.pl-pics .b{left:26%;top:2px;transform:rotate(5deg)}
.pl-pics .c{left:14%;top:46px;transform:rotate(-2deg)}
.pl-ht{display:grid;gap:5px}
.pl-ht small{letter-spacing:.14em;color:#e2b04a;font-weight:700;font-size:.68rem}
.pl-ht strong{font-size:1.45rem;line-height:1.1}
.pl-ht span{opacity:.75;font-size:.85rem}
.pl-go{font-style:normal;color:#fbe3a0;font-weight:700;margin-top:4px}
.pl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.pl-card{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:14px 14px 16px;border-radius:22px;text-align:left;color:inherit;min-height:122px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(160deg,var(--a,#2b2417),var(--b,#171310))}
.pl-card strong{font-size:.98rem;line-height:1.15}
.pl-card small{opacity:.7;font-size:.78rem;line-height:1.25}
.pl-art{font-size:1.7rem;line-height:1;margin-bottom:6px;display:inline-grid;place-items:center;width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.08)}
.pl-tag{position:absolute;top:12px;right:12px;font-style:normal;font-size:.68rem;font-weight:700;padding:3px 8px;border-radius:99px;background:rgba(226,176,74,.18);color:#fbe3a0;border:1px solid rgba(226,176,74,.4)}
.c-cal{--a:#2a2410;--b:#16130a}.c-day{--a:#251c2c;--b:#15111a}.c-wrap{--a:#1f2a2a;--b:#111717}.c-film{--a:#2b1f1a;--b:#171010}.c-grid{--a:#1f2433;--b:#11141c}.c-lib{--a:#2a2118;--b:#151210}
.c-booth{--a:#2c1f25;--b:#171015}.c-film2{--a:#2a2616;--b:#15130b}.c-ai{--a:#1d2630;--b:#10161c}.c-vip{--a:#332612;--b:#1a130a}
.c-chat{--a:#1d2a22;--b:#101712}.c-sync{--a:#1d2330;--b:#10131a}.c-bak{--a:#2a2218;--b:#15110c}.c-me{--a:#2a2328;--b:#151115}
.pl-daily{margin:0}
/* ---- Sổ lưu niệm ---- */
.overlay.notebook{background:#efe3cc!important;color:#2b2113;display:flex;flex-direction:column;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.overlay.notebook::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(120,90,40,.16) 1px,transparent 1.5px);background-size:22px 22px;opacity:.7}
.overlay.notebook .ov-head{position:relative;z-index:2;color:#2b2113}
.overlay.notebook .ov-head h2{font-family:"Segoe Print","Bradley Hand","Noteworthy","Comic Sans MS",cursive;font-weight:700}
.overlay.notebook .icon-btn{background:rgba(43,33,19,.08);color:#2b2113;border-color:rgba(43,33,19,.18)}
.nb-tabs{position:relative;z-index:2;display:flex;gap:8px;padding:0 14px 8px;overflow-x:auto}
.nb-tabs .chip{background:rgba(43,33,19,.07);color:#2b2113;border-color:rgba(43,33,19,.18);white-space:nowrap}
.nb-tabs .chip.on{background:#2b2113;color:#fbe3a0}
.nb-dice.spin{animation:nbdice .6s ease}
@keyframes nbdice{0%{transform:rotate(0) scale(1)}50%{transform:rotate(200deg) scale(1.25)}100%{transform:rotate(360deg) scale(1)}}
.nb-pager{position:relative;z-index:1;flex:1;min-height:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}
.nb-pager::-webkit-scrollbar{display:none}
.nb-page{flex:0 0 100%;scroll-snap-align:center;scroll-snap-stop:always;position:relative;perspective:1100px;--p:0}
.nb-sheet{position:absolute;inset:6px 14px 8px;border-radius:10px 22px 22px 10px;background:linear-gradient(90deg,rgba(0,0,0,.08),transparent 6%),#f8f1e1;box-shadow:0 10px 26px rgba(70,48,15,.25),inset 0 0 0 1px rgba(120,90,40,.12);transform:rotateY(calc(var(--p) * -24deg));transform-origin:50% 50%;opacity:calc(1 - var(--p) * var(--p) * .55);background-image:linear-gradient(rgba(120,90,40,.1) 1px,transparent 1px);background-size:100% 30px}
.nb-ph{position:absolute;opacity:0}
.nb-page.on .nb-ph{animation:nbstick .55s cubic-bezier(.2,1.5,.4,1) both;animation-delay:calc(var(--i) * 90ms)}
@keyframes nbstick{0%{opacity:0;transform:translateY(-26px) scale(1.3) rotate(calc(var(--r) * 1deg + 8deg))}100%{opacity:1;transform:none}}
.nb-card{display:block;width:100%;padding:0;background:#fffdf7;border:0;color:#2b2113;text-align:left;box-shadow:0 4px 12px rgba(70,48,15,.35);border-radius:3px;position:relative;transform:translate3d(calc(var(--p) * var(--d) * -46px),0,0) rotate(calc(var(--r) * 1deg + var(--p) * var(--d) * 6deg))}
.nb-img{display:block;margin:7px 7px 0;aspect-ratio:1;background:#d8ccb3;overflow:hidden;position:relative}
.nb-img img{width:100%;height:100%;object-fit:cover;display:block}
.nb-play{position:absolute;right:6px;bottom:6px;font-size:.7rem;background:rgba(0,0,0,.55);color:#fff;border-radius:99px;padding:2px 7px}
.nb-cap{display:grid;padding:6px 8px 9px;gap:1px;font-family:"Segoe Print","Bradley Hand","Noteworthy","Comic Sans MS",cursive}
.nb-cap b{font-size:.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nb-cap small{font-size:.6rem;opacity:.6}
.nb-tape{position:absolute;top:-11px;left:50%;width:46%;height:20px;margin-left:-23%;background:rgba(240,200,90,.55);transform:rotate(var(--tr));box-shadow:0 1px 3px rgba(0,0,0,.15);clip-path:polygon(0 8%,4% 0,8% 10%,12% 0,100% 0,96% 12%,100% 24%,96% 36%,100% 48%,96% 60%,100% 72%,96% 84%,100% 100%,0 100%,4% 90%,0 80%,4% 70%,0 60%,4% 50%,0 40%,4% 30%,0 20%)}
.nb-stick{position:absolute;right:-8px;bottom:22px;font-size:1.5rem;transform:rotate(var(--sr));filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
.nb-curl{position:absolute;right:14px;bottom:8px;width:34px;height:34px;border-radius:0 0 22px 0;background:linear-gradient(135deg,transparent 50%,rgba(120,90,40,.28) 50%,#e9dcc0 62%);pointer-events:none}
.nb-foot{position:relative;z-index:2;text-align:center;padding:4px 0 calc(10px + env(safe-area-inset-bottom));font-family:"Segoe Print","Bradley Hand","Noteworthy","Comic Sans MS",cursive;font-size:.85rem;opacity:.75}
.nb-empty{flex:0 0 100%;display:grid;place-content:center;gap:8px;text-align:center;padding:24px;color:#2b2113}
html.lite .nb-page{perspective:none}
/* ---- Lịch kỷ niệm ---- */
.overlay.nbcal{overflow-y:auto}
.cal-bar{display:flex;align-items:center;justify-content:space-between;padding:4px 14px 10px}
.cal-bar>div{text-align:center;display:grid}
.cal-title{font-size:1.05rem}.cal-sub{opacity:.65}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:0 12px 24px}
.cal-dow{text-align:center;font-size:.7rem;opacity:.55;padding:4px 0}
.cal-cell{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);padding:0;color:inherit}
.cal-cell.off{background:none;border:0}
.cal-cell img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cal-cell em{position:absolute;left:5px;top:3px;font-style:normal;font-size:.72rem;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,.8);z-index:1}
.cal-cell u{position:absolute;right:4px;bottom:3px;text-decoration:none;font-size:.62rem;background:rgba(0,0,0,.6);color:#fff;border-radius:99px;padding:1px 6px;z-index:1}
.cal-cell.has{border-color:rgba(226,176,74,.6)}
.cal-day{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:56vh;overflow-y:auto}
.plus-back{margin-left:auto}

"""
c = rd("static/polish.css")
if "/*plusnb*/" not in c:
    wr("static/polish.css", c + CSS)

h = rd("templates/index.html")
old = '<button data-go="chat" aria-label="Tin nhắn"><svg class="i"><use href="#i-chat"/></svg><span>Chat</span><em id="chat-badge" class="badge hidden">0</em></button>'
new = '<button data-go="plus" aria-label="Plus"><svg class="i"><use href="#i-star"/></svg><span>Plus</span><em id="chat-badge" class="badge hidden">0</em></button>'
if new not in h:
    if old not in h: raise SystemExit("[loi] khong thay nut Chat tren thanh dieu huong")
    h = h.replace(old, new, 1)
tag = '  <script src="/static/js/plusnb.js"></script>'
if tag not in h:
    anchor = '  <script src="/static/js/x32.js"></script>'
    if anchor not in h: raise SystemExit("[loi] khong thay x32.js trong index.html")
    h = h.replace(anchor, anchor + "\n" + tag, 1)
wr("templates/index.html", h)
print("[ok] patch64 xong: thanh duoi doi Chat thanh Plus; Plus co So luu niem, Lich ky niem va moi chuc nang; Tin nhan nam trong Plus")
