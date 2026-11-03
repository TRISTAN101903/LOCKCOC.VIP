import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
JS = """
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
oUz/cTb21b/+h3ho3O5RqTfTBt3nmhjmN8f+ui7LC2fixmPp4GYSp5N88WehcfQpOiyyqTCy9W/Pn85wo+hSIdOJmlpUV8tVozHV
0m7aC8ubgRoC0LrerGgJd3yMC0U2yTHcZSlyn4E6thA1KlLIs4O+1F5+YlHCpuW5uG9lNTl+W1sA4QqiyVqaL/3myDyaJFz3m/zn
ith8W4vwb8JIUmV8juMg+2pztoJvPq/AxLcW18FehpqO7C+CXKp3iMwDZEbpPlEAEhW/6IP96JV4frjpuhrhzvE5htX20norzSqp
LKOxdNRZv3MJD+63NfUj0rffR3QWaNQHF+c/g01PqB4zte99s+Ui7s7/xLXmJyjizj6v0DlnL/WXlL7W4tbGZzPUb0vbfa65KzPH
dShlofsrNliG6ouPKnZe0hn8ICOVai1qXbLkRxmViIuLejRpXNszPUOURksNK5rFckcZLNqe6PfAbrgXUmovw7VZXeUfKxziyhVB
v84oSgNORaxJFMisubAnCrO3m01Ks8mC6xDF7FDGSJCz4jYadJaTTbapASgcdS1yG/tm06TMDasH+Fe7Jf54rcI8plHelZ6TuwUQ
P0CTbBk5MENlGNlmznyX77ON47gNQZRajuoyY9+82GhKkUtStVJy5qXKV/CxaB0a9eUSFhBZZBW8CZ++4mzizX1O2roQkxjSkNDb
vFTddC+EiPUNT0jZ88Ibiv//H6Omw8vQ9C01b8vyjtJSFtUdeUx9bNejM3NSBOrDyINtDevO9lI5j2tTHt2J+njs4grTctubRQBH
f9qirvjfAIN0eJg=
"""
open(os.path.join(R, "static/js/aistudio.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))

c = os.path.join(R, "static/polish.css")
s = open(c, encoding="utf-8").read()
if "/*aistudio*/" not in s:
    s += """
/*aistudio*/
.ai-btn{margin-top:8px}
.sheet-pick .ai-sec{display:flex;flex-direction:column;gap:8px;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}
.sheet-pick .ai-sec .hrow{flex-wrap:wrap}
.ai-chip.on{background:linear-gradient(135deg,#fbe3a0,#e2b04a);color:#1a1306;border-color:transparent}
.ai-in{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:inherit;font:inherit}
.ai-st,.ai-note{opacity:.7}
.sheet-pick{max-height:86vh;overflow-y:auto}
"""
    open(c, "w", encoding="utf-8").write(s)

hp = os.path.join(R, "templates/index.html")
h = open(hp, encoding="utf-8").read()
tag = '  <script src="/static/js/aistudio.js"></script>'
if tag not in h:
    anchor = '  <script src="/static/js/savebtn.js"></script>'
    if anchor not in h: anchor = '  <script src="/static/js/fastpost.js"></script>'
    if anchor not in h: raise SystemExit("[loi] khong thay vi tri chen script trong index.html (hay chay patch54 truoc)")
    h = h.replace(anchor, anchor + "\n" + tag, 1)
    open(hp, "w", encoding="utf-8").write(h)
print("[ok] patch55 xong: LockCOC AI (lam net, ghep anh, tao anh AI) nam ngay duoi nut Advanced features trong man Soan khoanh khac")
