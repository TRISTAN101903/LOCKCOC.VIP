import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."

def rd(path):
    return open(os.path.join(R, path), encoding="utf-8").read()

def wr(path, text):
    open(os.path.join(R, path), "w", encoding="utf-8").write(text)

def block(a, start, end, new, label):
    i = a.find(start)
    if i < 0: raise SystemExit("[loi] khong thay " + label)
    j = a.find(end, i)
    if j < 0: raise SystemExit("[loi] khong thay diem cuoi cua " + label)
    return a[:i] + new + a[j:]

# ================= 1) SERVER =================
a = rd("app.py")
if "_account_code" not in a:
    raise SystemExit("[loi] chua co patch58 (ma TRIS-). Hay chay patch58.py truoc.")
if "/api/lock-code/issue" not in a:
    a = block(a, "def is_unlocked() -> bool:", "\n\nOPEN_API = {", """def _acct_keys() -> list:
    return [k for k in browser_keys() if account_row(k) and session_path(k).exists()]


def is_unlocked() -> bool:
    \"\"\"Moi tai khoan co ma khoa app rieng. Chua dang nhap tai khoan nao thi khong co gi de khoa.\"\"\"
    keys = _acct_keys()
    if not keys:
        return True
    k = request.headers.get("X-LockCOC-Acct") or session.get("active")
    if k not in keys:
        k = keys[0]
    unl = session.get("unl")
    unl = unl if isinstance(unl, dict) else {}
    now = time.time()
    last = unl.get(k)
    if not isinstance(last, (int, float)) or now - last > LOCK_IDLE:
        return False
    if now - last > 60:
        unl[k] = now
        session["unl"] = unl
    return True
""", "is_unlocked")
    a = a.replace('OPEN_API = {"/api/status", "/api/unlock"}', 'OPEN_API = {"/api/status", "/api/unlock", "/api/login", "/api/lock-code/issue", "/api/lock-code/ack"}', 1)
    a = block(a, '@app.get("/api/status")', '\n\n\n@app.post("/api/login")', """@app.get("/api/status")
@api
def status():
    keys = browser_keys()
    rows = [account_row(k) for k in keys]
    accounts = [acct_json(r) for r in rows if r and session_path(r["key"]).exists()]
    valid = {a["key"] for a in accounts}
    new_keys = [k for k in keys if k in valid]
    if session.get("keys") != new_keys:
        session["keys"] = new_keys
    if session.get("active") not in valid:
        new_active = accounts[0]["key"] if accounts else None
        if session.get("active") != new_active:
            session["active"] = new_active
    if accounts and not is_unlocked():
        return jr({"lib": lib() is not None, "locked": True, "accounts": [], "active": None})
    return jr({"lib": lib() is not None, "locked": False, "accounts": accounts, "active": session.get("active")})


@app.post("/api/unlock")
@api
def unlock():
    keys = _acct_keys()
    if not keys:
        raise ApiError("Hay dang nhap tai khoan truoc, sau do nhap ma khoa cua tai khoan do.", 400)
    ip = "u:" + (request.remote_addr or "?")
    if too_many_attempts(ip):
        raise ApiError("Nhập sai quá nhiều lần, thử lại sau vài phút.", 429)
    code = re.sub(r"[^A-Z0-9]", "", need(body(), "code", 128).upper())
    record_attempt(ip)
    hit = None
    for k in keys:
        row = account_row(k)
        c = _account_code(row["uid"]) if row and row["uid"] else None
        if c and hmac.compare_digest(code.encode(), c.replace("-", "").encode()):
            hit = k
    if not hit:
        raise ApiError("Mã khóa không đúng.", 403)
    unl = session.get("unl")
    unl = dict(unl) if isinstance(unl, dict) else {}
    unl[hit] = time.time()
    session["unl"] = unl
    session["active"] = hit
    session.permanent = True
    return jr({"ok": True})


@app.post("/api/lock")
@api
def lock_app():
    session.pop("unl", None)
    return jr({"ok": True})


@app.get("/api/lock-code/issue")
@api
def lock_code_issue():
    \"\"\"Sau khi dang nhap: cho 15 giay roi moi tra ma khoa app cua tai khoan (chi trong cua so cap ma).\"\"\"
    iss = session.get("issue")
    now = time.time()
    if not isinstance(iss, dict) or now > float(iss.get("until", 0)):
        raise ApiError("Het phien cap ma, hay dang nhap lai.", 404)
    if now < float(iss.get("ready", 0)):
        return jr({"wait": int(float(iss["ready"]) - now) + 1})
    row = account_row(iss.get("key", ""))
    code = _account_code(row["uid"]) if row and row["uid"] else None
    if not code:
        raise ApiError("Chua cap duoc ma, hay dang nhap lai.", 404)
    return jr({"code": code, "wait": 0})


@app.post("/api/lock-code/ack")
@api
def lock_code_ack():
    session.pop("issue", None)
    return jr({"ok": True})
""", "status/unlock/lock")
    old = '    session["keys"] = keys + [key]\n    session["active"] = key\n    return jr({"ok": True, "account": acct_json(account_row(key))})'
    if old not in a: raise SystemExit("[loi] khong thay doan cuoi cua login trong app.py")
    a = a.replace(old, '    session["keys"] = keys + [key]\n    session["active"] = key\n    unl = session.get("unl")\n    if isinstance(unl, dict) and key in unl:\n        unl = dict(unl)\n        unl.pop(key, None)\n        session["unl"] = unl\n    session["issue"] = {"key": key, "ready": time.time() + 15, "until": time.time() + 1800}\n    return jr({"ok": True, "account": acct_json(account_row(key))})', 1)
    wr("app.py", a)

# ================= 2) JS =================
JS = """
eNqtWF9vG0UQf++nWE6iOjeXcwIqgpqC2hBERAuVEsED4mF9t/Fts7fr7u7ZsVpLSDwgnmjVB1QVREpUqoKqFuhT/MCDo34P80mY
2fvjO+cPpSKS47vd2dnZ38z8ZtZeZhgxVvPIep0z7XNEqGhnW6hheN2QZZJO98lOMv2TEtrvE82nv8oeiRJF7GzyGzza6R4HATU7
2JcXiKEZvHByeOfwa5iUyezgSZ8kfDb5RhKbTJ/DYHf6QJFodvCw75T7UTKb/EhWz5Men/48agWlOE4OpnukOzt4akk3m03uRbAB
rE2mj2HtbHKfgxU4ea59xt/OZGS5ksRvkZtnCOHbxLejPlPbYDknr128SLxSxiO3bpFikomFuRbRzGZadkDJgGry+aWNLXIRDCwH
jGCsDyPzHVMDexbLiGRDck2rlBtWM0qjhGF2i6dMZdbXAYFVHTLGD2quRCPVH22xXevb/CD5USQd8B61SoeR4P2uojomZ8+SY4bD
oeaWoYZWZdJpUrBPx21zuv3MBCBxvbQph8JSwCFWUZYyacNIM2rZumD45nsWlFMY8uCIloYDKjIG4ta9ARSXLERdN7PM90AqVlKM
vIB4hXgkqDGf0BSXeGJn2VKvM9+qq+JRCBHJZLyWcBH7lrYKvYJF1i+OlFupdtBbVBgGInoEjnAjlTK2y6I1laZUxr6H8KMJYxJR
GyXEZ61yQaFijPtolqoBg31w6n1AxkDcXUCEfARwXWulS2WFMWP3PYbPkMsYEkxEG8ZkbE3FrBFOJcb/5hAlBmzBH9wK1MWE7yVv
Apo3x4Do4W2KSVul3DyfMZEhvx7Iv7/6xWtgZrJuoaePaohzxwXnCZjyCOr9LONETP8A3Yd3ZpN9TjyylKfLEjy6dG4q3eZCFFr5
olac8wqMSvkufHLxmA8WF8CkMwMXNlZFgOdltXvyShQAloljJhd3lMqyk87t5qplcP6PpvujOiMBtHK6N3KshWhbwGA2eYrPj5H+
gAxlSC4j3jj2SM6XAJt9D2Dmg7PJT+idkGzVGRNo8tuC70qada7D/w9TslnaETYx71pZHAhSzQK/1U+Fk33NUwpZ0UXiL88XOHpE
iXwRnhd1mD49omFZ0C4TOSSbdTSqyM8tgfzKqDjdmP/FiK3pcyxBgG0vcaA+4MeYEyGFnhwjONvD92pbnvaclNERyLSNpZZHbaF6
KjQDnKLCwgQ8DHlsE3g8/xa8JIz3Epu/QbQFeZIGmGEBRnhQBmzgoi9AjwUFWE0aG5xsLkcigUGtBAIWcwp2IZtSzelyqmIqPBi3
GqTwPHi8SvnJrKoGlZBmNzJm7CUJ0YIM9KEGbm5WXZeKobEjwUKrqTQcpz7ItFsAxpfcYIDKa7IOLqT51ZWV173OQkoKtm2LtYAd
8jDUjg1pmYaKsmBAIXuV2iRM6a6/EuRDy2QVmBrrqHt9j6y0EP8QS9SaAl0Sl3lrQGaOxJzUnMQ6CBkYt1IZRs1IRnPK3uaSm8SZ
kBcYOqTcYuPhe23438awdrzTptGOc17KbKJi8Mm1Tze3YOS6UdBA3RznHUGj+EBT1p1NviM3MgqtDkyqQa3+FIUAH8cnWMdAF1YZ
f14tSGGia2Z855hzzSNCS6I08dEFHMBZAfzIu+Rt+FpaqushxZFREBPq5KPnQVo4Ig5xrGpR8tdOw6rKjasBzLsJ6NtWW5Wl1YHx
r47YUd+yMGXG0B5DFd7HObHmJfHwzotnUL4i5IgAaXryJCcNLIq5sW3g7r8s6SfY/95qdrdOtM1hP2P95jbAOKBPqyFZONkbi+bP
n3L5Wg9xiq0JFqBjrKmVgFJxLQZCmzBZS5zcD3OHRoJRXSWY3cHGCilrMVuuNluJ2eQRzSsSgHZMcl0ta1083ZNJ4ypRu0M09VQ2
AU/mHeEVbmxIY2jUiiIB1hX8ubBhHk9fHCXXL0MI7HUaJTUMdjFqdmtbFPlV22VcywzQgkasD2ArFGeSYbcnuEvuo51cAWzZ2TvE
F92AFqBeoFk92nRtLLo/nBe31iKkh7cB03kD8vcPdwF61BFzQ7uCYToi5XfqN4+cqwLyTh6CQc1A0jS9KEKnomIVhbAvg3RuC1wP
f3dt4T3XHuZRW0RsoyoTPZvc5UUTI6cHcNWDwCAxrriPXaLHMA8WPVB/Lsw8xSHuyPOcaIWOLGrgv1ICrCUvntFjEvPY+G8ywxXs
99BZp8R1ZY9r4/5DE/fKjdPh7SNUUmuaIOxfNuhPrlCYrnj9rHcZ3ZpnGlel8satIFV0/cbWY7a4Zl4ebQBmrsY4qRw35Gz32srX
vrTdtV8NTKKGV1SPQ+Oy8PtANeNjchWBOW7hpfMfv3HjuQ==
"""
open(os.path.join(R, "static/js/lockflow.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))

b = rd("static/js/boot.js")
oldl = '    toast("Đăng nhập thành công", "ok");\n    await enterMain();'
newl = '    toast("Đăng nhập thành công", "ok");\n    if (typeof lcIssueCode === "function") await lcIssueCode();\n    await boot();'
if newl not in b:
    if oldl not in b: raise SystemExit("[loi] khong thay doan dang nhap trong boot.js")
    b = b.replace(oldl, newl, 1)
    wr("static/js/boot.js", b)

ak = os.path.join(R, "static/js/accountkey.js")
if os.path.exists(ak):
    t = open(ak, encoding="utf-8").read().replace("Mã tài khoản LockCOC", "Mã khóa app của bạn")
    open(ak, "w", encoding="utf-8").write(t)

# ================= 3) HTML =================
h = rd("templates/index.html")
for old, new in [
    ('<p class="tagline">App đang được khoá. Nhập mã khoá để tiếp tục.</p>', '<p class="tagline">Nhập mã khóa app của tài khoản bạn vừa đăng nhập.</p>'),
    ('<label class="field"><span>Mã khoá app</span>', '<label class="field"><span>Mã khóa app (TRIS-XXXX-XXXX-XXXX)</span>'),
    ('<input type="password" name="code" autocomplete="off" autocapitalize="none" required>', '<input type="text" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="TRIS-" required>'),
]:
    if new in h: continue
    if old not in h: raise SystemExit("[loi] khong thay doan trong man khoa: " + old[:40])
    h = h.replace(old, new, 1)
import re
fine_new = '<p class="fine">Mã khóa app là mã riêng của từng tài khoản, được cấp sau khi bạn đăng nhập Locket. Mã không phải mật khẩu Locket. Quên mã thì đăng nhập lại để được cấp lại. Lần mở đầu có thể mất khoảng 30 giây để máy chủ thức dậy.</p>\n          <button class="btn block" type="button" id="lock-other"><span class="btn-label">Đăng nhập tài khoản khác</span></button>'
if 'id="lock-other"' not in h:
    h, n = re.subn(r'<p class="fine">Mã khoá do chủ máy chủ đặt.*?</p>', lambda m: fine_new, h, count=1, flags=re.S)
    if n != 1: raise SystemExit("[loi] khong thay dong chu nho trong man khoa")
tag = '  <script src="/static/js/lockflow.js"></script>'
if tag not in h:
    fp = '  <script src="/static/js/fastpost.js"></script>'
    if fp not in h: raise SystemExit("[loi] khong thay fastpost.js (hay chay patch51 truoc)")
    h = h.replace(fp, fp + "\n" + tag, 1)
wr("templates/index.html", h)

# ================= 4) TRANG GIOI THIEU =================
l = rd("templates/landing.html")
pairs = [
    (['<h3>Mã khóa và mã tài khoản</h3><p>Nhập mã khóa mới vào được app. Đăng nhập xong, mỗi tài khoản nhận một mã riêng dạng TRIS-XXXX-XXXX-XXXX, xem trong Hồ sơ.</p>',
      '<h3>Mã khóa</h3><p>Chưa nhập mã thì không vào được app, kể cả khi có đường dẫn.</p>'],
     '<h3>Mã khóa riêng</h3><p>Đăng nhập xong, mỗi tài khoản được cấp một mã khóa app riêng dạng TRIS-XXXX-XXXX-XXXX. Phải nhập đúng mã mới vào được app.</p>'),
    (['<li><b>Mở LockCOC</b>, nhập mã khóa rồi đăng nhập tài khoản Locket. Đăng nhập xong, mã tài khoản TRIS- của bạn hiện trong Hồ sơ.</li>',
      '<li><b>Mở LockCOC</b>, nhập mã khóa rồi đăng nhập tài khoản Locket.</li>'],
     '<li><b>Mở LockCOC</b> và đăng nhập tài khoản Locket. App cấp cho bạn mã khóa riêng sau 15 giây, bạn sao chép mã rồi nhập để vào app.</li>'),
]
for olds, new in pairs:
    if new in l: continue
    for o in olds:
        if o in l:
            l = l.replace(o, new, 1); break
    else:
        raise SystemExit("[loi] khong thay doan trong landing.html: " + olds[0][:40])
faq_new = '<details><summary>Mã khóa lấy ở đâu?</summary><p>Mã do app cấp cho bạn ngay sau khi đăng nhập Locket, dạng TRIS-XXXX-XXXX-XXXX. Mỗi tài khoản một mã riêng. App chờ 15 giây rồi hiện mã và bạn phải sao chép mã đó. Quên mã thì đăng nhập lại để được cấp lại. Mã không phải mật khẩu Locket.</p></details>'
if faq_new not in l:
    l, n = re.subn(r'<details><summary>Mã khóa lấy ở đâu\?</summary>.*?</details>', lambda m: faq_new, l, count=1, flags=re.S)
    if n != 1: raise SystemExit("[loi] khong thay muc hoi nhanh ma khoa")
l = re.sub(r'\n\s*<details><summary>Mã TRIS- là gì\?</summary>.*?</details>', '', l, flags=re.S)
l = l.replace("Máy chủ LockCOC, có mã khóa", "Máy chủ LockCOC, có mã khóa riêng cho từng tài khoản")
l = l.replace("chỉ trình duyệt đã nhập đúng mã khóa mới dùng được", "chỉ trình duyệt đã nhập đúng mã khóa của tài khoản mới dùng được")
wr("templates/landing.html", l)

# ================= 5) CSS =================
c = rd("static/polish.css")
if "/*lkissue*/" not in c:
    c += """
/*lkissue*/
.lk-issue{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,7,5,.86);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.lk-card{width:min(92vw,380px);display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 20px;border-radius:24px;text-align:center}
.lk-card h3{margin:0}
.lk-sub,.lk-note{margin:0;opacity:.75;font-size:.92rem}
.lk-bar{width:100%;height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
.lk-fill{display:block;height:100%;width:0;background:linear-gradient(90deg,#fbe3a0,#e2b04a,#b9822a);transition-property:width;transition-timing-function:linear}
.lk-code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.5rem;font-weight:700;letter-spacing:.08em;padding:14px 12px;width:100%;box-sizing:border-box;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(226,176,74,.5);color:#fbe3a0;user-select:all;-webkit-user-select:all}
.lk-card .hidden,.lk-issue .hidden{display:none!important}
.lk-ta{position:fixed;opacity:0;pointer-events:none}
"""
    wr("static/polish.css", c)
print("[ok] patch60 xong: ma khoa app rieng tung tai khoan (TRIS-...), dang nhap truoc roi nhap ma, cho 15 giay, bat buoc sao chep ma")
