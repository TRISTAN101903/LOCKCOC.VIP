import os
R="LockCOC" if os.path.isdir("LockCOC") else "."
def rd(p): return open(os.path.join(R,p),encoding="utf-8").read()
def w(p,s,m="w"): open(os.path.join(R,p),m,encoding="utf-8").write(s)
c=rd("static/landing.css")
if "bo khung v5" in c: raise SystemExit("[loi] da ap dung patch20 roi")
w("static/landing.css","""
/* bo khung v5: video khong khung, mep mo hoa vao trang */
.phone { width: min(88vw, 360px, calc((100vh - 120px) * .48)); padding: 0; background: none; border: 0; box-shadow: none; border-radius: 0; transform: none !important; animation: none !important; }
.phone::before { display: none; }
.phone-in { border-radius: 0; overflow: visible; background: transparent; aspect-ratio: 414 / 860; }
.phone-in video { background: transparent; object-fit: cover;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 16%, #000 84%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 11%, #000 87%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image: linear-gradient(to right, transparent 0, #000 16%, #000 84%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 11%, #000 87%, transparent 100%);
  mask-composite: intersect; }
.phone-col::before { inset: 0 -22% 0; opacity: .9; }
""","a")
h=rd("templates/landing.html")
h=h.replace("Quay màn hình app thật, dữ liệu và ảnh trong video là mẫu.","Video giới thiệu LockCOC. Ảnh và dữ liệu trong video là mẫu.")
h=h.replace("Quay màn hình LockCOC: chụp 4-Cuts, đăng bài, xem bảng tin, nhắn tin","Video giới thiệu LockCOC: chụp 4-Cuts, đăng bài, xem bảng tin, nhắn tin")
w("templates/landing.html",h)
print("xong patch20")
