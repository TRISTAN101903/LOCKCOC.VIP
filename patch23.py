import os, re, base64, zlib
R="LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R,p)
def rd(p): return open(P(p),encoding="utf-8").read()
def w(p,s,m="w"): open(P(p),m,encoding="utf-8").write(s)
F={'sw.js': 'eNp9UsFqGzEQvecrJnsI2mDL9JrgQgmmlxRKachZ1Y5Xqne1W2nWjkl87jeUHHrIoZT+QXztj/hPOpJ34xaaGIzYmTdv3ryZySmElfwcYAz1bvsdVNuCM8qZM5jbCoF+/3QGjN1tvzpwpVoD7ba/4NNu+41xu+39iAOPD5Yjjw8uctxbxu0ef9QgAqkKxyvDRGOPS1XZQhHmcDo50o0LBBcwhazSYwaS1ePlq+z8KGA1l6ooZkt0dGkDoUMvMusiW5WNQOQwfQ0JFha2vVaWrCtFnj9bqzTZJXeOxZiqUa647MqRrcQRgFbaYJALXAeRSzLohFiEhHzvm9oGlNybQ5JNIaYUi5RcwPF0Che5rFU7xHquAisk5Bj/esaDbl1ZFhj4VbYWEfKs9jmSNgfht1Ft8s6zdyg9fukw0Ag6/nS4gqsPl8LLzldMCWDnwF81kmmKpDV7O/uYwd0ddLLxtrQuRatG8wIaN8Q4f9zJVpFxqkbJznsK15aMyCb7XU2yfM/yIqhoVq5qVBF6uJcGVYE+SKOCyLxyJWZ5Dh6p8y4KjhOFtnFFIuq9bFq276K3UYW10yD0kx2DIcYSe6DiYkHzRtg34ZMLA8JhRCRHOdNvhfv9RdVbhgFOTlgW9+atDqmBJ/C8TBQbMoqfp7FKJJEhqZLnfSE1Zc8j+X9y54desu1I+FFC6qpxmG58SEedvYLjKCj/97TS/G/4aIc59X5MzTfc+BkbK8RNitzItgn0DkNQJYpboDPIurbIYJMf+m36d7+pKGmf2eRSJ6f3182C+pIeGBXy4tn5GN5Ewg3//wBX5W6S', 'plus.js': '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', 'perf.js': 'eNp9VD1vE0EQ7f0rJltEd5GzTmiQbFkUUQokhJBSUKK9vfXdkr3dy96cHSukoqCgQJSICqWiQIAoItkFEiD+x/0TZs9fcQL4JN9pd2bnvTdvltWVggq9lsgGnd4elMqP+PMK9kHmzew7/HrbzN9B8ftLM79CiIpmdi3bxdc2j7uQNLNP2MNm9hkh1838VQ3N/KPNwFKgzbpAW1caRFmCzYXNQ8JX2q6UH2upYOL8qfKw1+tEo9pK1M5CFMNFB2AsPHjnEIaQOlkXyiJffRwbFV4DClunZQpDJqCf0r9XWHsLxklhTtB5kSlOEQ9RFREz8tnonMUwHA6BHbIBXIIUKHOIVLzJHQlTqbB3ebMMUTHTtlAAx6URVfVIV8jRZZlRdLhGxbqw0+KJB232MingnWibugk38gkpTdwuoKR6OO0HAl0SBvubYtF4w2iLSrVNpQtjeBCoQB/YAYtvM6LGJs38DZzVgrSmzRWgwG7QIVh6BBFbduVp2xQG2oIVY50JKgq7uxAFCAEXL71DJ51ZKJgjllWfwYsXsI7IXYVWFGoR0WIPS/8LOrx3nx/Qc8jihQPWYok0PR5Tv4POyipPtJ1IifVtz4TfGjLfosO9ykI6JfeqCVmcxbyVaNt4d6Rqmwbr979OvwuxUFVFrdpCqTYwg+A7iqcCRdBk8cURdoIUdZm2Sq2Nf1YrPz1RRkkqHTFOAfulNiZItbDrYHluGJvk5sxIrwSq5cRELKkRnQ0WSThOS9IeVmthqfXz47YnLYxFlTZYneORs8QujCQ7+vktDPOVBUl3QBjvcBVA0czfa/hx3V4fH4r2qni5vAUMrWi2Apr8RTNptDy93deNX7wKfW9tG6+OWfNMXDrl5Gtl06NcmzRKtlp32bmMwwT+AX84tU8=', 'plus.css': 'eNq9Vr1u6zYU3vsULIICdmoqkvwTW0GnO3Qp0LsU6HokUhIbihRIynFSdO58x86dOrXzzdCl6Hv4TXoo2Y6kOPAdLhonMkWe3+985zA31+Qb/0O+09n9u+/fkfeyseRrkpX7j3+Tfz7sn38j1b9/7Z9/dwfB65svghqFaOoU+ZkwYWsJjwkRSgrFaS757o6AFIWiwvHKJiTjynFzRwqoE7Ks8bgGxoQqEnJb70g091upNowbaoCJBnU2m43fzbVy9IGLonQoHIaHHSueeHJQzLTUJiFbMBNKtaKFlmxGriKI4nA5RcOQ3RdGN4odhToJHy0YWniPGOAkmi8ZL1AzT/kcQlzwOA0XMJ0eg0sI+v+ll73dFojAg2CuxGhWPpryEGv3hsJbUVMHRR8ppRUnX4qq1saBcl7sqoaC0wwqbiBR2k2CVGtXYj5TctUtK824xaguS+ra2Qv+AgZCPqIZwzojwLa03ZvOSKAdo1kp6ktGOiA0e0TBU0nDNncSLzwAJ/XCCHZgwOKATKstOTDUrsAUQnnlcHjeZjTI5mAJnxTphXsO4dCyqRTSxvCag5vMZyTKzfTgMApfWTxj8BTaT411In88stc6MJiu4ztHW1onRPLc9UgcLTyL4zMsjsMeQ4UquRGuo3Dv9TVBbWNyyLhncRato7jHwAhdWS0FO3JZgvU5+VOUj9N4FW1Q3hlQVjihMdx2nWtTkSBa26OP2mDwM8LB8ukInQQyJ7YcQTqpIg4ZSD4JNquxNAnqlKqXRpgv+o3QvY1w6cAaVQDXGR/PjMEAWPsB8H/0+zA/W4GUmN/Ac9U47v3CZpOvs+lwMEU+vXYcnuZBMO+RXlj3BgPjPlWNfnhxe+JLy0TGM22gq69vzReltosHLTXq2qZmtBZtRrU+ciQXO44xeGbjjA6/8iVzTmPdsezZZINx4a3A1XZiIecUDAcqlOWOdnIzglSfHonXMaZd+v78cULRJB4+oQ7jOxzvYb9/Qt8/q7dvgc9R0ku0+YSbpncLpHpHbQlMP3iA14d5R0yRwgT9dr/BsqXSzfW52xTh2X/805FS7J9/bcj++Q9V4NbzB0W+ff+Dv2VLV8lAYj8QvET4Q+6hwx5/2b6yZeOwS5Ik5Yg4758FUKUekySB3A3VghTrwoJUFERUxeDEX1YZsk4Ndq3Dat+3t5it4exZLkbu7T2X3Gk/FkCJqsfUER3fTgdVcyH9xonhZyFBuWE5/Cc6ViNeLmfk5RHgNJ11EuuTSLzC++IWH7cLlIjj6chXO2QHyCvYDtLNoG57aoQmQ8wGW09aVzQFVgzRypDbjr3Cvcky7qd7Y6wbWs5xhmyHNgzPzlh2QnaReJSwjZjRNe3DOigHNkB6L7CnL0oOCodoHMwfu/SAK8K6xj/8DjaLMap6yw2Ov7cCuxDN3Wt/UYS+sO823t0tujsxj7LmOCyxvHYUiHUNE/ozxuFzRq75eILN+tMD8f/a9RumLx2tbDfjOxkPnsVWlZKmvISt8MMtw4kFQnm5/wD7Ofqw', 'collage.js': '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'}
def D(k): return zlib.decompress(base64.b64decode(F[k])).decode("utf-8")
def sub(s,old,new,what):
    if old not in s: raise SystemExit("[loi] khong thay doan can sua: "+what+" (da chay patch13/21/22 chua?)")
    return s.replace(old,new,1)
if os.path.exists(P("static/js/plus.js")): raise SystemExit("[loi] da ap dung patch23 roi")
for need in ("static/js/advanced.js","static/memories.css"):
    if not os.path.exists(P(need)): raise SystemExit("[loi] thieu "+need+": chay patch21 va patch22 truoc")

# --- app.py: /sw.js
a=rd("app.py")
a=sub(a,'@app.get("/library")','''@app.get("/sw.js")
def service_worker():
    resp = send_from_directory(app.static_folder, "sw.js", mimetype="application/javascript")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["Service-Worker-Allowed"] = "/"
    return resp


@app.get("/library")''',"route library")
w("app.py",a)
# --- file moi
w("static/sw.js",D("sw.js")); w("static/js/plus.js",D("plus.js")); w("static/js/perf.js",D("perf.js"))
# --- css
c=rd("static/polish.css")
c=c.replace("#booth-modes, #booth-opts, .daily-card:not(.adv-daily), .otd-chip { display: none !important; }","")
w("static/polish.css",c+"\n"+D("plus.css"))
# --- index.html
t=rd("templates/index.html")
t=sub(t,'<span class="vip-tag" title="Tài khoản VIP"><svg class="i s"><use href="#i-crown"/></svg>VIP</span>','<button class="plus-btn" id="btn-plus" type="button" aria-label="LockCOC Plus"><svg class="i s"><use href="#i-star"/></svg>Plus</button>',"vip-tag")
t=sub(t,'        <!-- Bảng tin -->','        <!-- LockCOC Plus -->\n        <section class="page hidden" id="page-plus" data-page="plus"></section>\n\n        <!-- Bảng tin -->',"bang tin")
t=sub(t,'  <script src="/static/js/polish.js"></script>','  <script src="/static/js/polish.js"></script>\n  <script src="/static/js/perf.js"></script>',"polish.js")
t=sub(t,'  <script src="/static/js/boot.js"></script>','  <script src="/static/js/boot.js"></script>\n  <script src="/static/js/plus.js"></script>',"boot.js")
w("templates/index.html",t)
# --- booth.js: Thoat, start/stop
b=rd("static/js/booth.js")
b=sub(b,'["single", "Ảnh"]','["single", "Thoát"]',"nhan Anh")
b=sub(b,'run: function (mode, pre) { B.mode = mode; B._tmp = true; renderModes(); renderOpts(); return booth(pre); }','run: function (mode, pre) { B.mode = mode; B._tmp = true; renderModes(); renderOpts(); return booth(pre); },\n    start: function (mode) { B.mode = mode; B._tmp = false; B.open = false; renderModes(); renderOpts(); },\n    stop: function () { if (B.busy) return; B.mode = "single"; B.open = false; renderModes(); renderOpts(); }',"lcBooth")
w("static/js/booth.js",b)
# --- social.js: Tôi chỉ còn 1 dòng Plus
s=rd("static/js/social.js")
lines=s.split("\n"); out=[]; added=False
for ln in lines:
    if ('href: "/library"' in ln or 'href: "/memories"' in ln) and 'class: "row-item"' in ln:
        if not added:
            out.append('    el("button", { class: "row-item", onclick: () => goPage("plus") }, icon("star"), el("div", { class: "meta" }, el("strong", {}, "LockCOC Plus"), el("small", {}, "Photobooth, kỷ niệm, phim, sao lưu, thử thách")), icon("chev", "i go")),'); added=True
        continue
    out.append(ln)
if not added: raise SystemExit("[loi] khong thay dong Thu vien trong social.js")
w("static/js/social.js","\n".join(out))
# --- nativemusic.js: observer gọn
try:
    n=rd("static/js/nativemusic.js")
    n=n.replace('.observe(document.body, { childList: true, subtree: true })','.observe(document.getElementById("overlay-root") || document.body, { childList: true, subtree: true })')
    w("static/js/nativemusic.js",n)
except FileNotFoundError: pass
# --- memories: tab Luoi anh
m=rd("static/js/memories.js")
m=sub(m,'backup: document.getElementById("tab-backup") };','backup: document.getElementById("tab-backup"), collage: document.getElementById("tab-collage") };',"panes")
m=sub(m,'var builders = { day: buildDay, wrap: buildWrap, film: buildFilm, backup: buildBackup };','var builders = { day: buildDay, wrap: buildWrap, film: buildFilm, collage: buildCollage, backup: buildBackup };',"builders")
m=sub(m,'  // ---------- Sao lưu ----------',D("collage.js")+'  // ---------- Sao lưu ----------',"sao luu")
w("static/js/memories.js",m)
h=rd("templates/memories.html")
h=sub(h,'    <button class="chip" role="tab" data-tab="backup" type="button">Sao lưu</button>','    <button class="chip" role="tab" data-tab="collage" type="button">Lưới ảnh</button>\n    <button class="chip" role="tab" data-tab="backup" type="button">Sao lưu</button>',"tab html")
h=sub(h,'    <section id="tab-backup" class="mem-pane hidden"></section>','    <section id="tab-collage" class="mem-pane hidden"></section>\n    <section id="tab-backup" class="mem-pane hidden"></section>',"pane html")
w("templates/memories.html",h)
mc=rd("static/memories.css")
if "a.btn { color" not in mc: w("static/memories.css",mc+"\n.mem-main a.btn { color: inherit; }\n.mem-main a.btn.primary { color: var(--on-gold, #1a1205); }\n")
print("xong patch23")
