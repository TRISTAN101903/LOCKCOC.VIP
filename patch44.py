import os, re
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
c = open(P("static/landing.css"), encoding="utf-8").read()
if "patch44" in c: raise SystemExit("[loi] da ap dung patch44 roi")
c += """
/* patch44: video gioi thieu to hon, bo nut tam dung */
.phone { width: min(96vw, 680px) !important; }
.phone-in { border-radius: 18px; }
.phone-col { min-width: 0; }
#vid-btn, .vid-btn { display: none !important; }
@media (min-width: 900px) { .phone { width: min(46vw, 700px) !important; } }
"""
open(P("static/landing.css"), "w", encoding="utf-8").write(c)
lp = P("templates/landing.html")
L = open(lp, encoding="utf-8").read()
L2 = re.sub(r'<button[^>]*id="vid-btn"[^>]*>.*?</button>', "", L, flags=re.S)
if L2 != L: open(lp, "w", encoding="utf-8").write(L2)
print("[ok] patch44 xong: video to hon, da bo nut tam dung")
