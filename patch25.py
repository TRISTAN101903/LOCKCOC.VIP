import os, re
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
def rd(p): return open(P(p), encoding="utf-8").read()
def w(p, s): open(P(p), "w", encoding="utf-8").write(s)
def sub(s, old, new, what):
    if old not in s: raise SystemExit("[loi] khong thay doan can sua: " + what)
    return s.replace(old, new, 1)

a = rd("app.py")
if "_last_music" in a: raise SystemExit("[loi] da ap dung patch25 roi")
a = sub(a, "def perform_post(e: Entry, meta: dict, image: str, video: str | None) -> str:",
        "_last_music: dict = {}\n\n\ndef perform_post(e: Entry, meta: dict, image: str, video: str | None) -> str:", "perform_post")
a = sub(a, "                last = None\n                break\n",
        "                last = None\n                _last_music[e.key] = {\"t\": time.time(), \"minimal\": minimal, \"sent\": ov,\n"
        "                                      \"has_video\": bool(video), \"result\": str(result)[:300]}\n                break\n", "success")
probe = '''

@app.get("/api/overlay-probe")
@api
def overlay_probe():
    """Xem Locket luu thanh nhac cua bai gan nhat nhu the nao (so voi cai da gui)."""
    e = get_entry()
    out = {"last_sent": _last_music.get(e.key), "mine": [], "my_moments": []}
    try:
        with e.lock:
            res = e.client.post_api("getLatestMomentV2", {"should_count_missed_moments": True, "include_group_moments": True})
        for m in (res.get("data", []) if isinstance(res, dict) else []):
            if isinstance(m, dict) and m.get("user") == e.uid:
                out["mine"].append({"caption": m.get("caption"), "has_video": bool(m.get("video_url")),
                                    "overlays": m.get("overlays"), "keys": sorted(m.keys())})
                if len(out["mine"]) >= 3:
                    break
    except Exception as ex:  # noqa: BLE001
        out["err_latest"] = str(ex)[:200]
    try:
        with e.lock:
            own = e.client.moments.get_all_my_moments()
        for m in to_list(own)[:3]:
            if isinstance(m, dict):
                out["my_moments"].append({"caption": m.get("caption"), "overlays": m.get("overlays"), "keys": sorted(m.keys())})
    except Exception as ex:  # noqa: BLE001
        out["err_mine"] = str(ex)[:200]
    return jr(out)

'''
a = sub(a, '@app.get("/library")', probe.lstrip("\n") + '\n@app.get("/library")', "route library")
w("app.py", a)

j = rd("static/js/nativemusic.js")
j = sub(j, '["music", "music_start", "music_url", "music_card"].forEach', '["music_card"].forEach', "strip")
w("static/js/nativemusic.js", j)
print("[ok] patch25 xong")
