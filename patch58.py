import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
JS = """
eNqNVc+LI0UUvs9f8baE3c5u0jOwetkhCg4LLq4oO3MQRKSm+iVdm+qutqo6M2E2sOBBvLkoiDdlQPAgCHraHDPs/5H9S3yvutNJ
ZkYxhyRV9X5+9b2vRO0RfHBaBXG4t38fpFK2LsMEZ+lzDwPI9WrxbQnF8hLC8hcNk9yuXl+WcPLsyfHgc/psviA4W47ho9XiB/Bv
foVE5avFd6CWf4GXNXlquHp19Q2ZlPnq9R9VH4rV4ie9G5e2fg6crgf39/eSUV2qoG0JSQ8u9gD0CJIwq9COQFYa7gyHINY2Al68
gPYQzbWzHjgMtSsPKchUOlA2QyAD0aeloX9lbQwfdhmVrWZJaNI2iUs51WMZrEuV0dWplS6Du3fhlu30zOmAJ3ge1nn/24ryHMY0
a2M8g8+cLbTHLQgc+j5ZPKeaYg9BUt2ZVXWBZUiVQxnwsUFeJSJQWElbondIhik1WXPDIa58mBlMK+t1jMxA6XPMxNahraTSYcZn
B7TfpTm12SyVVYVldpRrkyVBNhk8GlQhaRsBYsOM6uz88BzVkS0KWWaJYGzpSj6gbjzd7CPuijxhDkoGlUOC3CNvYtyl8A4LO8Vo
FFPMd+6K0EzWV8XQ5NaHbXC+rtHNjmOF1iXinUqOcVAgpAUOcpQZo8RXfIcdN3fWcqKlDAXk4+vBUjkZcAHrGKrzV2tnJhiaRJwS
3S5AGen9IxDsRzQUMO+DePvyN9HbJDsN5dqnDoEIvO3Ih76QxtAuE563GisOxU6+kjdcBkaeommyHUsLKl/+Xolem5QMUpllj6cE
11PtA5ZIvRFX1YQC7cxhgxSX3k1VMy1xKw05lruDC8FKT5y8+p5kxK9T3xAVyiPshGGcX8/YBvg4X/5N+rEJcfXqzZ+rxaViV3TO
OtEQpCUJxEtjQDI9vYE9z++Y1xvYWlAvGKNPrmveU6smR58eiV7UjD5DtnVjUoV/IwiRTMZmPJcXTXTp0YUPcWQdJqofvUm+mHFk
ss0fJrr0s1JtIHE4osHJdxjPjTZj0DJZbUveehzZMiNLeSZ1YAlNxD5977eyPyDd5xJbdczS+IfqEiQB1HPKqnJkS2IHN9udvn35
IxmoNKLL7EmDHY8NJiLXWYZ8sw1fDmM7sDPmnRTvRiAydu6t37wV769Y+4dcPvfWLnYhSioZ8m18XNc1e7OCGZL3XJOkSjeOKuHb
22T42B2G/IREfIwd6+aBuXbgzzR1QlrmMZzoAm0dkvZ6+vDuwcGurrt4oes3iCf8oA96Sr/k/oRgdQRycnPYmouNYBmUrrPU00iW
lg2slGjoQWeXBw9KeJ8q6N3mQvR+r62tk8j/M/zYPT08Vik9MGMMDd8CP4X0Chnr0e8uEvFFJoMcsOgO7xV478s+NDtj26xJhW4F
8CEXydUGVxN59uY9fl/+AYJE3tk=
"""
open(os.path.join(R, "static/js/accountkey.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))

# ---- server ----
p = os.path.join(R, "app.py")
a = open(p, encoding="utf-8").read()
if "_account_code" not in a:
    helper = '''_AK_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_ak_ready = False


def _account_code(uid) -> str | None:
    """Ma tai khoan dang TRIS-XXXX-XXXX-XXXX, moi tai khoan (uid Locket) mot ma, chi cap sau khi dang nhap.
    Co LOCKETCAC_SECRET: ma suy ra co dinh nen khong doi khi server bi xoa du lieu; khong co: ma ngau nhien luu trong DB."""
    global _ak_ready
    if not uid or not isinstance(uid, str):
        return None
    if not _ak_ready:
        q("CREATE TABLE IF NOT EXISTS account_codes(uid TEXT PRIMARY KEY, code TEXT NOT NULL, created REAL)", commit=True)
        _ak_ready = True
    row = q("SELECT code FROM account_codes WHERE uid=?", (uid,), one=True)
    if row:
        return row["code"]
    env = os.environ.get("LOCKETCAC_SECRET")
    if env:
        digest = hmac.new(env.encode(), ("lockcoc-code:" + uid).encode(), "sha256").digest()
        chars = [_AK_ALPHA[b % len(_AK_ALPHA)] for b in digest[:12]]
    else:
        chars = [secrets.choice(_AK_ALPHA) for _ in range(12)]
    code = "TRIS-" + "".join(chars[0:4]) + "-" + "".join(chars[4:8]) + "-" + "".join(chars[8:12])
    q("INSERT OR IGNORE INTO account_codes(uid,code,created) VALUES(?,?,?)", (uid, code, time.time()), commit=True)
    return q("SELECT code FROM account_codes WHERE uid=?", (uid,), one=True)["code"]


@app.get("/api/account-key")
@api
def account_key():
    e = get_entry()
    row = account_row(e.key)
    uid = (row["uid"] if row else None) or e.uid
    code = _account_code(uid)
    if not code:
        raise ApiError("Chua co ma cho tai khoan nay", 404)
    return jr({"code": code})


'''
    anchor = '@app.post("/api/switch")'
    if anchor not in a: raise SystemExit("[loi] khong thay /api/switch trong app.py")
    a = a.replace(anchor, helper + anchor, 1)
    old = "    with ENTRIES_LOCK:\n        ENTRIES[key] = Entry(key, client)\n\n    keys = [k for k in browser_keys() if account_row(k)]"
    if old not in a: raise SystemExit("[loi] khong thay doan dang nhap trong app.py")
    a = a.replace(old, "    with ENTRIES_LOCK:\n        ENTRIES[key] = Entry(key, client)\n    try:\n        _account_code(prof[\"uid\"])\n    except Exception:  # noqa: BLE001\n        pass\n\n    keys = [k for k in browser_keys() if account_row(k)]", 1)
    open(p, "w", encoding="utf-8").write(a)

c = os.path.join(R, "static/polish.css")
s = open(c, encoding="utf-8").read()
if "/*akcard*/" not in s:
    s += """
/*akcard*/
.ak-card{display:flex;flex-direction:column;align-items:center;gap:6px;margin:12px auto 4px;padding:12px 18px;border-radius:18px;max-width:340px}
.ak-card.hidden{display:none}
.ak-card small{opacity:.7}
.ak-code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.15rem;letter-spacing:.08em;background:linear-gradient(135deg,#fbe3a0,#e2b04a 55%,#b9822a);-webkit-background-clip:text;background-clip:text;color:transparent}
"""
    open(c, "w", encoding="utf-8").write(s)

hp = os.path.join(R, "templates/index.html")
h = open(hp, encoding="utf-8").read()
tag = '  <script src="/static/js/accountkey.js"></script>'
if tag not in h:
    fp = '  <script src="/static/js/fastpost.js"></script>'
    if fp not in h: raise SystemExit("[loi] khong thay fastpost.js trong index.html (hay chay patch51 truoc)")
    h = h.replace(fp, fp + "\n" + tag, 1)
    open(hp, "w", encoding="utf-8").write(h)
print("[ok] patch58 xong: dang nhap xong moi co ma TRIS-XXXX-XXXX-XXXX rieng cho tung tai khoan, hien trong Ho so")
