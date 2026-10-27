import os
R="LockCOC" if os.path.isdir("LockCOC") else "."
p=os.path.join(R,"app.py"); s=open(p,encoding="utf-8").read()
if "_friend_moments" in s: raise SystemExit("[loi] da ap dung patch18 roi")

# 1) ham lay toan bo lich su 1 nguoi ban
H='''def _friend_moments(e, uid, others, max_pages=80):
    """Lich su day du cua 1 nguoi ban: loc bang excluded_users roi lat trang theo sync_token."""
    seen, cur, pages = set(), None, 0
    while pages < max_pages:
        payload = {"should_count_missed_moments": True, "include_group_moments": True, "excluded_users": others}
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
            if m.get("user") == uid:
                yield m
        if new == 0 or (isinstance(res, dict) and res.get("status") == 304):
            break


'''
k="def _sync_worker(e) -> None:"
if k not in s: raise SystemExit("[loi] khong thay _sync_worker")
s=s.replace(k,H+k,1)

# 2) them buoc quet tung nguoi ban vao dong bo
F='''        uids = list(names)
        for i, fu in enumerate(uids, 1):
            if job["found"] >= SYNC_MAX_ITEMS:
                break
            job["phase"] = "Lịch sử bạn %d/%d: %s" % (i, len(uids), names.get(fu) or fu[:6])
            others = [x for x in uids if x != fu]
            rows = []
            try:
                for m in _friend_moments(e, fu, others):
                    mid = m.get("canonical_uid")
                    thumb = s(m.get("thumbnail_url") or m.get("image_url") or "")
                    video = s(m.get("video_url") or "")
                    if mid and (thumb or video):
                        rows.append((e.key, mid, fu, names.get(fu, ""), thumb, video, caption_of(m), to_ts(m.get("date")) or 0, 0))
            except Exception as ex:  # noqa: BLE001
                if L and isinstance(ex, L.exc.AuthenticationError):
                    raise
                app.logger.warning("Lich su ban %s loi: %s", fu[:6], ex)
            _sync_put(rows)
            with _db_lock:
                job["found"] = _db.execute("SELECT COUNT(*) FROM sync_items WHERE key=?", (e.key,)).fetchone()[0]

'''
k='        job["phase"] = "Đang tải ảnh của bạn"\n'
if k not in s: raise SystemExit("[loi] khong thay moc dong bo")
s=s.replace(k,F+k,1)

# 3) music-probe quet sau tung nguoi ban
a=s.find('@app.get("/api/music-probe")'); b=s.find("with _db_lock:\n    _db.executescript(", a)
if a<0 or b<0: raise SystemExit("[loi] khong thay music-probe")
P='''@app.get("/api/music-probe")
@api
def music_probe():
    """Chan doan: quet lich su tung nguoi ban, tim bai co nhac, in JSON goc da che token. ?q=tu,khoa"""
    e = get_entry()
    qs = [w.strip().lower() for w in (request.args.get("q") or "music,spotify,apple,song,track,audio").split(",") if w.strip()]
    fp = min(60, max(1, int(request.args.get("fp") or 12)))
    kinds, hits, seen, oldest, nfr = {}, [], set(), None, 0
    deadline = time.time() + 150
    with e.lock:
        fr = e.client.friends.get_all_friends()
    uids = [norm_friend(f).get("uid") for f in (fr if isinstance(fr, list) else [])]
    uids = [u for u in uids if u]
    nfr = len(uids)
    for fu in uids:
        if time.time() > deadline:
            break
        others = [x for x in uids if x != fu]
        try:
            for m in _friend_moments(e, fu, others, fp):
                mid = m.get("canonical_uid")
                if mid in seen:
                    continue
                seen.add(mid)
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
        except Exception:  # noqa: BLE001
            continue
    out = json.dumps({"friends": nfr, "scanned": len(seen), "oldest": oldest, "keywords": qs, "overlay_kinds": kinds, "found": len(hits), "samples": hits}, ensure_ascii=False, indent=1, default=str)
    out = re.sub(r"token=[^&\\"\\s]+", "token=X", out)
    return Response(out, mimetype="application/json")


'''
s=s[:a]+P+s[b:]
open(p,"w",encoding="utf-8").write(s)
print("xong patch18")
