import os
R="LockCOC" if os.path.isdir("LockCOC") else "."
p=os.path.join(R,"app.py"); s=open(p,encoding="utf-8").read()
a=s.find('@app.get("/api/music-probe")'); b=s.find("with _db_lock:\n    _db.executescript(", a)
if a<0 or b<0: raise SystemExit("[loi] khong thay music-probe")
new='''@app.get("/api/music-probe")
@api
def music_probe():
    """Chan doan: tim bai dang co nhac that (toan bo JSON goc, da che token). ?q=tu,khoa de tim theo ten bai."""
    e = get_entry()
    qs = [w.strip().lower() for w in (request.args.get("q") or "music,spotify,apple,song,track,audio").split(",") if w.strip()]
    deep = min(60, max(10, int(request.args.get("n") or 30)))
    with e.lock:
        data = e.client.moments.get_latest()
    rows = to_list(data)
    try:
        with e.lock:
            fr = e.client.friends.get_all_friends()
        for f in (fr[:80] if isinstance(fr, list) else []):
            uid = norm_friend(f).get("uid")
            if not uid:
                continue
            try:
                with e.lock:
                    got = e.client.moments.get_shared_moments_by_user(user_uid=uid, limit=deep)
                rows += to_list(got)
            except Exception:  # noqa: BLE001
                continue
    except Exception:  # noqa: BLE001
        pass
    kinds, hits = {}, []
    for m in rows:
        if not isinstance(m, dict):
            continue
        for ov in (m.get("overlays") if isinstance(m.get("overlays"), list) else []):
            if isinstance(ov, dict):
                k = f"{ov.get('overlay_type')}|{ov.get('overlay_id')}"
                kinds[k] = kinds.get(k, 0) + 1
        txt = json.dumps(m, ensure_ascii=False, default=str).lower()
        if any(w in txt for w in qs) and len(hits) < 3:
            hits.append(m)
    out = json.dumps({"scanned": len(rows), "keywords": qs, "overlay_kinds": kinds, "found": len(hits), "samples": hits}, ensure_ascii=False, indent=1, default=str)
    out = re.sub(r"token=[^&\\"\\s]+", "token=X", out)
    return Response(out, mimetype="application/json")


'''
open(p,"w",encoding="utf-8").write(s[:a]+new+s[b:])
print("xong patch16")
