import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
if not os.path.exists(os.path.join(R, "static/js/aistudio.js")):
    raise SystemExit("[loi] chua co aistudio.js, hay chay patch55.py truoc")
JS = """
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
"""
open(os.path.join(R, "static/js/aistudio.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))

# ---- server: duong dan AI co key (tuy chon). Khong co key thi app tu dung dich vu mien phi ----
p = os.path.join(R, "app.py")
a = open(p, encoding="utf-8").read()
if "/api/ai-image" not in a:
    anchor = '@app.get("/sw.js")'
    if anchor not in a: raise SystemExit("[loi] khong thay /sw.js trong app.py")
    route = '''_AI_HITS: dict = {}


@app.get("/api/ai-image/status")
@api
def ai_image_status():
    return jr({"key": bool(os.environ.get("AI_IMAGE_KEY"))})


@app.post("/api/ai-image")
@api
def ai_image():
    """Tao anh bang API co ttra phi (OpenAI Images). Dat AI_IMAGE_KEY tren Render; AI_IMAGE_MODEL tuy chon (mac dinh gpt-image-1)."""
    import base64
    key = os.environ.get("AI_IMAGE_KEY", "").strip()
    if not key:
        raise ApiError("Chua cau hinh AI_IMAGE_KEY", 400)
    prompt = need(body(), "prompt", 900)
    ip = request.remote_addr or "?"
    now = time.time()
    hits = [t for t in _AI_HITS.get(ip, []) if now - t < 3600]
    if len(hits) >= 10:
        raise ApiError("Ban tao anh AI hoi nhieu, thu lai sau it phut.", 429)
    hits.append(now)
    _AI_HITS[ip] = hits
    payload = json.dumps({"model": os.environ.get("AI_IMAGE_MODEL", "gpt-image-1"), "prompt": prompt, "size": "1024x1024", "n": 1}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=payload,
                                 headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=100) as r:
            data = json.loads(r.read().decode("utf-8", "ignore"))
    except Exception:  # noqa: BLE001
        raise ApiError("Dich vu AI loi hoac het han muc, thu lai sau.", 502)
    item = (data.get("data") or [{}])[0]
    b64 = item.get("b64_json")
    if not b64 and item.get("url"):
        try:
            b64 = base64.b64encode(urllib.request.urlopen(item["url"], timeout=30).read(8_000_000)).decode()
        except Exception:  # noqa: BLE001
            raise ApiError("Khong lay duoc anh tu dich vu AI.", 502)
    if not b64:
        raise ApiError("Dich vu AI khong tra ve anh.", 502)
    return jr({"image_b64": b64, "mime": "image/png"})


'''
    a = a.replace(anchor, route + anchor, 1)
    open(p, "w", encoding="utf-8").write(a)
print("[ok] patch56 xong: AI co phong cach LockCOC Gold / Dien anh / Hoat hinh; san sang gan API key (AI_IMAGE_KEY)")
