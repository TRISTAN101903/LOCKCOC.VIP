import os
R = "LockCOC" if os.path.isdir("LockCOC") else "."
p = os.path.join(R, "static/js/editor.js")
h = open(p, encoding="utf-8").read()
old = 'const frameRow = el("div", { class: "hrow" }, ...FRAMES.map('
new = 'const frameRow = el("div", { class: "hrow frow" }, ...FRAMES.map('
if new not in h:
    if old not in h: raise SystemExit("[loi] khong thay frameRow trong editor.js")
    h = h.replace(old, new, 1)
    open(p, "w", encoding="utf-8").write(h)
c = os.path.join(R, "static/polish.css")
s = open(c, encoding="utf-8").read()
if "/*frow*/" not in s:
    s += """
/*frow*/
.frow{flex-wrap:wrap;overflow:visible;gap:8px}
.frow .chip{flex:0 0 auto}
.frow .chip[data-f=vip]{order:-2;flex:1 1 100%;justify-content:center;font-weight:700;color:#1a1306;background:linear-gradient(135deg,#fbe3a0,#e2b04a 55%,#b9822a);border:0;box-shadow:0 0 18px rgba(226,176,74,.35)}
.frow .chip[data-f=vip].on{outline:2px solid #fff;outline-offset:2px}
.frow .chip[data-f=none]{order:-1}
"""
    open(c, "w", encoding="utf-8").write(s)
print("[ok] patch53 xong: khung VIP nam dau muc Khung widget Locket, cac khung xep het ra khong phai vuot ngang")
