import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."

def rd(path):
    return open(os.path.join(R, path), encoding="utf-8").read()

def wr(path, text):
    open(os.path.join(R, path), "w", encoding="utf-8").write(text)

# ===== 1) Lam net v2 =====
if not os.path.exists(os.path.join(R, "static/js/aistudio.js")):
    raise SystemExit("[loi] chua co aistudio.js, hay chay patch55.py va patch56.py truoc")
JS = """
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
"""
open(os.path.join(R, "static/js/aistudio.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))

# ===== 2) Tu dang xuat sau 7 ngay khong dung =====
a = rd("app.py")
if "IDLE_LOGOUT" not in a:
    helper = """IDLE_LOGOUT = 7 * 86400  # tai khoan 7 ngay khong dung thi bi dang xuat


def _purge_idle() -> int:
    \"\"\"Dang xuat (xoa phien) cac tai khoan trong trinh duyet nay ma 7 ngay khong dung.\"\"\"
    cutoff = time.time() - IDLE_LOGOUT
    n = 0
    for k in browser_keys():
        row = account_row(k)
        if row and float(row["last_used"] or row["created"] or 0) < cutoff:
            remove_account(k)
            n += 1
    return n


def _touch_account(key: str) -> None:
    row = account_row(key)
    if row and time.time() - float(row["last_used"] or 0) > 600:
        q("UPDATE accounts SET last_used=? WHERE key=?", (time.time(), key), commit=True)


"""
    anchor = "def get_entry() -> Entry:"
    if anchor not in a: raise SystemExit("[loi] khong thay get_entry trong app.py")
    a = a.replace(anchor, helper + anchor, 1)
    old = '    key = request.headers.get("X-LockCOC-Acct") or session.get("active")\n    if key not in browser_keys() or not account_row(key) or not session_path(key).exists():\n        raise ApiError("Chưa đăng nhập", 401)\n'
    if old not in a: raise SystemExit("[loi] khong thay doan kiem tra dang nhap trong get_entry")
    a = a.replace(old, '    _purge_idle()\n' + old + '    _touch_account(key)\n', 1)
    old2 = '@api\ndef status():\n    keys = browser_keys()\n'
    if old2 not in a: raise SystemExit("[loi] khong thay status trong app.py (hay chay patch60 truoc)")
    a = a.replace(old2, '@api\ndef status():\n    expired = _purge_idle()\n    keys = browser_keys()\n', 1)
    old3 = '    if accounts and not is_unlocked():\n        return jr({"lib": lib() is not None, "locked": True, "accounts": [], "active": None})\n    return jr({"lib": lib() is not None, "locked": False, "accounts": accounts, "active": session.get("active")})'
    if old3 not in a: raise SystemExit("[loi] khong thay cuoi status (hay chay patch60 truoc)")
    a = a.replace(old3, '    if accounts and not is_unlocked():\n        return jr({"lib": lib() is not None, "locked": True, "accounts": [], "active": None})\n    if session.get("active") in valid:\n        _touch_account(session["active"])\n    return jr({"lib": lib() is not None, "locked": False, "accounts": accounts, "active": session.get("active"), "expired": expired})', 1)
    a = a.replace("PERMANENT_SESSION_LIFETIME=timedelta(days=14),", "PERMANENT_SESSION_LIFETIME=timedelta(days=7),", 1)
    wr("app.py", a)

b = rd("static/js/boot.js")
old = "  if (st.locked) return showLock();"
new = '  if (st.expired) toast("Tài khoản đã đăng xuất vì 7 ngày không sử dụng. Hãy đăng nhập lại.", "msg");\n  if (st.locked) return showLock();'
if new not in b:
    if old not in b: raise SystemExit("[loi] khong thay doan boot trong boot.js")
    wr("static/js/boot.js", b.replace(old, new, 1))
print("[ok] patch61 xong: lam net v2 (them muc Sieu net) va tu dang xuat sau 7 ngay khong dung")
