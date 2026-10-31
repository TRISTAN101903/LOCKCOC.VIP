import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
def rd(p): return open(P(p), encoding="utf-8").read()
def w(p, s): open(P(p), "w", encoding="utf-8").write(s)
F = {'x32.js': 'eNqdU71yEzEQ7v0UG9GcE1sZSBfjYcDjikzwTCjoGJ1ufSeikw6dzsRD/AAUeQA6KNJQUsaln+TehJUuxjbpaG6k/fn2+77VsaZGqL1T0rNR7/QYbs5e8E81DME7YXK4sPJ68m4CM93UkLfrO3MOsmjX32Cx+aGgbNf3Ej43aMAXTbv+LgcgN78N6Pbhp4K0fbgvgX3AktKbXyWD49NeMm+M9MoaSPrwtQewEA4+5hWMIbczkeOIYt2JQrviqquGUEuXUTyrOSXgaDwGVhFF1geHvnGmywZkrWpPOJmVTYnGcyLrlleoUXrrEvasojnD0As8fIehnu2hH0WA29sIxDPhRY2ez63ODmc9SdNQ9pztiDj7pabYa+fEklfOeuuXFfJaK4lcCq2TCCELpTOHpj+At9PpjDrOdmQCBtdocl/Ay3EsOGQRCyJkEpPExE2FLPZMd+QjOC61qOuLMFFkWcIC42GhMiTtsOrvaKf75kmHwuNUY7glLG28t2brVsqDoCD7MT6iUBxzKcoYJ20VRJdL6zDmPd74iTWe8ELF36cCDE4O9Q4f5Z5QKr47th1LAqYLAghq0CBtVZID12wA/z61rShb0YsddzvbGeFtnmtMWGOCG1tZ8IRl7H4F7H3RdP8Eg/P/or71OfKoBG3dX9oMuTI1Ov8GaXmYpIMub4jDlUq1MnlsW416q35Cxz/olTm6', 'x32.css': 'eNrTK8gpLdbNySwuscrLL9HQK81Ly89J0VTQA1G6GZkpqQrVCimZxQU5iZVWCnn5eanWCrVcemBduflFINncxKL0zDwrBYuCCoXE0pJ8BQNrhI6knPzkbJAWAJ3gJAs='}
def D(k): return zlib.decompress(base64.b64decode(F[k])).decode("utf-8")
def sub(s, old, new, what):
    if old not in s: raise SystemExit("[loi] khong thay doan can sua: " + what)
    return s.replace(old, new, 1)
if os.path.exists(P("static/js/x32.js")): raise SystemExit("[loi] da ap dung patch32 roi")
f = rd("static/js/fold.js")
f = sub(f, "/^(Chat kiểu mới|Chụp Đêm|Chụp liên tiếp|Photobooth|Ngày này năm xưa|Wrapped|Thẻ nhạc)/", "/^(Chat kiểu mới|Chụp Đêm|Photobooth|Wrapped)/", "hot")
w("static/js/fold.js", f)
w("static/js/x32.js", D("x32.js"))
w("static/polish.css", rd("static/polish.css") + "\n" + D("x32.css"))
h = rd("templates/index.html")
h = sub(h, '  <script src="/static/js/plus.js"></script>', '  <script src="/static/js/plus.js"></script>\n  <script src="/static/js/x32.js"></script>', "index script")
w("templates/index.html", h)
print("[ok] patch32 xong")
