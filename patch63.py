import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
JS = """
eNqVVs2K3EYQvu9TlHUwkj2Wfw6BzGQxtjGJIbYhTshh8aEl1Yx6t9Utd7dmPdhzyimExJhAIIQQjK8J+BBI8OS2xu8xT5A8Qqpa
0owmuzbkMKh/qr76uurr6okah+C8lbmPJnuXL0CNdnotPXRwCfx69VzC21cNqLev1qufPIi6HsNMrl+/lFCdvAQa6BKOypPf9Qzy
cv36Dw2qWa++D9OT33Q54uXV13AV5rJAA3V58sIT8usXhLBe/Uhj2v9Zwpvncr36qhpBsV59q+FRIzQ4tm393jyncNl69Q3M1qsX
cOHyXjxtdO6l0RAn8GQPYDOfysexbtcA5BTicxqePgWdalPg54sa4dz+PlxNwKJvrJ4Eu7mwoGCfrLyY3RMVwj4ZRXfufhzBdTjQ
D2EMsU4fNWgXD1Bh7o29oRTtnV6MI1nNooQ8Dh4mLfzUWIg5hqQYVyb0+QhUqlDPfEmzixeJb8tVHciHaSncDU9VyRqPcVRgbgqp
CTKBsN0vEFYk3ELn0QSWFId/3i66o2s8hruNF5yU+5lDO0c7yFrlOOZZxCr3X2ZsIMigchxeFAUW9yiZbrL1P2z9D8lfbNwP2Z3r
IQ4OKRWwhGWSmpZLXJi8qVD7NDPFYkRR8lKq4lPp/JhO0eAIXJN5i9hOybXLJeHt+Ib1JeTC5yXEyIRJyaSWZ6wjEgslZq+Vgqfy
mylUWEhxU5n8KGgh6rMSsVA6G1Tv3nNiil/Y9xiQAG6ftX3uWOrCHKd3tEfrMB/WZihIzuhcOhYkVfEB+jgZgTQ8b5SaDOVey/wo
7uXOfhk63xmOICtoeBU/HEEledjFl1qj/QTlrPRwGa51d0C6lOp5W+TlQCfzHru7TPNUuluG/HOPRRAHuRWkfpLqnGrMRtIkxDZt
dF9r3uhOF1Tac7VEaZ7O0N80jWZJ31KSyvoZgfOJmfFd4ctUZC6ObepNDRfBUtW9N1XC1KlR0ck6abQUC9JgFqiF0xeTPiXzPngv
pXefOADNQwWD8/nzQCevBfVLQu5GMUu6g2L7jeVGnqWku6J5jfc2/u2NqmG/W1ZiEXepq9m4ToOYk36w2+xOqTvZXv9WI6SZsxQ2
gEHXlxXPSgH2KUCq9hZKz5KQM+oAtOOFpcpRcFT0iuwIYbAZRNPPNxnYXYi73tCmslV0uNTcFnxp0ZVGFWO4kn7QWW0yTFRuz2nA
fQNJ1HFENGQmlfSLvBR6htEIdtMXNLJboeR9UtitdnvajmNgQ3QGDWV/EI3eM1P7Tap5TPvhQ83gyXL79mTmMe0gvR2FnEehGyrh
3Bii2jh/KeBHFI2aos3JsutAcZXKSsxwIMIqbZ9MktHWKCwlvMbBg+CCtqeCDrO94KHtdDyCS2BCEcensEbAxNCOAyF+X0O/YWQn
tZKa2nZE7sqYuh1V9JgV7bC2qIzgiTaaC1RIJzKFFivjkTEykR+x7UYURC4NCESPn4MJpyylfySoi7bvmHTQbTY+p/WB1hp7ShTz
1HLgHL+Uvoz5TNfbLs5jfsvPrE0ZsUajf3757ld6nbfdYNmqZEDxfyP+8Nfffz5j0EFlc1Ez42QIfBYK2V2qpVIBa+vWYbWNmDHC
HZvsLRO+bv8Cz5ZA0Q==
"""
open(os.path.join(R, "static/js/perf2.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))

c = os.path.join(R, "static/polish.css")
s = open(c, encoding="utf-8").read()
if "/*perf2*/" not in s:
    s += """
/*perf2*/
/* nen anh sang tinh: bo animation + filter blur tren man hinh lon (rat ton GPU) */
.ambient{animation:none!important;filter:none!important;will-change:auto!important}
/* bai dang: khong 30 animation cung luc, bo bong do mo rong, chi ve phan dang thay */
.post{animation:none!important;content-visibility:auto;contain-intrinsic-size:auto 460px}
.gtile{content-visibility:auto;contain-intrinsic-size:auto 130px}
.post-media{box-shadow:inset 0 1px 0 rgba(255,255,255,.18)!important;contain:layout paint}
.post-media img,.post-media video{will-change:auto}
.skeleton{animation:none!important}
.page{overscroll-behavior:contain;-webkit-tap-highlight-color:transparent}
html.lite *{scroll-behavior:auto!important}
@media (prefers-reduced-motion:no-preference){.page{animation-duration:.14s!important}}
"""
    open(c, "w", encoding="utf-8").write(s)

hp = os.path.join(R, "templates/index.html")
h = open(hp, encoding="utf-8").read()
tag = '  <script src="/static/js/perf2.js"></script>'
if tag not in h:
    anchor = '  <script src="/static/js/social.js"></script>'
    if anchor not in h: raise SystemExit("[loi] khong thay social.js trong index.html")
    h = h.replace(anchor, anchor + "\n" + tag, 1)
    open(hp, "w", encoding="utf-8").write(h)
print("[ok] patch63 xong: toi uu luot app (bo animation/blur nen, 1 video phat 1 luc, giai ma anh nen, bai dang content-visibility)")
