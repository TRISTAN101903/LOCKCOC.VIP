import os
R="LockCOC" if os.path.isdir("LockCOC") else "."
def rd(p): return open(os.path.join(R,p),encoding="utf-8").read()
def w(p,s): open(os.path.join(R,p),"w",encoding="utf-8").write(s)
p="app.py"; s=rd(p)
a='sender = first(m, ["sender_id", "sender", "from", "uid"])'
b='"mine": bool(my_uid and sender == my_uid),'
if a in s and b in s:
    s=s.replace(a,'sender = first(m, ["sender_uid", "sender_id", "sender", "from", "uid"])',1)
    s=s.replace(b,'"mine": bool(m.get("is_me")) or bool(my_uid and sender == my_uid),',1)
    w(p,s); print("app.py ok")
else: print("[loi] app.py khong khop (da sua roi?)")
p="static/js/chatplus.js"; s=rd(p)
a='mine: !!(m.mine || (me && m.sender === me))'
if a in s:
    w(p,s.replace(a,'mine: !!(m.mine || (me && m.sender === me) || (m.sender && String(m.sender) !== String(uid)))',1)); print("chatplus.js ok")
else: print("[loi] chatplus.js khong khop")
