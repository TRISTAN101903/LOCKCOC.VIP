import os
R = "LockCOC" if os.path.isdir("LockCOC") else "."
p = os.path.join(R, "static", "landing.css")
s = open(p, encoding="utf-8").read()
if "/* video ngang v2 */" in s: raise SystemExit("[loi] da ap dung patch39 roi")
if "video keynote 16:9" not in s: raise SystemExit("[loi] can cai patch38 truoc")
s += """
/* video ngang v2: du khung 16:9, nho gon, chi lam mem nhe cac canh */
.phone { width: min(88vw, 380px); }
.phone-in { aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; }
.phone-in video { width: 100%; height: 100%; object-fit: contain; background: #000;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 9%, #000 91%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 9%, #000 91%, transparent 100%);
  mask-composite: intersect; }
.phone-col::before { inset: 14% -6% 14%; }
"""
open(p, "w", encoding="utf-8").write(s)
print("[ok] patch39 xong: video ngang nho gon")
