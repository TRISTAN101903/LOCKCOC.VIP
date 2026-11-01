import os, re
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
def rd(p): return open(P(p), encoding="utf-8").read()
def w(p, s): open(P(p), "w", encoding="utf-8").write(s)
def sub(s, old, new, what):
    if old not in s: raise SystemExit("[loi] khong thay doan can sua: " + what)
    return s.replace(old, new, 1)
if os.path.exists(P("static/js/ioshint.js")): raise SystemExit("[loi] da ap dung patch46 roi")
a = rd("app.py")
if "ios.mobileconfig" not in a: raise SystemExit("[loi] can cai patch29 truoc")
# 1) profile luon tro toi https (sau proxy Render, host_url hay la http)
a = sub(a, '    host = request.host_url.rstrip("/")\n    url = host + "/app"',
 '    host = request.host_url.rstrip("/")\n    if not re.match(r"^http://(localhost|127\\.|192\\.168\\.|10\\.)", host):\n        host = "https://" + host.split("://", 1)[-1]\n    url = host + "/app"', "https")
w("app.py", a)
# 2) goi y tren trang: Safari moi cai duoc ho so
w("static/js/ioshint.js", '''"use strict";
(function () {
  var b = document.getElementById("ios-btn"); if (!b) return;
  var ua = navigator.userAgent || "", ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var safari = ios && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Zalo|Line\\/|; wv\\)/i.test(ua);
  var note = document.createElement("p"); note.className = "fine ios-note";
  if (ios && !safari) {
    note.textContent = "Trình duyệt này không cài được hồ sơ. Hãy mở trang bằng Safari (bấm nút để sao chép liên kết).";
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var u = location.origin + "/";
      try { navigator.clipboard.writeText(u); } catch (x) { /* bỏ qua */ }
      alert("Hãy dán liên kết này vào Safari rồi bấm lại nút tải:\\n" + u);
    });
  } else if (!ios) {
    note.textContent = "Nút này dành cho iPhone và iPad. Máy Android hãy dùng nút Tải APK.";
  } else {
    note.textContent = "Không được? Mở bằng Safari, bấm Chia sẻ, chọn Thêm vào MH chính.";
  }
  b.insertAdjacentElement("afterend", note);
})();
''')
L = rd("templates/landing.html")
if "ioshint.js" not in L: L = sub(L, "</body>", '  <script src="/static/js/ioshint.js"></script>\n</body>', "landing body")
w("templates/landing.html", L)
c = rd("static/landing.css") + "\n.ios-note { margin: 10px 0 0; font-size: .85rem; opacity: .8; line-height: 1.4; }\n"
w("static/landing.css", c)
print("[ok] patch46 xong: iOS luon tro https, goi y dung Safari")
