import os
R = "LockCOC" if os.path.isdir("LockCOC") else "."
p = os.path.join(R, "templates/index.html")
h = open(p, encoding="utf-8").read()
ed = '  <script src="/static/js/editor.js"></script>'
if ed not in h: raise SystemExit("[loi] khong thay editor.js trong index.html")
add = []
for name in ("brandframe.js", "orient.js"):
    tag = '  <script src="/static/js/%s"></script>' % name
    h = h.replace(tag + "\n", "")
    if os.path.exists(os.path.join(R, "static/js", name)): add.append(tag)
if not add: raise SystemExit("[loi] khong thay brandframe.js / orient.js")
h = h.replace(ed, ed + "\n" + "\n".join(add), 1)
open(p, "w", encoding="utf-8").write(h)
print("[ok] patch52 xong: khung LockCOC VIP va giu ngang/doc da duoc nap sau editor.js")
