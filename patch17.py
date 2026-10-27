import os
R="LockCOC" if os.path.isdir("LockCOC") else "."
p=os.path.join(R,"app.py"); s=open(p,encoding="utf-8").read()
a=s.find('@app.get("/api/music-probe")'); b=s.find("with _db_lock:\n    _db.executescript(", a)
if a<0 or b<0: raise SystemExit("[loi] khong thay music-probe")
new='''@app.get("/api/music-probe")
@api
def music_probe():
    """Chan doan: quet toan bo feed (nhu dong bo), tim bai co nhac, in JSON goc da che token. ?q=tu,khoa&p=so_trang"""
    e = get_entry()
    qs = [w.strip().lower() for w in (request.args.get("q") or "music,spotify,apple,song,track,audio").split(",") if w.strip()]
    maxp = min(80, max(1, int(request.args.get("p") or 40)))
    kinds, hits, seen, pages, cur, oldest = {}, [], set(), 0, None, None
    while pages < maxp:
        payload = {"should_count_missed_moments": True, "include_group_moments": True}
        if cur:
            payload["sync_token"] = cur
        with e.lock:
            res = e.client.post_api("getLatestMomentV2", payload)
        data = res.get("data", []) if isinstance(res, dict) else []
        if not data:
            break
        pages += 1
        new = 0
        for m in data:
            if not isinstance(m, dict):
                continue
            mid = m.get("canonical_uid")
            if not mid or mid in seen:
                continue
            seen.add(mid)
            new += 1
            cur = mid
            d = to_ts(m.get("date"))
            if d and (oldest is None or d < oldest):
                oldest = d
            for ov in (m.get("overlays") if isinstance(m.get("overlays"), list) else []):
                if isinstance(ov, dict):
                    k = f"{ov.get('overlay_type')}|{ov.get('overlay_id')}"
                    kinds[k] = kinds.get(k, 0) + 1
            txt = json.dumps(m, ensure_ascii=False, default=str).lower()
            if any(w in txt for w in qs) and len(hits) < 3:
                hits.append(m)
        if new == 0 or (isinstance(res, dict) and res.get("status") == 304):
            break
    out = json.dumps({"pages": pages, "scanned": len(seen), "oldest": oldest, "keywords": qs, "overlay_kinds": kinds, "found": len(hits), "samples": hits}, ensure_ascii=False, indent=1, default=str)
    out = re.sub(r"token=[^&\\"\\s]+", "token=X", out)
    return Response(out, mimetype="application/json")


'''
open(p,"w",encoding="utf-8").write(s[:a]+new+s[b:])
print("xong patch17")
