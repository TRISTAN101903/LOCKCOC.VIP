import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
JS = """
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
"""
open(os.path.join(R, "static/js/autosave.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))

hp = os.path.join(R, "templates/index.html")
h = open(hp, encoding="utf-8").read()
tag = '  <script src="/static/js/autosave.js"></script>'
if tag not in h:
    fp = '  <script src="/static/js/fastpost.js"></script>'
    if fp not in h: raise SystemExit("[loi] khong thay fastpost.js trong index.html (hay chay patch51 truoc)")
    h = h.replace(fp, fp + "\n" + tag, 1)
    open(hp, "w", encoding="utf-8").write(h)

# giu server khong ngu: GitHub Actions goi trang web moi 10 phut
wd = ".github/workflows"
os.makedirs(wd, exist_ok=True)
open(os.path.join(wd, "keepalive.yml"), "w", encoding="utf-8").write("""name: Keep alive
on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Render
        run: curl -fsS -m 90 --retry 2 --retry-delay 10 https://lockcoc-vip.onrender.com/api/status || true
""")
print("[ok] patch57 xong: tu luu bai vua dang ve may (bat/tat trong Ho so) + workflow giu server khong ngu")
