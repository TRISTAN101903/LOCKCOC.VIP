#!/usr/bin/env python3
"""LockCOC - web app dùng tài khoản Locket thật qua thư viện `locketlam`.
Developed & founded by TRISTAN.faketriss

Lưu trữ (SQLite, data/locketcac.db):
- accounts: tài khoản đã đăng nhập (KHÔNG lưu mật khẩu, chỉ lưu tên hiển thị + khoá tới file phiên token).
- posts: lịch sử bài đã đăng từ app này (kèm bản sao ảnh nhỏ để hiển thị ngay).

Bảo mật:
- Cookie phiên (ký) chỉ chứa danh sách khoá tài khoản của trình duyệt đó, nên danh sách
  "tài khoản đã lưu" là riêng cho từng trình duyệt.
- Mọi request ghi dữ liệu cần header X-LockCOC: 1 (chống CSRF).
"""

from __future__ import annotations

import datetime
import hmac
import json
import os
import re
import secrets
import shutil
import sqlite3
import subprocess
import tempfile
import threading
import time
import traceback
import types
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, Response, redirect, render_template, request, send_from_directory, session
from werkzeug.middleware.proxy_fix import ProxyFix

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("LOCKETCAC_DATA", BASE_DIR / "data"))
SESSIONS_DIR = DATA_DIR / "sessions"
MEDIA_DIR = DATA_DIR / "media"
for d in (SESSIONS_DIR, MEDIA_DIR):
    d.mkdir(parents=True, exist_ok=True)

KEY_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")
USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{1,40}$")
ID_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,200}$")
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm"}
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
MAX_VIDEO_SECONDS = 60
LOCK_IDLE = 24 * 3600  # tự khoá sau 24 giờ không hoạt động
SCHED_DIR = DATA_DIR / "scheduled"
SCHED_DIR.mkdir(parents=True, exist_ok=True)
try:
    os.chmod(DATA_DIR, 0o700)
except OSError:
    pass
FORCE_HTTPS = os.environ.get("LOCKETCAC_FORCE_HTTPS", "1") == "1"
ALLOWED_FETCH_HOSTS = {"itunes.apple.com", "open.spotify.com", "api.open-meteo.com"}
AUDIO_EXT = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".flac", ".mp4"}
try:
    MUSIC_SECONDS = max(5, min(int(os.environ.get("LOCKETCAC_MUSIC_SECONDS", "30")), MAX_VIDEO_SECONDS))
except ValueError:
    MUSIC_SECONDS = 30


def _load_secret() -> str:
    env = os.environ.get("LOCKETCAC_SECRET")
    if env:
        return env
    path = DATA_DIR / "secret.key"
    if not path.exists():
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "w") as f:
                f.write(secrets.token_hex(32))
        except FileExistsError:
            pass
    for _ in range(40):
        val = path.read_text().strip()
        if val:
            return val
        time.sleep(0.05)
    raise RuntimeError("secret.key rong")


def _load_passcode() -> str | None:
    """Mã khoá app. Mặc định tự sinh (in ra terminal) để không ai mở được link mà không có mã."""
    env = os.environ.get("LOCKETCAC_PASSCODE")
    if env is not None and env.lower() in ("off", "none", "0", "false"):
        return None
    if env:
        return env
    path = DATA_DIR / "passcode.txt"
    if not path.exists():
        path.write_text("lockcac")
        os.chmod(path, 0o600)
    return path.read_text().strip()


PASSCODE = _load_passcode()

app = Flask(__name__)
if os.environ.get("LOCKETCAC_BEHIND_PROXY", "1") == "1":
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)  # Codespaces/Nginx đứng trước
app.config.update(
    SECRET_KEY=_load_secret(),
    MAX_CONTENT_LENGTH=200 * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict",
    SESSION_COOKIE_SECURE=os.environ.get("LOCKETCAC_SECURE_COOKIES") == "1",
    PERMANENT_SESSION_LIFETIME=timedelta(days=14),
    SESSION_REFRESH_EACH_REQUEST=False,
    JSON_AS_ASCII=False,
)

# ----------------------------------------------------------------------------
# Cơ sở dữ liệu SQLite
# ----------------------------------------------------------------------------
_db = sqlite3.connect(DATA_DIR / "locketcac.db", check_same_thread=False)
_db.row_factory = sqlite3.Row
_db_lock = threading.Lock()
with _db_lock:
    _db.executescript(
        """
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS accounts(
            key TEXT PRIMARY KEY, uid TEXT, first_name TEXT, last_name TEXT,
            username TEXT, avatar TEXT, created REAL, last_used REAL);
        CREATE TABLE IF NOT EXISTS posts(
            id TEXT PRIMARY KEY, key TEXT, kind TEXT, caption TEXT,
            file TEXT, moment_uid TEXT, created REAL);
        CREATE INDEX IF NOT EXISTS posts_key ON posts(key, created DESC);
        CREATE TABLE IF NOT EXISTS streak_restores(
            key TEXT, day TEXT, created REAL, PRIMARY KEY(key, day));
        CREATE TABLE IF NOT EXISTS scheduled(
            id TEXT PRIMARY KEY, key TEXT, run_at REAL, meta TEXT, image TEXT,
            video TEXT, status TEXT, error TEXT, created REAL);
        """
    )
    _db.commit()


def q(sql: str, args: tuple = (), one: bool = False, commit: bool = False):
    with _db_lock:
        cur = _db.execute(sql, args)
        rows = cur.fetchone() if one else cur.fetchall()
        if commit:
            _db.commit()
        return rows


# ----------------------------------------------------------------------------
# Thư viện locketlam (nạp lười)
# ----------------------------------------------------------------------------
_lib = None


def lib():
    global _lib
    if _lib is None:
        try:
            from locketlam import LocketClient, NoteType
            from locketlam import exceptions as exc

            _lib = types.SimpleNamespace(LocketClient=LocketClient, NoteType=NoteType, exc=exc)
        except ImportError:
            return None
    return _lib


class ApiError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


class Entry:
    def __init__(self, key: str, client):
        self.key = key
        self.client = client
        self.lock = threading.RLock()

    @property
    def uid(self):
        return getattr(self.client.session, "uid", None)


ENTRIES: dict[str, Entry] = {}
ENTRIES_LOCK = threading.Lock()


def session_path(key: str) -> Path:
    return SESSIONS_DIR / f"{key}.json"


def jr(data, status: int = 200) -> Response:
    return Response(json.dumps(data, ensure_ascii=False, default=str), status=status, mimetype="application/json")


def body() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def need(data: dict, key: str, max_len: int = 2000) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ApiError(f"Thiếu trường bắt buộc: {key}")
    if len(value) > max_len:
        raise ApiError(f"Trường {key} quá dài")
    return value.strip()


def need_id(data: dict, key: str) -> str:
    value = need(data, key, 200)
    if not ID_RE.match(value):
        raise ApiError(f"{key} không hợp lệ")
    return value


# ----------------------------------------------------------------------------
# Chuẩn hoá dữ liệu trả về từ locketlam (tên trường lấy theo docs của thư viện)
# ----------------------------------------------------------------------------
def first(d, keys):
    if not isinstance(d, dict):
        return None
    for k in keys:
        v = d.get(k)
        if v not in (None, "", [], {}):
            return v
    return None


def to_list(data) -> list:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for v in data.values():
            if isinstance(v, list):
                return v
    return []


def s(v) -> str:
    return v if isinstance(v, str) else ""


def flat_profile(p) -> dict:
    """Đưa hồ sơ về dạng phẳng, dù thư viện bọc trong khoá con."""
    if isinstance(p, dict) and not first(p, ["first_name", "username", "uid"]):
        for v in p.values():
            if isinstance(v, dict) and first(v, ["first_name", "username", "uid"]):
                p = v
                break
    p = p if isinstance(p, dict) else {}
    return {
        "uid": first(p, ["uid", "user_uid", "id"]),
        "first_name": s(p.get("first_name")),
        "last_name": s(p.get("last_name")),
        "username": s(p.get("username")),
        "avatar": s(first(p, ["profile_picture_url", "avatar_url", "avatar"]) or ""),
        "birthdate": s(p.get("birthdate")),
    }


def norm_user(u) -> dict:
    if not isinstance(u, dict):
        return {"uid": u if isinstance(u, str) else None, "first_name": "", "last_name": "", "username": "", "avatar": ""}
    f = flat_profile(u)
    return f


def caption_of(m: dict) -> str:
    c = m.get("caption")
    if isinstance(c, str) and c:
        return c
    ov = m.get("overlays")
    items = ov if isinstance(ov, list) else [ov] if isinstance(ov, dict) else []
    for it in items:
        if isinstance(it, dict):
            t = first(it, ["text", "caption", "title"])
            if isinstance(t, str):
                return t
            data = it.get("data")
            if isinstance(data, dict) and isinstance(data.get("text"), str):
                return data["text"]
    return ""


def to_ts(v):
    """Chuẩn hoá thời gian về giây epoch (hoặc None)."""
    try:
        if isinstance(v, (int, float)):
            return v / 1000 if v > 1e12 else float(v)
        if isinstance(v, str) and v.strip():
            try:
                f = float(v)
                return f / 1000 if f > 1e12 else f
            except ValueError:
                from datetime import datetime

                return datetime.fromisoformat(v.strip().replace("Z", "+00:00")).timestamp()
        if isinstance(v, dict):
            sec = v.get("_seconds", v.get("seconds"))
            return float(sec) if sec is not None else None
    except (ValueError, OverflowError, OSError):
        return None
    return None


def norm_moment(m) -> dict:
    if not isinstance(m, dict):
        return {}
    user = norm_user(m.get("user")) if isinstance(m.get("user"), dict) else norm_user(None)
    if not user["uid"]:
        user["uid"] = first(m, ["user_uid", "owner_uid", "sender_uid"]) if isinstance(first(m, ["user_uid", "owner_uid", "sender_uid"]), str) else None
    if not user["first_name"]:
        user["first_name"] = s(m.get("first_name"))
    viewers = m.get("viewers")
    return {
        "id": first(m, ["moment_uid", "id", "canonical_uid", "uid"]),
        "image": s(first(m, ["thumbnail_url", "image_url", "thumbnail", "image", "photo_url"]) or ""),
        "video": s(first(m, ["video_url", "video"]) or ""),
        "caption": caption_of(m),
        "date": first(m, ["date", "created_at", "timestamp", "time"]),
        "ts": to_ts(first(m, ["date", "created_at", "timestamp", "time"])),
        "user": user,
        "views": first(m, ["views_count"]) if m.get("views_count") is not None else (len(viewers) if isinstance(viewers, list) else None),
        "reactions": m.get("reactions") if isinstance(m.get("reactions"), (list, dict)) else None,
    }


def norm_friend(f) -> dict:
    return norm_user(f)


def norm_conv(c) -> dict:
    last = c.get("last_message") if isinstance(c, dict) else None
    last_text = last if isinstance(last, str) else (first(last, ["text", "body"]) or "") if isinstance(last, dict) else ""
    return {
        "id": first(c, ["id", "conversation_id"]),
        "other": first(c, ["other_user_id", "recipient_id", "peer_uid"]),
        "unread": int(c.get("unread_count") or 0) if isinstance(c, dict) else 0,
        "last": s(last_text),
        "time": first(last, ["created_at", "timestamp", "time", "date"]) if isinstance(last, dict) else first(c, ["updated_at", "last_message_at", "time"]),
    }


def norm_msg(m, my_uid) -> dict:
    sender = first(m, ["sender_uid", "sender_id", "sender", "from", "uid"])
    if isinstance(sender, dict):
        sender = first(sender, ["uid", "id"])
    text = first(m, ["text", "body", "message"])
    return {
        "id": first(m, ["id", "message_id"]),
        "sender": sender,
        "mine": bool(m.get("is_me")) or bool(my_uid and sender == my_uid),
        "text": text if isinstance(text, str) else "📷 Khoảnh khắc",
        "time": first(m, ["created_at", "timestamp", "time", "date"]),
    }


# ----------------------------------------------------------------------------
# Quản lý tài khoản / phiên
# ----------------------------------------------------------------------------
def browser_keys() -> list[str]:
    keys = session.get("keys")
    return [k for k in keys if isinstance(k, str) and KEY_RE.match(k)] if isinstance(keys, list) else []


def account_row(key: str):
    return q("SELECT * FROM accounts WHERE key=?", (key,), one=True)


def acct_json(row) -> dict:
    return {
        "key": row["key"],
        "uid": row["uid"],
        "first_name": row["first_name"] or "",
        "last_name": row["last_name"] or "",
        "username": row["username"] or "",
        "avatar": row["avatar"] or "",
    }


def save_profile(key: str, prof: dict) -> None:
    q(
        "UPDATE accounts SET uid=COALESCE(?,uid), first_name=?, last_name=?, username=?, avatar=?, last_used=? WHERE key=?",
        (prof.get("uid"), prof["first_name"], prof["last_name"], prof["username"], prof["avatar"], time.time(), key),
        commit=True,
    )


def get_entry() -> Entry:
    if lib() is None:
        raise ApiError("Server chưa cài thư viện locketlam (pip install -r requirements.txt).", 503)
    key = request.headers.get("X-LockCOC-Acct") or session.get("active")
    if key not in browser_keys() or not account_row(key) or not session_path(key).exists():
        raise ApiError("Chưa đăng nhập", 401)
    with ENTRIES_LOCK:
        entry = ENTRIES.get(key)
        if entry is None:
            entry = Entry(key, lib().LocketClient(session_path=str(session_path(key))))
            ENTRIES[key] = entry
    return entry


def remove_account(key: str) -> None:
    with ENTRIES_LOCK:
        ENTRIES.pop(key, None)
    session_path(key).unlink(missing_ok=True)
    for r in q("SELECT file FROM posts WHERE key=?", (key,)):
        (MEDIA_DIR / r["file"]).unlink(missing_ok=True)
    q("DELETE FROM posts WHERE key=?", (key,), commit=True)
    q("DELETE FROM accounts WHERE key=?", (key,), commit=True)


def api(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except ApiError as e:
            return jr({"error": e.message}, e.status)
        except Exception as e:  # noqa: BLE001
            L = lib()
            exc = L.exc if L else None
            if exc is not None:
                if isinstance(e, exc.AuthenticationError):
                    return jr({"error": "Xác thực thất bại hoặc phiên đã hết hạn. Hãy đăng nhập lại."}, 401)
                if isinstance(e, exc.StorageUploadError):
                    return jr({"error": f"Lỗi tải lên máy chủ lưu trữ: {e}"}, 502)
                if isinstance(e, exc.LocketAPIError):
                    return jr({"error": f"Locket API trả lỗi {getattr(e, 'status_code', '?')}: {getattr(e, 'message', e)}"}, 502)
                if isinstance(e, exc.LocketError):
                    return jr({"error": f"Lỗi thư viện Locket: {e}"}, 400)
            app.logger.error("Lỗi không mong đợi:\n%s", traceback.format_exc())
            return jr({"error": "Lỗi máy chủ nội bộ."}, 500)

    return wrapper


def is_unlocked() -> bool:
    if not PASSCODE:
        return True
    last = session.get("touch")
    if not last or time.time() - last > LOCK_IDLE or not session.get("unlocked_at"):
        session.pop("unlocked_at", None)
        return False
    if time.time() - last > 60:
        session["touch"] = time.time()
    return True


OPEN_API = {"/api/status", "/api/unlock"}


@app.before_request
def guard():
    # 1) Ép HTTPS (khi đứng sau proxy báo http). Cổng localhost không bị ảnh hưởng.
    if FORCE_HTTPS and request.headers.get("X-Forwarded-Proto", "").split(",")[0].strip() == "http":
        return redirect(request.url.replace("http://", "https://", 1), 301)
    # 2) Chống CSRF
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.headers.get("X-LockCOC") != "1":
        return jr({"error": "Thiếu header chống CSRF."}, 400)
    # 3) Khoá app
    if request.path.startswith("/api/") and request.path not in OPEN_API and not is_unlocked():
        return jr({"error": "App đang khoá.", "locked": True}, 423)


@app.after_request
def security_headers(resp):
    h = resp.headers
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("X-Frame-Options", "DENY")
    h.setdefault("Referrer-Policy", "no-referrer")
    h.setdefault("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()")
    h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    h.setdefault("Cross-Origin-Resource-Policy", "same-origin")
    h.setdefault("X-Permitted-Cross-Domain-Policies", "none")
    h.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; "
        "style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; "
        "base-uri 'none'; form-action 'self'; object-src 'none'",
    )
    if request.is_secure:
        h.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    if request.path.startswith("/api/"):
        h["Cache-Control"] = "no-store"
    return resp


_attempts: dict[str, list[float]] = {}
_attempts_lock = threading.Lock()


def too_many_attempts(ip: str) -> bool:
    now = time.time()
    with _attempts_lock:
        recent = [t for t in _attempts.get(ip, []) if now - t < 300]
        _attempts[ip] = recent
        return len(recent) >= 8


def record_attempt(ip: str) -> None:
    with _attempts_lock:
        _attempts.setdefault(ip, []).append(time.time())


# ----------------------------------------------------------------------------
# Trang + xác thực
# ----------------------------------------------------------------------------
@app.get("/")
def landing():
    ua = request.headers.get("User-Agent", "")
    if "; wv)" in ua or request.args.get("app") == "1":  # APK/WebView vao thang ung dung
        return redirect("/app")
    return render_template("landing.html")


@app.get("/app")
def index():
    return render_template("index.html")


@app.get("/api/status")
@api
def status():
    if not is_unlocked():
        return jr({"lib": lib() is not None, "locked": True, "accounts": [], "active": None})
    keys = browser_keys()
    rows = [account_row(k) for k in keys]
    accounts = [acct_json(r) for r in rows if r and session_path(r["key"]).exists()]
    valid = {a["key"] for a in accounts}
    new_keys = [k for k in keys if k in valid]
    if session.get("keys") != new_keys:
        session["keys"] = new_keys
    if session.get("active") not in valid:
        new_active = accounts[0]["key"] if accounts else None
        if session.get("active") != new_active:
            session["active"] = new_active
    return jr({"lib": lib() is not None, "locked": False, "accounts": accounts, "active": session.get("active")})


@app.post("/api/unlock")
@api
def unlock():
    if not PASSCODE:
        return jr({"ok": True})
    ip = "u:" + (request.remote_addr or "?")
    if too_many_attempts(ip):
        raise ApiError("Nhập sai quá nhiều lần, thử lại sau vài phút.", 429)
    code = need(body(), "code", 128)
    record_attempt(ip)
    if not hmac.compare_digest(code.encode(), PASSCODE.encode()):
        raise ApiError("Mã khoá không đúng.", 403)
    session.permanent = True
    session["unlocked_at"] = time.time()
    session["touch"] = time.time()
    return jr({"ok": True})


@app.post("/api/lock")
@api
def lock_app():
    session.pop("unlocked_at", None)
    session.pop("touch", None)
    return jr({"ok": True})


@app.post("/api/login")
@api
def login():
    L = lib()
    if L is None:
        raise ApiError("Server chưa cài thư viện locketlam (pip install -r requirements.txt).", 503)
    ip = request.remote_addr or "?"
    if too_many_attempts(ip):
        raise ApiError("Đăng nhập sai quá nhiều lần, thử lại sau vài phút.", 429)

    data = body()
    email = need(data, "email", 254)
    password = need(data, "password", 256)
    record_attempt(ip)

    key = secrets.token_urlsafe(18)
    client = L.LocketClient(session_path=str(session_path(key)))
    try:
        client.login(email, password)
    except Exception:
        session_path(key).unlink(missing_ok=True)
        raise
    finally:
        del password

    try:
        os.chmod(session_path(key), 0o600)
    except OSError:
        pass

    uid = getattr(client.session, "uid", None)
    try:
        prof = flat_profile(client.user.get_profile())
    except Exception:  # noqa: BLE001
        prof = flat_profile({})
    prof["uid"] = prof["uid"] or uid

    # Cùng một tài khoản đăng nhập lại: thay phiên cũ bằng phiên mới (giữ lịch sử bài đăng)
    if prof["uid"]:
        for old in q("SELECT key FROM accounts WHERE uid=?", (prof["uid"],)):
            ok = old["key"]
            with ENTRIES_LOCK:
                ENTRIES.pop(ok, None)
            session_path(ok).unlink(missing_ok=True)
            q("UPDATE posts SET key=? WHERE key=?", (key, ok), commit=True)
            q("DELETE FROM accounts WHERE key=?", (ok,), commit=True)

    now = time.time()
    q(
        "INSERT INTO accounts(key,uid,first_name,last_name,username,avatar,created,last_used) VALUES(?,?,?,?,?,?,?,?)",
        (key, prof["uid"], prof["first_name"], prof["last_name"], prof["username"], prof["avatar"], now, now),
        commit=True,
    )
    with ENTRIES_LOCK:
        ENTRIES[key] = Entry(key, client)

    keys = [k for k in browser_keys() if account_row(k)]
    session.permanent = True
    session["keys"] = keys + [key]
    session["active"] = key
    return jr({"ok": True, "account": acct_json(account_row(key))})


@app.post("/api/switch")
@api
def switch():
    key = need(body(), "key", 64)
    if key not in browser_keys() or not account_row(key):
        raise ApiError("Tài khoản không có trong trình duyệt này", 404)
    session["active"] = key
    q("UPDATE accounts SET last_used=? WHERE key=?", (time.time(), key), commit=True)
    return jr({"ok": True})


@app.post("/api/logout")
@api
def logout():
    key = body().get("key") or session.get("active")
    if isinstance(key, str) and key in browser_keys():
        remove_account(key)
        session["keys"] = [k for k in browser_keys() if k != key]
        if session.get("active") == key:
            session["active"] = session["keys"][0] if session["keys"] else None
    return jr({"ok": True})


# ----------------------------------------------------------------------------
# Hồ sơ
# ----------------------------------------------------------------------------
@app.get("/api/me")
@api
def me():
    e = get_entry()
    with e.lock:
        prof = flat_profile(e.client.user.get_profile())
    prof["uid"] = prof["uid"] or e.uid
    save_profile(e.key, prof)
    return jr({**prof, "key": e.key})


@app.post("/api/me/name")
@api
def me_name():
    e = get_entry()
    data = body()
    with e.lock:
        e.client.user.update_name(first_name=need(data, "first_name", 60), last_name=need(data, "last_name", 60))
    return me()


def save_upload(fs, allowed: set[str], tmpdir: str, label: str) -> str | None:
    if fs is None or not fs.filename:
        return None
    ext = Path(fs.filename).suffix.lower()
    if ext not in allowed:
        raise ApiError(f"Định dạng {label} không hỗ trợ ({ext or 'không có đuôi'})")
    path = Path(tmpdir) / f"{uuid.uuid4().hex}{ext}"
    fs.save(path)
    return str(path)


@app.post("/api/me/avatar")
@api
def me_avatar():
    e = get_entry()
    with tempfile.TemporaryDirectory() as tmp:
        path = save_upload(request.files.get("image"), IMAGE_EXT, tmp, "ảnh đại diện")
        if not path:
            raise ApiError("Chưa chọn ảnh đại diện")
        with e.lock:
            e.client.user.update_avatar(path)
    return me()


@app.get("/api/profile/<username>")
@api
def profile_by_username(username):
    if not USERNAME_RE.match(username):
        raise ApiError("Username không hợp lệ")
    e = get_entry()
    with e.lock:
        return jr(flat_profile(e.client.user.get_profile_by_username(username)))


# ----------------------------------------------------------------------------
# Đăng bài
# ----------------------------------------------------------------------------
@app.get("/api/note-types")
@api
def note_types():
    L = lib()
    if L is None:
        return jr({"items": []})
    nt = L.NoteType
    members = getattr(nt, "__members__", None)
    names = list(members) if members else [n for n in dir(nt) if n.isupper() and not n.startswith("_")]
    return jr({"items": names})


def ffmpeg_exe() -> str | None:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001
        return None


def to_mp4(src: str, tmpdir: str) -> str:
    """Video quay từ trình duyệt thường là WebM → chuyển H.264/AAC mp4, cắt tối đa 60 giây."""
    exe = ffmpeg_exe()
    if exe is None:
        if src.lower().endswith(".webm"):
            raise ApiError("Server thiếu ffmpeg để xử lý video (pip install imageio-ffmpeg).", 500)
        return src
    dst = str(Path(tmpdir) / f"{uuid.uuid4().hex}.mp4")
    cmd = [
        exe, "-y", "-i", src, "-t", str(MAX_VIDEO_SECONDS),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", dst,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=240)
    except subprocess.TimeoutExpired:
        raise ApiError("Xử lý video quá lâu, hãy thử clip ngắn hơn.", 504)
    if proc.returncode != 0 or not Path(dst).exists():
        app.logger.error("ffmpeg lỗi: %s", proc.stderr[-800:].decode("utf-8", "ignore"))
        raise ApiError("Không xử lý được video này.", 400)
    return dst


def _audio_host_ok(host: str | None) -> bool:
    host = (host or "").lower()
    return host.endswith(".itunes.apple.com") or host.endswith(".mzstatic.com")


class _AudioRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        u = urllib.parse.urlparse(newurl)
        if u.scheme != "https" or not _audio_host_ok(u.hostname):
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_audio_opener = urllib.request.build_opener(_AudioRedirect)


def download_preview(url: str, tmpdir: str) -> str:
    u = urllib.parse.urlparse(url)
    if u.scheme != "https" or not _audio_host_ok(u.hostname):
        raise ApiError("Nguon nhac khong duoc phep.", 400)
    req = urllib.request.Request(url, headers={"User-Agent": "LockCOC/3.0"})
    try:
        with _audio_opener.open(req, timeout=12) as r:
            raw = r.read(8_000_001)
    except Exception:  # noqa: BLE001
        raise ApiError("Khong tai duoc doan nhac, thu lai sau.", 502)
    if len(raw) > 8_000_000 or len(raw) < 1000:
        raise ApiError("Doan nhac khong hop le.", 400)
    ext = Path(u.path).suffix.lower()
    dst = Path(tmpdir) / f"{uuid.uuid4().hex}{ext if ext in AUDIO_EXT else '.m4a'}"
    dst.write_bytes(raw)
    return str(dst)


def video_size(exe: str, path: str):
    try:
        r = subprocess.run([exe, "-i", path], capture_output=True, timeout=30)
        m = re.search(r"Video:.*?, (\d{2,5})x(\d{2,5})", r.stderr.decode("utf-8", "ignore"))
        return (int(m.group(1)), int(m.group(2))) if m else None
    except Exception:  # noqa: BLE001
        return None


def mix_music(image: str, video: str | None, audio: str, start, tmpdir: str, card: str | None = None) -> str:
    exe = ffmpeg_exe()
    if exe is None:
        raise ApiError("Server thieu ffmpeg de ghep nhac (pip install imageio-ffmpeg).", 500)
    try:
        start_s = max(0.0, min(float(start or 0), 3600.0))
    except (TypeError, ValueError):
        start_s = 0.0
    dst = str(Path(tmpdir) / f"{uuid.uuid4().hex}.mp4")
    if video:
        cmd = [exe, "-y", "-i", video, "-ss", f"{start_s:.2f}", "-stream_loop", "-1", "-i", audio,
               "-map", "0:v:0", "-map", "1:a:0", "-t", str(MAX_VIDEO_SECONDS), "-shortest",
               "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-pix_fmt", "yuv420p", "-r", "30",
               "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", dst]
    else:
        dur = MUSIC_SECONDS
        cmd = [exe, "-y", "-loop", "1", "-framerate", "10", "-i", image,
               "-ss", f"{start_s:.2f}", "-stream_loop", "-1", "-i", audio,
               "-map", "0:v:0", "-map", "1:a:0", "-t", str(dur),
               "-vf", "scale=540:-2,format=yuv420p", "-af", f"afade=t=out:st={max(dur - 1.5, 0):.1f}:d=1.5",
               "-c:v", "libx264", "-preset", "ultrafast", "-tune", "stillimage", "-crf", "30", "-r", "10",
               "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", dst]
    if video and card:
        dims = video_size(exe, video) or (720, 1280)
        cw = max(2, int(dims[0] * 0.86) // 2 * 2)
        cmd = [exe, "-y", "-i", video, "-ss", f"{start_s:.2f}", "-stream_loop", "-1", "-i", audio, "-i", card,
               "-filter_complex", f"[2:v]scale={cw}:-1[c];[0:v][c]overlay=(W-w)/2:H-h-H*0.05,format=yuv420p[v]",
               "-map", "[v]", "-map", "1:a:0", "-t", str(MAX_VIDEO_SECONDS), "-shortest",
               "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-r", "30",
               "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", dst]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=150)
    except subprocess.TimeoutExpired:
        raise ApiError("Ghep nhac qua lau, hay thu clip/nhac ngan hon.", 504)
    if proc.returncode != 0 or not Path(dst).exists():
        app.logger.error("ffmpeg ghep nhac loi: %s", proc.stderr[-800:].decode("utf-8", "ignore"))
        raise ApiError("Khong ghep duoc nhac nay (file nhac/video khong doc duoc).", 400)
    return dst


def parse_post_meta(form) -> dict:
    """Kiểm tra dữ liệu form đăng bài, trả về dict thuần JSON (dùng được cho cả hẹn giờ)."""
    L = lib()
    meta: dict = {}
    caption = form.get("caption", "").strip()
    if len(caption) > 300:
        raise ApiError("Caption quá dài (tối đa 300 ký tự)")
    if caption:
        meta["caption"] = caption
    icon = form.get("icon", "").strip()
    if icon:
        meta["icon"] = icon[:8]
    colors_raw = form.get("colors", "").strip()
    if colors_raw:
        colors = [c.strip() for c in colors_raw.split(",") if c.strip()]
        if not 1 <= len(colors) <= 4 or not all(HEX_RE.match(c) for c in colors):
            raise ApiError("Màu gradient phải là mã hex dạng #RRGGBB (tối đa 4 màu)")
        meta["colors"] = colors
    text_color = form.get("text_color", "").strip()
    if text_color:
        if not HEX_RE.match(text_color):
            raise ApiError("Màu chữ phải có dạng #RRGGBB")
        meta["text_color"] = text_color
    note = form.get("note_type", "").strip()
    if note:
        members = getattr(L.NoteType, "__members__", None)
        if (members.get(note) if members else getattr(L.NoteType, note, None)) is None:
            raise ApiError("NoteType không hợp lệ")
        meta["note"] = note
    nt = form.get("nm_title", "").strip()
    if nt:
        def _https(u):
            u = (u or "").strip()
            return u if re.match(r"^https://\S+$", u) and len(u) <= 700 else ""
        meta["music"] = {"title": nt[:120], "artist": form.get("nm_artist", "").strip()[:120], "art": _https(form.get("nm_art")),
                         "preview": _https(form.get("nm_preview")), "link": _https(form.get("nm_link"))}
    rec = form.get("recipients", "").strip()
    if rec:
        ids = [x.strip() for x in rec.split(",") if x.strip()]
        if not ids or len(ids) > 500 or not all(ID_RE.match(i) for i in ids):
            raise ApiError("Danh sách người nhận không hợp lệ")
        meta["recipients"] = ids
    return meta


def post_kwargs(meta: dict, image: str, video: str | None) -> dict:
    L = lib()
    kwargs: dict = {"image": image}
    for k in ("caption", "icon", "colors", "text_color"):
        if k in meta:
            kwargs[k] = meta[k]
    if "note" in meta:
        members = getattr(L.NoteType, "__members__", None)
        kwargs["note_type"] = members.get(meta["note"]) if members else getattr(L.NoteType, meta["note"])
    if meta.get("recipients"):
        kwargs["recipients"] = meta["recipients"]
    if video:
        kwargs["video"] = video
    return kwargs


def _music_overlay(mm: dict, minimal: bool = False) -> dict:
    text = (mm.get("artist", "") + " " + mm.get("title", "")).strip()[:140]
    payload = {"artist": mm.get("artist", ""), "song_title": mm.get("title", "")}
    if mm.get("preview") and not minimal:
        payload["preview_url"] = mm["preview"]
    if mm.get("link") and not minimal:
        payload["spotify_url"] = mm["link"]
    data = {
        "background": {"colors": [], "material_blur": "ultra_thin"},
        "max_lines": {"value": "1", "@type": "type.googleapis.com/google.protobuf.Int64Value"},
        "text": text, "text_color": "#ffffff", "type": "music", "payload": payload,
    }
    if mm.get("art"):
        data["icon"] = {"data": mm["art"], "type": "image"}
    return {"overlay_type": "caption", "overlay_id": "caption:music", "alt_text": text, "data": data}


_last_music: dict = {}


def perform_post(e: Entry, meta: dict, image: str, video: str | None) -> str:
    L = lib()
    mm = meta.get("music")
    result = None
    if mm:
        last = None
        for minimal in (False, True):
            ov = _music_overlay(mm, minimal)
            kw = post_kwargs(meta, image, video)
            kw["caption"] = ov["alt_text"]
            kw.pop("note_type", None)
            try:
                with e.lock:
                    mom = e.client.moments
                    mom.build_overlay = lambda *a, _ov=ov, **k: _ov
                    try:
                        result = mom.post(**kw)
                    finally:
                        try:
                            del mom.build_overlay
                        except AttributeError:
                            pass
                last = None
                _last_music[e.key] = {"t": time.time(), "minimal": minimal, "sent": ov,
                                      "has_video": bool(video), "result": str(result)[:300]}
                break
            except Exception as ex:  # noqa: BLE001
                if L and isinstance(ex, getattr(getattr(L, "exc", None), "AuthenticationError", ())):
                    raise
                last = ex
                app.logger.warning("The nhac loi (minimal=%s): %s", minimal, ex)
        if last is not None:
            raise ApiError("Locket không nhận thẻ nhạc này: %s. Thử tắt “Thẻ nhạc Locket” trong Studio." % str(last)[:160], 502)
    else:
        with e.lock:
            result = e.client.moments.post(**post_kwargs(meta, image, video))
    post_id = uuid.uuid4().hex
    thumb_name = f"{post_id}{Path(image).suffix.lower()}"
    try:
        shutil.copyfile(image, MEDIA_DIR / thumb_name)
    except OSError:
        thumb_name = ""
    moment_uid = None
    if isinstance(result, dict):
        moment_uid = first(result, ["moment_uid", "id", "canonical_uid", "uid"])
    elif isinstance(result, str):
        moment_uid = result
    q(
        "INSERT INTO posts(id,key,kind,caption,file,moment_uid,created) VALUES(?,?,?,?,?,?,?)",
        (post_id, e.key, "video" if video else "photo", meta.get("caption", ""), thumb_name,
         moment_uid if isinstance(moment_uid, str) else None, time.time()),
        commit=True,
    )
    return post_id


@app.post("/api/post")
@api
def post_moment():
    e = get_entry()
    meta = parse_post_meta(request.form)

    run_at = None
    sched = request.form.get("schedule_at", "").strip()
    if sched:
        try:
            ms = float(sched)
        except ValueError:
            raise ApiError("Thời gian hẹn không hợp lệ")
        run_at = ms / 1000 if ms > 1e11 else ms
        now = time.time()
        if run_at < now + 30:
            raise ApiError("Thời gian hẹn phải ở tương lai (ít nhất 30 giây).")
        if run_at > now + 30 * 86400:
            raise ApiError("Chỉ hẹn giờ được tối đa 30 ngày.")

    with tempfile.TemporaryDirectory() as tmp:
        image = save_upload(request.files.get("image"), IMAGE_EXT, tmp, "ảnh")
        if not image:
            raise ApiError("Cần có ảnh (hoặc khung hình đại diện nếu đăng video)")
        video = save_upload(request.files.get("video"), VIDEO_EXT, tmp, "video")
        music_file = save_upload(request.files.get("music"), AUDIO_EXT, tmp, "nhac")
        music_url = request.form.get("music_url", "").strip()
        if music_file or music_url:
            if not music_file:
                music_file = download_preview(music_url, tmp)
            card = save_upload(request.files.get("music_card"), {".png"}, tmp, "the nhac")
            video = mix_music(image, video, music_file, request.form.get("music_start", "0"), tmp, card if video else None)
        elif video:
            video = to_mp4(video, tmp)
        if run_at:
            sid = uuid.uuid4().hex
            d = SCHED_DIR / sid
            d.mkdir(parents=True)
            img_dst = d / f"image{Path(image).suffix.lower()}"
            shutil.copyfile(image, img_dst)
            vid_dst = None
            if video:
                vid_dst = d / f"video{Path(video).suffix.lower()}"
                shutil.copyfile(video, vid_dst)
            q(
                "INSERT INTO scheduled(id,key,run_at,meta,image,video,status,error,created) VALUES(?,?,?,?,?,?,?,?,?)",
                (sid, e.key, run_at, json.dumps(meta, ensure_ascii=False), str(img_dst), str(vid_dst) if vid_dst else "", "pending", None, time.time()),
                commit=True,
            )
            return jr({"ok": True, "scheduled": True, "id": sid, "run_at": run_at})
        post_id = perform_post(e, meta, image, video)
    return jr({"ok": True, "id": post_id})


# ---- Hẹn giờ đăng ---------------------------------------------------------
@app.get("/api/scheduled")
@api
def scheduled_list():
    e = get_entry()
    rows = q("SELECT * FROM scheduled WHERE key=? AND status IN ('pending','running','failed') ORDER BY run_at", (e.key,))
    items = []
    for r in rows:
        try:
            meta = json.loads(r["meta"] or "{}")
        except ValueError:
            meta = {}
        items.append({"id": r["id"], "run_at": r["run_at"], "status": r["status"], "error": r["error"],
                      "caption": meta.get("caption", ""), "video": bool(r["video"])})
    return jr({"items": items})


def drop_scheduled(sid: str) -> None:
    shutil.rmtree(SCHED_DIR / sid, ignore_errors=True)
    q("DELETE FROM scheduled WHERE id=?", (sid,), commit=True)


@app.post("/api/scheduled/cancel")
@api
def scheduled_cancel():
    e = get_entry()
    sid = need_id(body(), "id")
    row = q("SELECT status FROM scheduled WHERE id=? AND key=?", (sid, e.key), one=True)
    if not row:
        raise ApiError("Không tìm thấy bài hẹn giờ", 404)
    if row["status"] == "running":
        raise ApiError("Bài đang được đăng, không huỷ được nữa.")
    drop_scheduled(sid)
    return jr({"ok": True})


def run_due_posts() -> None:
    L = lib()
    if L is None:
        return
    for r in q("SELECT * FROM scheduled WHERE status='pending' AND run_at<=?", (time.time(),)):
        with _db_lock:
            claimed = _db.execute("UPDATE scheduled SET status='running' WHERE id=? AND status='pending'", (r["id"],)).rowcount
            _db.commit()
        if not claimed:
            continue
        status, err = "done", None
        try:
            if not account_row(r["key"]) or not session_path(r["key"]).exists():
                raise RuntimeError("Tài khoản đã đăng xuất")
            with ENTRIES_LOCK:
                e = ENTRIES.get(r["key"])
                if e is None:
                    e = ENTRIES[r["key"]] = Entry(r["key"], L.LocketClient(session_path=str(session_path(r["key"]))))
            perform_post(e, json.loads(r["meta"] or "{}"), r["image"], r["video"] or None)
        except Exception as ex:  # noqa: BLE001
            status, err = "failed", (str(ex) or type(ex).__name__)[:300]
            app.logger.error("Hẹn giờ lỗi: %s", traceback.format_exc())
        if status == "done":
            drop_scheduled(r["id"])
        else:
            q("UPDATE scheduled SET status=?, error=? WHERE id=?", (status, err, r["id"]), commit=True)


_scheduler_started = False


def start_scheduler() -> None:
    global _scheduler_started
    if _scheduler_started or os.environ.get("LOCKETCAC_NO_SCHEDULER") == "1":
        return
    _scheduler_started = True
    # bài đang chạy dở khi server tắt: đánh dấu lỗi để không đăng trùng
    q("UPDATE scheduled SET status='failed', error='Bị gián đoạn khi server dừng' WHERE status='running'", commit=True)

    def loop():
        while True:
            time.sleep(15)
            try:
                run_due_posts()
            except Exception:  # noqa: BLE001
                app.logger.error("Scheduler lỗi:\n%s", traceback.format_exc())

    threading.Thread(target=loop, daemon=True, name="locketcac-scheduler").start()


@app.get("/api/history")
@api
def history():
    e = get_entry()
    rows = q("SELECT * FROM posts WHERE key=? ORDER BY created DESC LIMIT 60", (e.key,))
    return jr({"items": [
        {"id": r["id"], "kind": r["kind"], "caption": r["caption"], "created": r["created"],
         "moment_uid": r["moment_uid"], "image": f"/api/media/{r['file']}" if r["file"] else ""}
        for r in rows
    ]})


@app.get("/api/media/<name>")
@api
def media(name):
    if not re.match(r"^[0-9a-f]{32}\.[a-z]{3,4}$", name):
        raise ApiError("Không tìm thấy", 404)
    owner = q("SELECT key FROM posts WHERE file=?", (name,), one=True)
    if not owner or owner["key"] not in browser_keys():
        raise ApiError("Không tìm thấy", 404)
    resp = send_from_directory(MEDIA_DIR, name)
    resp.headers["Cache-Control"] = "private, max-age=86400"
    return resp


# ----------------------------------------------------------------------------
# Feed / tương tác
# ----------------------------------------------------------------------------
@app.get("/api/feed")
@api
def feed():
    """full=1: gộp feed mới nhất + khoảnh khắc của TỪNG người bạn (đồng bộ toàn bộ)."""
    e = get_entry()
    full = request.args.get("full") == "1"
    with e.lock:
        data = e.client.moments.get_latest()
        friends_raw = e.client.friends.get_all_friends() if full else []
    items = [norm_moment(m) for m in to_list(data)]
    items = [m for m in items if m.get("id") or m.get("image") or m.get("video")]
    synced = 0
    if full:
        L = lib()
        fmap = {}
        for fr in friends_raw[:80] if isinstance(friends_raw, list) else []:
            fu = norm_friend(fr)
            if fu["uid"]:
                fmap[fu["uid"]] = fu
        seen = {m["id"] for m in items if m.get("id")}
        for uid, fu in fmap.items():
            try:
                with e.lock:
                    got = e.client.moments.get_shared_moments_by_user(user_uid=uid, limit=24)
            except Exception as ex:  # noqa: BLE001
                if L and isinstance(ex, L.exc.AuthenticationError):
                    raise
                continue
            synced += 1
            for raw in to_list(got):
                n = norm_moment(raw)
                if not n or (n.get("id") in seen) or not (n.get("image") or n.get("video")):
                    continue
                n["user"] = {**fu, **{k: v for k, v in n["user"].items() if v}} if n.get("user") else fu
                seen.add(n.get("id"))
                items.append(n)
        for m in items:  # bổ sung avatar/tên từ danh sách bạn
            fu = fmap.get((m.get("user") or {}).get("uid"))
            if fu:
                m["user"] = {**fu, **{k: v for k, v in m["user"].items() if v}}
        items.sort(key=lambda m: m.get("ts") or 0, reverse=True)
    return jr({"items": items, "synced_friends": synced})


@app.get("/api/my-moments")
@api
def my_moments():
    e = get_entry()
    with e.lock:
        data = e.client.moments.get_all_my_moments()
    return jr({"items": [m for m in (norm_moment(x) for x in to_list(data)) if m.get("id")]})


@app.post("/api/react")
@api
def react():
    e = get_entry()
    data = body()
    with e.lock:
        e.client.moments.react(moment_uid=need_id(data, "moment_uid"), reaction=need(data, "reaction", 16))
    return jr({"ok": True})


@app.post("/api/comment")
@api
def comment():
    e = get_entry()
    data = body()
    with e.lock:
        e.client.moments.comment(
            moment_uid=need_id(data, "moment_uid"),
            receiver_uid=need_id(data, "receiver_uid"),
            text=need(data, "text", 1000),
        )
    return jr({"ok": True})


@app.get("/api/views/<moment_id>")
@api
def views(moment_id):
    if not ID_RE.match(moment_id):
        raise ApiError("ID khoảnh khắc không hợp lệ")
    e = get_entry()
    with e.lock:
        data = e.client.moments.get_views(moment_uid=moment_id)
    viewers = data if isinstance(data, list) else to_list(data)
    out = [{"uid": first(v, ["uid"]), "name": s(v.get("first_name")), "emoji": s(v.get("emoji"))} for v in viewers if isinstance(v, dict)]
    count = data.get("views_count") if isinstance(data, dict) and data.get("views_count") is not None else len(out)
    return jr({"count": count, "viewers": out})


@app.post("/api/moment/delete")
@api
def moment_delete():
    e = get_entry()
    mid = need_id(body(), "moment_uid")
    with e.lock:
        e.client.moments.delete(moment_uid=mid)
    for r in q("SELECT file FROM posts WHERE key=? AND moment_uid=?", (e.key, mid)):
        if r["file"]:
            (MEDIA_DIR / r["file"]).unlink(missing_ok=True)
    q("DELETE FROM posts WHERE key=? AND moment_uid=?", (e.key, mid), commit=True)
    q("DELETE FROM sync_items WHERE key=? AND mid=?", (e.key, mid), commit=True)
    return jr({"ok": True})


# ----------------------------------------------------------------------------
# Bạn bè
# ----------------------------------------------------------------------------
@app.get("/api/friends")
@api
def friends():
    e = get_entry()
    with e.lock:
        data = e.client.friends.get_all_friends()
    return jr({"items": [norm_friend(f) for f in to_list(data) if isinstance(f, dict)]})


@app.post("/api/friends/request")
@api
def friend_request():
    e = get_entry()
    username = need(body(), "username", 40)
    if not USERNAME_RE.match(username):
        raise ApiError("Username không hợp lệ")
    with e.lock:
        e.client.friends.send_request_by_username(username)
    return jr({"ok": True})


@app.post("/api/friends/accept")
@api
def friend_accept():
    e = get_entry()
    with e.lock:
        e.client.friends.accept_request(user_uid=need_id(body(), "user_uid"))
    return jr({"ok": True})


# ----------------------------------------------------------------------------
# Chat (dùng các hàm có trong docs: get_conversations / get_messages / send_message)
# ----------------------------------------------------------------------------
@app.get("/api/chat/conversations")
@api
def chat_conversations():
    e = get_entry()
    with e.lock:
        data = e.client.chat.get_conversations()
    items = [norm_conv(c) for c in to_list(data) if isinstance(c, dict)]
    return jr({"items": items, "unread": sum(c["unread"] for c in items)})


# ----------------------------------------------------------------------------
# Nhạc & thời tiết (gọi dịch vụ ngoài qua server, chỉ cho phép vài tên miền cố định)
# ----------------------------------------------------------------------------
class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        u = urllib.parse.urlparse(newurl)
        if u.scheme != "https" or u.hostname not in ALLOWED_FETCH_HOSTS:
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_SafeRedirect)


def fetch_json(url: str, timeout: float = 8):
    u = urllib.parse.urlparse(url)
    if u.scheme != "https" or u.hostname not in ALLOWED_FETCH_HOSTS:
        raise ApiError("Địa chỉ không được phép.", 400)
    req = urllib.request.Request(url, headers={"User-Agent": "LockCOC/3.0", "Accept": "application/json"})
    try:
        with _opener.open(req, timeout=timeout) as r:
            raw = r.read(1_000_000)
        return json.loads(raw)
    except ApiError:
        raise
    except Exception:  # noqa: BLE001
        raise ApiError("Không kết nối được dịch vụ bên ngoài, thử lại sau.", 502)


def norm_track(t) -> dict:
    return {
        "title": s(t.get("trackName")),
        "artist": s(t.get("artistName")),
        "art": s(t.get("artworkUrl100")).replace("100x100", "200x200"),
        "preview": s(t.get("previewUrl")),
    }


@app.get("/api/music/search")
@api
def music_search():
    get_entry()
    term = request.args.get("q", "").strip()[:80]
    if not term:
        raise ApiError("Nhập tên bài hát hoặc ca sĩ")
    url = "https://itunes.apple.com/search?" + urllib.parse.urlencode(
        {"term": term, "media": "music", "entity": "song", "limit": 15, "country": "VN"})
    data = fetch_json(url)
    items = [norm_track(t) for t in (data.get("results") or []) if isinstance(t, dict) and t.get("trackName")]
    return jr({"items": items})


@app.get("/api/music/trending")
@api
def music_trending():
    get_entry()
    try:
        data = fetch_json("https://itunes.apple.com/vn/rss/topsongs/limit=12/json")
        items = []
        for en in (data.get("feed", {}).get("entry") or []):
            imgs = en.get("im:image") or []
            items.append({
                "title": s((en.get("im:name") or {}).get("label")),
                "artist": s((en.get("im:artist") or {}).get("label")),
                "art": s((imgs[-1] if imgs else {}).get("label")).replace("170x170", "200x200"),
                "preview": "",
                "id": s(((en.get("id") or {}).get("attributes") or {}).get("im:id")),
            })
        items = [i for i in items if i["title"]]
        ids = [i["id"] for i in items if i.get("id")]
        if ids:
            try:
                lk = fetch_json("https://itunes.apple.com/lookup?" + urllib.parse.urlencode(
                    {"id": ",".join(ids), "country": "VN"}))
                pv = {str(t.get("trackId")): s(t.get("previewUrl")) for t in (lk.get("results") or []) if isinstance(t, dict)}
                for i in items:
                    i["preview"] = pv.get(i.get("id"), "")
            except ApiError:
                pass
        if items:
            return jr({"items": items})
    except ApiError:
        pass
    data = fetch_json("https://itunes.apple.com/search?" + urllib.parse.urlencode(
        {"term": "nhạc việt", "media": "music", "entity": "song", "limit": 12, "country": "VN"}))
    return jr({"items": [norm_track(t) for t in (data.get("results") or []) if isinstance(t, dict) and t.get("trackName")]})


SPOTIFY_RE = re.compile(r"^https://open\.spotify\.com/(intl-[a-z]{2}/)?track/[A-Za-z0-9]{10,40}(\?[\w=&%.-]*)?$")


@app.get("/api/music/link")
@api
def music_link():
    get_entry()
    url = request.args.get("url", "").strip()
    if not SPOTIFY_RE.match(url):
        raise ApiError("Hãy dán link bài hát Spotify (open.spotify.com/track/…)")
    data = fetch_json("https://open.spotify.com/oembed?" + urllib.parse.urlencode({"url": url}))
    title = s(data.get("title"))
    if not title:
        raise ApiError("Không đọc được bài hát từ link này", 404)
    return jr({"item": {"title": title, "artist": "", "art": s(data.get("thumbnail_url")), "preview": ""}})


@app.get("/api/weather")
@api
def weather():
    get_entry()
    try:
        lat = float(request.args.get("lat", "10.82"))
        lon = float(request.args.get("lon", "106.63"))
    except ValueError:
        raise ApiError("Toạ độ không hợp lệ")
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ApiError("Toạ độ không hợp lệ")
    data = fetch_json("https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(
        {"latitude": round(lat, 2), "longitude": round(lon, 2), "current": "temperature_2m,weather_code"}))
    cur = data.get("current") or {}
    return jr({"temp": cur.get("temperature_2m"), "code": cur.get("weather_code")})


# ----------------------------------------------------------------------------
# Chuỗi (streak) đăng bài hằng ngày + khôi phục chuỗi VIP
# (tính theo bài đăng qua LockCOC; không phải chuỗi gốc của Locket)
# ----------------------------------------------------------------------------
TZ_OFFSET = float(os.environ.get("LOCKETCAC_TZ_OFFSET", "7"))  # giờ Việt Nam
MAX_RESTORE_GAP = 7


def local_day(ts: float) -> datetime.date:
    return (datetime.datetime.utcfromtimestamp(ts) + datetime.timedelta(hours=TZ_OFFSET)).date()


def streak_days(key: str) -> set:
    days = {local_day(r["created"]) for r in q("SELECT created FROM posts WHERE key=?", (key,))}
    for r in q("SELECT day FROM streak_restores WHERE key=?", (key,)):
        try:
            days.add(datetime.date.fromisoformat(r["day"]))
        except ValueError:
            pass
    return days


def streak_info(key: str) -> dict:
    days = streak_days(key)
    today = local_day(time.time())
    cur = 0
    d = today if today in days else today - datetime.timedelta(days=1)
    while d in days:
        cur += 1
        d -= datetime.timedelta(days=1)
    best, run, prev = 0, 0, None
    for x in sorted(days):
        run = run + 1 if prev and (x - prev).days == 1 else 1
        best, prev = max(best, run), x
    past = [x for x in days if x < today]
    gap = 0
    if past and today not in days:
        gap = (today - max(past)).days - 1  # số ngày bị đứt (không tính hôm nay)
    restorable = 1 <= gap <= MAX_RESTORE_GAP
    return {"current": cur, "best": best, "today_done": today in days, "broken_days": gap, "can_restore": restorable,
            "restored_total": q("SELECT COUNT(*) c FROM streak_restores WHERE key=?", (key,), one=True)["c"]}


@app.get("/api/streak")
@api
def streak_get():
    return jr(streak_info(get_entry().key))


@app.post("/api/streak/restore")
@api
def streak_restore():
    e = get_entry()
    info = streak_info(e.key)
    if not info["broken_days"]:
        raise ApiError("Chuỗi của bạn chưa bị đứt, không cần khôi phục.")
    if not info["can_restore"]:
        raise ApiError(f"Chuỗi đứt quá {MAX_RESTORE_GAP} ngày nên không khôi phục được.")
    today = local_day(time.time())
    last = max(x for x in streak_days(e.key) if x < today)
    for i in range(1, info["broken_days"] + 1):
        q("INSERT OR IGNORE INTO streak_restores(key,day,created) VALUES(?,?,?)",
          (e.key, (last + datetime.timedelta(days=i)).isoformat(), time.time()), commit=True)
    return jr(streak_info(e.key))


@app.errorhandler(413)
def too_large(_):
    return jr({"error": "File quá lớn (tối đa 200 MB)."}, 413)


@app.get("/api/music-probe")
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
    out = re.sub(r"token=[^&\"\s]+", "token=X", out)
    return Response(out, mimetype="application/json")


with _db_lock:
    _db.executescript(
        """
        CREATE TABLE IF NOT EXISTS sync_items(
            key TEXT, mid TEXT, uid TEXT, name TEXT, thumb TEXT, video TEXT,
            caption TEXT, ts REAL, mine INTEGER, PRIMARY KEY(key, mid));
        CREATE INDEX IF NOT EXISTS sync_key_ts ON sync_items(key, ts DESC);
        """
    )
    _db.commit()

_sync_jobs: dict = {}
_sync_lock = threading.Lock()
SYNC_MAX_PAGES = 400
SYNC_MAX_ITEMS = 20000


def _sync_put(rows: list) -> None:
    if not rows:
        return
    with _db_lock:
        _db.executemany(
            "INSERT OR REPLACE INTO sync_items(key,mid,uid,name,thumb,video,caption,ts,mine) VALUES(?,?,?,?,?,?,?,?,?)",
            rows,
        )
        _db.commit()


def _friend_moments(e, uid, others, max_pages=80):
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


def _sync_worker(e) -> None:
    job = _sync_jobs[e.key]
    L = lib()
    try:
        job["phase"] = "Đang lấy danh sách bạn bè"
        names = {}
        with e.lock:
            fr = e.client.friends.get_all_friends()
        for f in (fr if isinstance(fr, list) else []):
            n = norm_friend(f)
            if n.get("uid"):
                full = " ".join(x for x in (n.get("first_name"), n.get("last_name")) if x)
                names[n["uid"]] = full or n.get("username") or ""

        job["phase"] = "Đang tải ảnh của bạn bè"
        seen = set()
        cur = None
        while job["pages"] < SYNC_MAX_PAGES and job["found"] < SYNC_MAX_ITEMS:
            payload = {"should_count_missed_moments": True, "include_group_moments": True}
            if cur:
                payload["sync_token"] = cur
            with e.lock:
                res = e.client.post_api("getLatestMomentV2", payload)
            data = res.get("data", []) if isinstance(res, dict) else []
            if not data:
                break
            job["pages"] += 1
            rows = []
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
                thumb = s(m.get("thumbnail_url") or m.get("image_url") or "")
                video = s(m.get("video_url") or "")
                if not (thumb or video):
                    continue
                uid = m.get("user") if isinstance(m.get("user"), str) else ""
                rows.append((e.key, mid, uid, names.get(uid, ""), thumb, video, caption_of(m),
                             to_ts(m.get("date")) or 0, 1 if uid and uid == e.uid else 0))
            _sync_put(rows)
            job["found"] += len(rows)
            if new == 0 or (isinstance(res, dict) and res.get("status") == 304):
                break

        uids = list(names)
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

        job["phase"] = "Đang tải ảnh của bạn"
        try:
            with e.lock:
                own = e.client.moments.get_all_my_moments()
            rows = []
            for m in to_list(own):
                if not isinstance(m, dict):
                    continue
                mid = first(m, ["moment_uid", "id", "canonical_uid", "uid"])
                thumb = s(m.get("thumbnail_url") or "")
                video = s(m.get("video_url") or "")
                if not mid or not (thumb or video):
                    continue
                rows.append((e.key, str(mid), e.uid or "", "Tôi", thumb, video, s(m.get("caption") or ""),
                             to_ts(m.get("created_at")) or 0, 1))
            _sync_put(rows)
        except Exception as ex:  # noqa: BLE001
            if L and isinstance(ex, L.exc.AuthenticationError):
                raise
            app.logger.warning("Dong bo anh cua toi loi: %s", ex)
        job["state"] = "done"
        job["phase"] = "Hoàn tất"
    except Exception as ex:  # noqa: BLE001
        job["state"] = "error"
        if L and isinstance(ex, L.exc.AuthenticationError):
            job["error"] = "Phiên Locket đã hết hạn, hãy đăng nhập lại."
        else:
            app.logger.error("Dong bo loi:\n%s", traceback.format_exc())
            job["error"] = "Đồng bộ bị gián đoạn, thử lại sau."
    finally:
        job["ended"] = time.time()


@app.post("/api/sync-all")
@api
def sync_all_start():
    e = get_entry()
    with _sync_lock:
        job = _sync_jobs.get(e.key)
        if job and job.get("state") == "running" and time.time() - job.get("started", 0) < 1200:
            return jr(job)
        job = {"state": "running", "phase": "Bắt đầu", "pages": 0, "found": 0, "started": time.time(), "error": ""}
        _sync_jobs[e.key] = job
    threading.Thread(target=_sync_worker, args=(e,), daemon=True).start()
    return jr(job)


@app.get("/api/sync-all/status")
@api
def sync_all_status():
    e = get_entry()
    n = q("SELECT COUNT(*) AS n FROM sync_items WHERE key=?", (e.key,), one=True)["n"]
    job = _sync_jobs.get(e.key) or {"state": "idle"}
    return jr({**job, "total": int(n)})


@app.get("/api/sync-all/items")
@api
def sync_all_items():
    e = get_entry()
    who = request.args.get("who", "all")
    try:
        off = max(0, int(request.args.get("offset", "0")))
        lim = max(1, min(int(request.args.get("limit", "60")), 120))
    except ValueError:
        raise ApiError("Tham số không hợp lệ")
    cond = "key=?"
    if who == "mine":
        cond += " AND mine=1"
    elif who == "friends":
        cond += " AND mine=0"
    total = q(f"SELECT COUNT(*) AS n FROM sync_items WHERE {cond}", (e.key,), one=True)["n"]
    rows = q(f"SELECT mid,uid,name,thumb,video,caption,ts,mine FROM sync_items WHERE {cond} ORDER BY ts DESC LIMIT ? OFFSET ?",
             (e.key, lim, off))
    items = [{"id": r["mid"], "uid": r["uid"], "name": r["name"], "image": r["thumb"], "video": r["video"],
              "caption": r["caption"], "ts": r["ts"], "mine": bool(r["mine"])} for r in rows]
    return jr({"items": items, "total": int(total)})


_DL_HOSTS = ("googleapis.com", "googleusercontent.com", "firebasestorage.app", "appspot.com")


@app.get("/api/sync-all/file/<mid>")
@api
def sync_all_file(mid):
    if not re.match(r"^[A-Za-z0-9_.:-]{3,100}$", mid):
        raise ApiError("Không tìm thấy", 404)
    e = get_entry()
    row = q("SELECT thumb, video FROM sync_items WHERE key=? AND mid=?", (e.key, mid), one=True)
    if not row:
        raise ApiError("Không tìm thấy", 404)
    kind = "video" if request.args.get("kind") == "video" else "image"
    url = (row["video"] if kind == "video" else row["thumb"]) or ""
    u = urllib.parse.urlparse(url)
    host = u.hostname or ""
    if u.scheme != "https" or not any(host == h or host.endswith("." + h) for h in _DL_HOSTS):
        raise ApiError("Nguồn tải không hợp lệ", 400)
    try:
        up = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=25)
    except Exception:  # noqa: BLE001
        raise ApiError("Không tải được file từ Locket", 502)
    ctype = up.headers.get_content_type() or "application/octet-stream"
    if not (ctype.startswith("image/") or ctype.startswith("video/") or ctype == "application/octet-stream"):
        up.close()
        raise ApiError("Loại file không hợp lệ", 400)
    ext = ".mp4" if kind == "video" else (".webp" if "webp" in ctype else ".png" if "png" in ctype else ".jpg")

    def gen():
        total = 0
        try:
            while True:
                b = up.read(65536)
                if not b:
                    break
                total += len(b)
                if total > 80_000_000:
                    break
                yield b
        finally:
            up.close()

    resp = Response(gen(), mimetype=ctype)
    resp.headers["Content-Disposition"] = f'attachment; filename="lockcoc-{mid[:12]}{ext}"'
    return resp


@app.get("/sw.js")
def service_worker():
    resp = send_from_directory(app.static_folder, "sw.js", mimetype="application/javascript")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["Service-Worker-Allowed"] = "/"
    return resp


# ======================= CHAT MOI (patch24): the khoanh khac, da xem, thu hoi =======================
_FS = "https://firestore.googleapis.com/v1/projects/locket-4252a/databases/(default)/documents"
_chat_cache: dict = {}


def _fsv(v):
    if not isinstance(v, dict):
        return None
    for k in ("stringValue", "integerValue", "doubleValue", "booleanValue", "timestampValue", "referenceValue"):
        if k in v:
            x = v[k]
            if k == "integerValue" and str(x).lstrip("-").isdigit():
                return int(x)
            return x
    if "mapValue" in v:
        return {k: _fsv(x) for k, x in (v["mapValue"].get("fields") or {}).items()}
    if "arrayValue" in v:
        return [_fsv(x) for x in (v["arrayValue"].get("values") or [])]
    return None


def _fs_get(url: str, token: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def _chat_token(e):
    ses = e.client.session
    fn = getattr(ses, "get_valid_token", None)
    tok = None
    if callable(fn):
        try:
            tok = fn()
        except Exception:  # noqa: BLE001
            tok = None
    return tok or getattr(ses, "id_token", None) or ""


def _chat_conv(e, other: str) -> dict:
    ck = (e.key, other)
    c = _chat_cache.get(ck)
    if c and time.time() - c["t"] < 8:
        return c
    hit = None
    for x in to_list(e.client.chat.get_conversations()):
        if isinstance(x, dict) and x.get("peer_uid") == other:
            hit = x
            break
    c = {"t": time.time(), "cid": (hit or {}).get("conversation_id"), "read": (hit or {}).get("other_last_read_at")}
    _chat_cache[ck] = c
    return c


def _chat_docs(e, cid: str) -> list:
    token = _chat_token(e)
    base = f"{_FS}/conversations/{urllib.parse.quote(cid)}/messages"
    docs, page = [], ""
    for _ in range(3):
        u = base + "?pageSize=300&orderBy=created_at%20desc" + ("&pageToken=" + urllib.parse.quote(page) if page else "")
        d = _fs_get(u, token)
        docs += d.get("documents", [])
        page = d.get("nextPageToken", "")
        if not page:
            break
    return docs


_ATT_SKIP = {"body", "sender", "created_at", "reactions", "client_token"}


def _attach(e, f: dict):
    urls, mid = [], None

    def walk(k, v):
        nonlocal mid
        if isinstance(v, dict):
            for kk, vv in v.items():
                walk(str(kk).lower(), vv)
        elif isinstance(v, list):
            for x in v:
                walk(k, x)
        elif isinstance(v, str):
            if v.startswith("https://") and not any(s_ in k for s_ in ("avatar", "profile")):
                urls.append((k, v))
            elif "moment" in k and ID_RE.match(v) and not mid:
                mid = v

    for k, v in f.items():
        if k not in _ATT_SKIP:
            walk(str(k).lower(), v)
    vid = next((u for k, u in urls if "video" in k or re.search(r"\.(mp4|mov)(\?|$)", u, re.I)), "")
    img = next((u for k, u in urls if u != vid and not re.search(r"\.(mp4|mov)(\?|$)", u, re.I)), "")
    if mid and not (img or vid):
        r = q("SELECT thumb, video FROM sync_items WHERE key=? AND mid=?", (e.key, mid), one=True)
        if r:
            img, vid = r["thumb"] or "", r["video"] or ""
    if img or vid:
        return {"image": img, "video": vid, "moment": mid or ""}
    if mid:
        return {"image": "", "video": "", "moment": mid, "missing": True}
    return None


def _norm_fs(e, d: dict, cid: str) -> dict:
    f = {k: _fsv(v) for k, v in (d.get("fields") or {}).items()}
    sender = f.get("sender") if isinstance(f.get("sender"), str) else ""
    raw = f.get("body") if isinstance(f.get("body"), str) else ""
    text = raw.replace("​", "").strip()
    att = _attach(e, f)
    if not text and not att and not raw.strip("​").strip():
        att = {"image": "", "video": "", "moment": "", "missing": True}
    reacts = [{"emoji": r.get("emoji"), "sender": r.get("sender")} for r in (f.get("reactions") or []) if isinstance(r, dict) and r.get("emoji")]
    return {"id": d["name"].split("/")[-1], "sender": sender, "mine": bool(e.uid and sender == e.uid), "text": text,
            "time": f.get("created_at"), "reactions": reacts, "attach": att, "cid": cid}


def _norm_lib(m: dict, my_uid) -> dict:
    sender = first(m, ["sender_uid", "sender_id", "sender", "from", "uid"])
    if isinstance(sender, dict):
        sender = first(sender, ["uid", "id"])
    text = first(m, ["text", "body", "message"])
    text = text.replace("​", "").strip() if isinstance(text, str) else ""
    reacts = [{"emoji": r.get("emoji"), "sender": r.get("sender")} for r in (m.get("reactions") or []) if isinstance(r, dict) and r.get("emoji")]
    return {"id": first(m, ["message_id", "id"]), "sender": sender, "mine": bool(m.get("is_me")) or bool(my_uid and sender == my_uid),
            "text": text, "time": first(m, ["timestamp", "created_at", "time", "date"]), "reactions": reacts,
            "attach": ({"image": "", "video": "", "moment": "", "missing": True} if not text else None), "cid": m.get("conversation_id")}


@app.get("/api/chat/messages/<other_uid>")
@api
def chat_messages(other_uid):
    if not ID_RE.match(other_uid):
        raise ApiError("UID không hợp lệ")
    e = get_entry()
    out, cid, read = None, None, None
    with e.lock:
        try:
            c = _chat_conv(e, other_uid)
            cid, read = c["cid"], c["read"]
            if cid:
                out = [_norm_fs(e, d, cid) for d in reversed(_chat_docs(e, cid))]
        except Exception as ex:  # noqa: BLE001
            app.logger.warning("Chat Firestore loi, dung ham thu vien: %s", ex)
            out = None
        if out is None:
            data = e.client.chat.get_messages(other_user_id=other_uid)
            out = [_norm_lib(m, e.uid) for m in to_list(data) if isinstance(m, dict)]
            cid = cid or next((m.get("cid") for m in out if m.get("cid")), None)
    return jr({"items": out, "me": e.uid, "cid": cid, "other_read": read})


@app.get("/api/chat/probe/<other_uid>")
@api
def chat_probe(other_uid):
    """Chi tra ve TEN truong va kieu du lieu (khong co noi dung tin nhan) de debug the khoanh khac."""
    if not ID_RE.match(other_uid):
        raise ApiError("UID không hợp lệ")
    e = get_entry()
    with e.lock:
        c = _chat_conv(e, other_uid)
        docs = _chat_docs(e, c["cid"]) if c["cid"] else []

    def shape(v, depth=0):
        if isinstance(v, dict):
            return {k: shape(x, depth + 1) for k, x in v.items()} if depth < 3 else "map"
        if isinstance(v, list):
            return [shape(v[0], depth + 1)] if v else []
        if isinstance(v, str):
            if v.startswith("https://"):
                return "url:" + (urllib.parse.urlparse(v).hostname or "")
            return f"str({len(v)})"
        return type(v).__name__
    rows = []
    for d in docs[:25]:
        f = {k: _fsv(v) for k, v in (d.get("fields") or {}).items()}
        f.pop("body", None)
        rows.append(shape(f))
    kinds: dict = {}
    for r in rows:
        key = ",".join(sorted(r.keys()))
        kinds[key] = kinds.get(key, 0) + 1
    return jr({"conversation": bool(c["cid"]), "messages": len(docs), "field_sets": kinds, "sample": rows[:6]})


@app.post("/api/chat/send")
@api
def chat_send():
    e = get_entry()
    data = body()
    rid = need_id(data, "receiver_uid")
    mu = str(data.get("moment_uid") or "").strip()
    if mu and not ID_RE.match(mu):
        raise ApiError("Mã khoảnh khắc không hợp lệ")
    text = str(data.get("text") or "").strip()[:2000]
    if not text and not mu:
        raise ApiError("Tin nhắn trống")
    with e.lock:
        if mu:
            e.client.chat.send_message(receiver_uid=rid, text=text or None, moment_uid=mu)
        else:
            e.client.chat.send_message(receiver_uid=rid, text=text)
    _chat_cache.pop((e.key, rid), None)
    return jr({"ok": True})


@app.post("/api/chat/read")
@api
def chat_read():
    e = get_entry()
    d = body()
    ghost = d.get("ghost", True) is not False
    with e.lock:
        e.client.chat.mark_as_read(other_user_id=need_id(d, "other_uid"), send_read_receipt=not ghost)
    return jr({"ok": True})


@app.post("/api/chat/delete")
@api
def chat_delete():
    e = get_entry()
    d = body()
    cid, mid = need_id(d, "cid"), need_id(d, "id")
    with e.lock:
        e.client.chat.delete_message(conversation_uid=cid, message_uid=mid, validate_ownership=False)
    for k in [k for k in _chat_cache if k[0] == e.key]:
        _chat_cache.pop(k, None)
    return jr({"ok": True})


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


# ---------- patch27: xoa nhieu khoanh khac ----------
@app.post("/api/moments/delete-many")
@api
def moments_delete_many():
    e = get_entry()
    ids = body().get("ids")
    if not isinstance(ids, list) or not 1 <= len(ids) <= 40 or not all(isinstance(x, str) and ID_RE.match(x) for x in ids):
        raise ApiError("Danh sách bài cần xoá không hợp lệ")
    ok, fail = [], []
    for mid in ids:
        own = q("SELECT 1 FROM sync_items WHERE key=? AND mid=? AND mine=1", (e.key, mid), one=True) or \
            q("SELECT 1 FROM posts WHERE key=? AND moment_uid=?", (e.key, mid), one=True)
        if not own:
            fail.append({"id": mid, "error": "Không phải bài của bạn"})
            continue
        try:
            with e.lock:
                e.client.moments.delete(moment_uid=mid)
        except Exception as ex:  # noqa: BLE001
            fail.append({"id": mid, "error": str(ex)[:120]})
            continue
        for r in q("SELECT file FROM posts WHERE key=? AND moment_uid=?", (e.key, mid)):
            if r["file"]:
                (MEDIA_DIR / r["file"]).unlink(missing_ok=True)
        q("DELETE FROM posts WHERE key=? AND moment_uid=?", (e.key, mid), commit=True)
        q("DELETE FROM sync_items WHERE key=? AND mid=?", (e.key, mid), commit=True)
        ok.append(mid)
    return jr({"ok": ok, "fail": fail})



@app.get("/library")
def library_page():
    return render_template("library.html")


@app.get("/api/diag")
@api
def diag():
    """Kiem tra khoa bi mat, database, phien dang nhap. Chi doc, khong sua gi."""
    issues, info = [], {}
    env_secret = bool(os.environ.get("LOCKETCAC_SECRET"))
    info["secret"] = "bien moi truong" if env_secret else "file data/secret.key"
    if not env_secret:
        issues.append("Chua dat LOCKETCAC_SECRET: moi lan deploy lai (data bi xoa) khoa doi, moi nguoi bi dang xuat.")
    info["passcode"] = "tat" if not PASSCODE else ("bien moi truong" if os.environ.get("LOCKETCAC_PASSCODE") else "file data/passcode.txt")
    if PASSCODE and not os.environ.get("LOCKETCAC_PASSCODE"):
        issues.append("Ma khoa dang lay tu file, se doi sau khi deploy lai. Dat LOCKETCAC_PASSCODE de co dinh.")
    info["cookie_secure"] = bool(app.config["SESSION_COOKIE_SECURE"])
    if request.is_secure and not info["cookie_secure"]:
        issues.append("Dang chay HTTPS nhung cookie chua o che do Secure: dat LOCKETCAC_SECURE_COOKIES=1.")
    workers = os.environ.get("WEB_CONCURRENCY", "1")
    info["workers"] = workers
    if workers.isdigit() and int(workers) > 1:
        issues.append("Nhieu worker: hen gio va gioi han dang nhap sai se bi nhan doi. Dung 1 worker + --threads 4.")
    with _db_lock:
        info["sqlite"] = _db.execute("PRAGMA integrity_check").fetchone()[0]
        info["journal"] = _db.execute("PRAGMA journal_mode").fetchone()[0]
    if info["sqlite"] != "ok":
        issues.append("SQLite bao loi toan ven: " + str(info["sqlite"]))
    rows = q("SELECT key, username FROM accounts")
    db_keys = {r["key"] for r in rows}
    files = {p.stem for p in SESSIONS_DIR.glob("*.json")}
    info["accounts"] = len(db_keys)
    miss = sorted(db_keys - files)
    orphan = sorted(files - db_keys)
    if miss:
        issues.append(f"{len(miss)} tai khoan co trong database nhung mat file phien: {', '.join(k[:6] for k in miss)} (can dang nhap lai).")
    if orphan:
        issues.append(f"{len(orphan)} file phien khong co tai khoan trong database (file thua).")
    mine = browser_keys()
    stale = [k for k in mine if k not in db_keys]
    info["trinh_duyet_nay"] = {"so_tai_khoan": len(mine), "active": (session.get("active") or "")[:6]}
    if stale:
        issues.append(f"Trinh duyet nay giu {len(stale)} khoa tai khoan da khong con tren server.")
    posts = q("SELECT file, key FROM posts")
    media = {p.name for p in MEDIA_DIR.glob("*") if p.is_file()}
    lost = [r for r in posts if r["file"] and r["file"] not in media]
    dead = [r for r in posts if r["key"] not in db_keys]
    info["bai_dang"] = len(posts)
    if lost:
        issues.append(f"{len(lost)} bai trong lich su mat file anh/video.")
    if dead:
        issues.append(f"{len(dead)} bai thuoc tai khoan da bi xoa.")
    stuck = q("SELECT COUNT(*) AS n FROM scheduled WHERE status='running'", one=True)["n"]
    if stuck:
        issues.append(f"{stuck} bai hen gio dang o trang thai 'running' (co the bi ket).")
    info["data_dir"] = str(DATA_DIR)
    return jr({"ok": not issues, "issues": issues, "info": info})


@app.errorhandler(404)
def not_found(_):
    return jr({"error": "Không tìm thấy"}, 404)


from flask import send_file  # noqa: E402
# ======================= KY NIEM / SAO LUU / PHIM / NHOM (patch21) =======================
with _db_lock:
    _db.executescript(
        """
        CREATE TABLE IF NOT EXISTS groups(
            key TEXT, id TEXT, name TEXT, uids TEXT, created REAL, PRIMARY KEY(key, id));
        """
    )
    _db.commit()


def _tzoff() -> int:
    try:
        return -max(-840, min(840, int(request.args.get("tz", "0")))) * 60
    except ValueError:
        return 0


def _mem_cond(e):
    """Bo loc dung chung: who=all|mine|friends, uid=<ban>, days=<so ngay gan day>."""
    cond, args = "key=?", [e.key]
    who = request.args.get("who", "all")
    if who == "mine":
        cond += " AND mine=1"
    elif who == "friends":
        cond += " AND mine=0"
    uid = request.args.get("uid", "")
    if uid:
        if not ID_RE.match(uid):
            raise ApiError("Tham số không hợp lệ")
        cond += " AND uid=?"
        args.append(uid)
    days = request.args.get("days", "")
    if days.isdigit() and int(days) > 0:
        cond += " AND ts>=?"
        args.append(time.time() - int(days) * 86400)
    if request.args.get("year", "").isdigit():
        y = int(request.args["year"])
        off = _tzoff()
        a = datetime.datetime(y, 1, 1).replace(tzinfo=datetime.timezone.utc).timestamp() - off
        b = datetime.datetime(y + 1, 1, 1).replace(tzinfo=datetime.timezone.utc).timestamp() - off
        cond += " AND ts>=? AND ts<?"
        args += [a, b]
    return cond, args


def _local(ts: float, off: int) -> datetime.datetime:
    return datetime.datetime.fromtimestamp(ts + off, datetime.timezone.utc)


def _item(r) -> dict:
    return {"id": r["mid"], "uid": r["uid"], "name": r["name"], "image": r["thumb"], "video": r["video"],
            "caption": r["caption"], "ts": r["ts"], "mine": bool(r["mine"])}


@app.get("/api/memories/onthisday")
@api
def mem_onthisday():
    e = get_entry()
    off = _tzoff()
    now = _local(time.time(), off)
    rows = q("SELECT mid,uid,name,thumb,video,caption,ts,mine FROM sync_items WHERE key=? AND ts>0 ORDER BY ts DESC", (e.key,))
    out = []
    for r in rows:
        d = _local(r["ts"], off)
        if d.year != now.year and d.month == now.month and d.day == now.day:
            out.append(_item(r))
    return jr({"items": out[:200], "date": now.strftime("%d/%m")})


@app.get("/api/memories/people")
@api
def mem_people():
    e = get_entry()
    rows = q("SELECT uid, MAX(name) AS name, COUNT(*) AS n, MAX(mine) AS mine FROM sync_items WHERE key=? GROUP BY uid ORDER BY n DESC", (e.key,))
    return jr({"items": [{"uid": r["uid"], "name": ("Tôi" if r["mine"] else (r["name"] or "Bạn bè")), "count": r["n"]} for r in rows]})


@app.get("/api/memories/pick")
@api
def mem_pick():
    e = get_entry()
    cond, args = _mem_cond(e)
    try:
        lim = max(1, min(int(request.args.get("limit", "20")), 60))
    except ValueError:
        lim = 20
    rows = q(f"SELECT mid,uid,name,thumb,video,caption,ts,mine FROM sync_items WHERE {cond} AND thumb<>'' ORDER BY ts ASC", tuple(args))
    total = len(rows)
    if total > lim:
        rows = [rows[int(i * (total - 1) / (lim - 1))] for i in range(lim)] if lim > 1 else [rows[0]]
    return jr({"items": [_item(r) for r in rows], "total": total})


@app.get("/api/memories/wrapped")
@api
def mem_wrapped():
    e = get_entry()
    off = _tzoff()
    period = request.args.get("period", "year")
    now = _local(time.time(), off)
    if period == "month":
        try:
            y, m = [int(x) for x in request.args.get("ym", now.strftime("%Y-%m")).split("-")]
        except ValueError:
            raise ApiError("Tham số không hợp lệ")
        a = datetime.datetime(y, m, 1)
        b = datetime.datetime(y + (m == 12), (m % 12) + 1, 1)
        label = f"Tháng {m}/{y}"
    else:
        try:
            y = int(request.args.get("y", now.year))
        except ValueError:
            raise ApiError("Tham số không hợp lệ")
        a, b = datetime.datetime(y, 1, 1), datetime.datetime(y + 1, 1, 1)
        label = f"Năm {y}"
    ta = a.replace(tzinfo=datetime.timezone.utc).timestamp() - off
    tb = b.replace(tzinfo=datetime.timezone.utc).timestamp() - off
    rows = q("SELECT mid,uid,name,thumb,video,caption,ts,mine FROM sync_items WHERE key=? AND ts>=? AND ts<? ORDER BY ts ASC", (e.key, ta, tb))
    mine = [r for r in rows if r["mine"]]
    friends: dict = {}
    for r in rows:
        if not r["mine"]:
            k = r["uid"] or "?"
            c = friends.setdefault(k, {"name": r["name"] or "Bạn bè", "count": 0})
            c["count"] += 1
    top = sorted(friends.values(), key=lambda c: -c["count"])[:5]
    days: dict = {}
    wd = [0] * 7
    hours = [0] * 24
    for r in mine:
        d = _local(r["ts"], off)
        k = d.strftime("%Y-%m-%d")
        days[k] = days.get(k, 0) + 1
        wd[d.weekday()] += 1
        hours[d.hour] += 1
    longest = cur = 0
    prev = None
    for k in sorted(days):
        d = datetime.date.fromisoformat(k)
        cur = cur + 1 if prev and (d - prev).days == 1 else 1
        longest = max(longest, cur)
        prev = d
    best = max(days.items(), key=lambda kv: kv[1]) if days else None
    if period == "month":
        n = (b - a).days
        series = [{"label": str(i + 1), "count": days.get((a + datetime.timedelta(days=i)).strftime("%Y-%m-%d"), 0)} for i in range(n)]
    else:
        series = [{"label": f"T{i + 1}", "count": sum(v for k, v in days.items() if k.startswith(f"{y}-{i + 1:02d}"))} for i in range(12)]
    pics = [r for r in mine if r["thumb"]]
    ids = [pics[int(i * (len(pics) - 1) / 3)]["mid"] for i in range(4)] if len(pics) >= 4 else [r["mid"] for r in pics]
    return jr({"label": label, "period": period, "total": len(rows), "mine": len(mine), "friends_posts": len(rows) - len(mine),
               "videos": sum(1 for r in mine if r["video"]), "active_days": len(days), "longest_streak": longest,
               "best_day": ({"date": best[0], "count": best[1]} if best else None), "top_friends": top, "series": series,
               "weekday": wd, "top_hour": (hours.index(max(hours)) if mine else None), "sample_ids": ids})


@app.get("/api/memories/months")
@api
def mem_months():
    e = get_entry()
    off = _tzoff()
    c: dict = {}
    for r in q("SELECT ts FROM sync_items WHERE key=? AND ts>0", (e.key,)):
        k = _local(r["ts"], off).strftime("%Y-%m")
        c[k] = c.get(k, 0) + 1
    return jr({"items": [{"ym": k, "count": v} for k, v in sorted(c.items(), reverse=True)]})


# ---------- nhom nguoi nhan ----------
@app.get("/api/groups")
@api
def groups_list():
    e = get_entry()
    rows = q("SELECT id,name,uids FROM groups WHERE key=? ORDER BY created", (e.key,))
    return jr({"items": [{"id": r["id"], "name": r["name"], "uids": json.loads(r["uids"] or "[]")} for r in rows]})


@app.post("/api/groups")
@api
def groups_save():
    e = get_entry()
    d = body()
    name = str(d.get("name", "")).strip()[:30]
    uids = d.get("uids")
    if not name or not isinstance(uids, list) or not 1 <= len(uids) <= 500 or not all(isinstance(u, str) and ID_RE.match(u) for u in uids):
        raise ApiError("Tên nhóm hoặc danh sách thành viên không hợp lệ")
    n = q("SELECT COUNT(*) AS n FROM groups WHERE key=?", (e.key,), one=True)["n"]
    gid = str(d.get("id") or "")
    if not gid or not ID_RE.match(gid):
        if n >= 20:
            raise ApiError("Tối đa 20 nhóm")
        gid = uuid.uuid4().hex[:12]
    q("INSERT OR REPLACE INTO groups(key,id,name,uids,created) VALUES(?,?,?,?,?)", (e.key, gid, name, json.dumps(uids), time.time()), commit=True)
    return jr({"ok": True, "id": gid})


@app.post("/api/groups/delete")
@api
def groups_delete():
    e = get_entry()
    gid = str(body().get("id", ""))
    q("DELETE FROM groups WHERE key=? AND id=?", (e.key, gid), commit=True)
    return jr({"ok": True})


# ---------- sao luu ZIP ----------
_FILE_CAP = 80_000_000
_PART_CAP = 400_000_000


def _host_ok(url: str) -> bool:
    u = urllib.parse.urlparse(url or "")
    h = u.hostname or ""
    return u.scheme == "https" and any(h == x or h.endswith("." + x) for x in _DL_HOSTS)


def _fetch_to(url: str, dest: str, cap: int = _FILE_CAP) -> bool:
    if not _host_ok(url):
        return False
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=25) as r, open(dest, "wb") as f:
            tot = 0
            while True:
                b = r.read(65536)
                if not b:
                    break
                tot += len(b)
                if tot > cap:
                    return False
                f.write(b)
        return True
    except Exception:  # noqa: BLE001
        return False


def _safe_name(s_: str) -> str:
    return re.sub(r"[^\w\-]+", "_", s_ or "", flags=re.UNICODE).strip("_")[:24] or "ban"


@app.get("/api/backup/plan")
@api
def backup_plan():
    e = get_entry()
    cond, args = _mem_cond(e)
    r = q(f"SELECT COUNT(*) AS n, SUM(CASE WHEN video<>'' THEN 1 ELSE 0 END) AS v FROM sync_items WHERE {cond}", tuple(args), one=True)
    return jr({"total": int(r["n"] or 0), "videos": int(r["v"] or 0), "size": 60})


@app.get("/api/backup.zip")
@api
def backup_zip():
    import zipfile
    from concurrent.futures import ThreadPoolExecutor
    e = get_entry()
    cond, args = _mem_cond(e)
    try:
        size = max(10, min(int(request.args.get("size", "60")), 100))
        part = max(0, int(request.args.get("part", "0")))
    except ValueError:
        raise ApiError("Tham số không hợp lệ")
    rows = q(f"SELECT mid,uid,name,thumb,video,caption,ts,mine FROM sync_items WHERE {cond} ORDER BY ts DESC LIMIT ? OFFSET ?", tuple(args) + (size, part * size))
    if not rows:
        raise ApiError("Không có gì để sao lưu ở phần này", 404)
    off = _tzoff()
    tdir = tempfile.mkdtemp(prefix="bk_", dir=str(DATA_DIR))
    jobs = []
    for r in rows:
        stamp = _local(r["ts"] or 0, off).strftime("%Y-%m-%d_%H%M%S")
        base = f"{stamp}_{_safe_name('Toi' if r['mine'] else r['name'])}_{r['mid'][:8]}"
        if r["thumb"]:
            jobs.append((r, base + ".jpg", r["thumb"]))
        if r["video"]:
            jobs.append((r, base + ".mp4", r["video"]))

    def work(j):
        p = str(Path(tdir) / uuid.uuid4().hex)
        return (j[1], p if _fetch_to(j[2], p) else None, j[0])

    with ThreadPoolExecutor(4) as ex:
        got = list(ex.map(work, jobs))
    zpath = str(Path(tdir) / "out.zip")
    total = 0
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_STORED) as zf:
        lines = ["file,ngay,nguoi,caption"]
        for name, p, r in got:
            if not p:
                continue
            total += Path(p).stat().st_size
            if total > _PART_CAP:
                break
            zf.write(p, name)
            lines.append('"%s","%s","%s","%s"' % (name, _local(r["ts"] or 0, off).strftime("%d/%m/%Y %H:%M"), ("Tôi" if r["mine"] else (r["name"] or "")).replace('"', "'"), (r["caption"] or "").replace('"', "'").replace("\n", " ")))
        zf.writestr("danh-sach.csv", "﻿" + "\n".join(lines))
    for _n, p, _r in got:
        if p:
            Path(p).unlink(missing_ok=True)

    def gen():
        try:
            with open(zpath, "rb") as f:
                while True:
                    b = f.read(262144)
                    if not b:
                        break
                    yield b
        finally:
            shutil.rmtree(tdir, ignore_errors=True)

    resp = Response(gen(), mimetype="application/zip")
    resp.headers["Content-Length"] = str(Path(zpath).stat().st_size)
    resp.headers["Content-Disposition"] = f'attachment; filename="lockcoc-sao-luu-{part + 1}.zip"'
    return resp


# ---------- phim ky niem ----------
_film_jobs: dict = {}
_FILM_DIR = DATA_DIR / "film"


def _film_worker(e, job: dict, items: list, per: float, audio_url: str) -> None:
    exe = ffmpeg_exe()
    tdir = tempfile.mkdtemp(prefix="film_", dir=str(DATA_DIR))
    try:
        if exe is None:
            raise ApiError("Server thiếu ffmpeg để dựng phim.", 500)
        imgs = []
        for i, it in enumerate(items):
            job["phase"] = f"Đang tải ảnh {i + 1}/{len(items)}"
            p = str(Path(tdir) / f"i{i}.img")
            if _fetch_to(it["thumb"], p, 30_000_000):
                imgs.append(p)
        if len(imgs) < 2:
            raise ApiError("Cần ít nhất 2 ảnh tải được để dựng phim.", 400)
        audio = None
        if audio_url:
            try:
                audio = download_preview(audio_url, tdir)
            except ApiError:
                audio = None
        T = 0.5
        n = len(imgs)
        W_, H_ = 540, 960
        cmd = [exe, "-y"]
        for p in imgs:
            cmd += ["-loop", "1", "-framerate", "25", "-t", f"{per + T:.2f}", "-i", p]
        if audio:
            cmd += ["-i", audio]
        parts = []
        for i in range(n):
            x = f"(iw-{W_})*t/{per + T:.2f}" if i % 2 == 0 else f"(iw-{W_})*(1-t/{per + T:.2f})"
            parts.append(f"[{i}:v]scale={W_ * 1.18:.0f}:{H_ * 1.18:.0f}:force_original_aspect_ratio=increase,crop={W_}:{H_}:x='{x}':y='(ih-{H_})/2',setsar=1,fps=25,format=yuv420p[v{i}]")
        last = "v0"
        for i in range(1, n):
            parts.append(f"[{last}][v{i}]xfade=transition=fade:duration={T}:offset={i * per:.2f}[x{i}]")
            last = f"x{i}"
        total = n * per
        parts.append(f"[{last}]trim=0:{total:.2f},fade=t=in:st=0:d=0.5,fade=t=out:st={total - 0.7:.2f}:d=0.7[vout]")
        out = str(_FILM_DIR / f"{job['id']}.mp4")
        _FILM_DIR.mkdir(parents=True, exist_ok=True)
        cmd += ["-filter_complex", ";".join(parts), "-map", "[vout]"]
        if audio:
            cmd += ["-map", f"{n}:a:0", "-af", f"afade=t=out:st={max(total - 1.5, 0):.1f}:d=1.5", "-c:a", "aac", "-b:a", "128k"]
        cmd += ["-t", f"{total:.2f}", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-movflags", "+faststart", out]
        job["phase"] = "Đang dựng phim"
        try:
            proc = subprocess.run(cmd, capture_output=True, timeout=280)
        except subprocess.TimeoutExpired:
            raise ApiError("Dựng phim quá lâu, thử ít ảnh hơn.", 504)
        if proc.returncode != 0 or not Path(out).exists():
            app.logger.error("ffmpeg film loi: %s", proc.stderr[-900:].decode("utf-8", "ignore"))
            raise ApiError("Không dựng được phim từ các ảnh này.", 500)
        thumb = str(_FILM_DIR / f"{job['id']}.jpg")
        subprocess.run([exe, "-y", "-i", out, "-frames:v", "1", thumb], capture_output=True, timeout=30)
        job["state"] = "done"
        job["phase"] = "Hoàn tất"
        job["seconds"] = round(total)
    except ApiError as ex:
        job["state"], job["error"] = "error", ex.message
    except Exception:  # noqa: BLE001
        app.logger.error("Film loi:\n%s", traceback.format_exc())
        job["state"], job["error"] = "error", "Dựng phim bị lỗi, thử lại sau."
    finally:
        shutil.rmtree(tdir, ignore_errors=True)


@app.post("/api/film/start")
@api
def film_start():
    e = get_entry()
    d = body()
    ids = d.get("ids")
    if not isinstance(ids, list) or not 2 <= len(ids) <= 20 or not all(isinstance(i, str) and ID_RE.match(i) for i in ids):
        raise ApiError("Chọn từ 2 đến 20 ảnh")
    items = []
    for mid in ids:
        r = q("SELECT thumb FROM sync_items WHERE key=? AND mid=?", (e.key, mid), one=True)
        if r and r["thumb"]:
            items.append({"thumb": r["thumb"]})
    per = max(1.2, min(float(d.get("per", 2.0) or 2.0), 4.0))
    with _sync_lock:
        old = _film_jobs.get(e.key)
        if old and old.get("state") == "running" and time.time() - old.get("started", 0) < 400:
            return jr(old)
        job = {"id": uuid.uuid4().hex[:16], "state": "running", "phase": "Bắt đầu", "started": time.time(), "error": ""}
        _film_jobs[e.key] = job
    if _FILM_DIR.exists():
        for f in _FILM_DIR.glob("*"):
            if time.time() - f.stat().st_mtime > 7200:
                f.unlink(missing_ok=True)
    threading.Thread(target=_film_worker, args=(e, job, items, per, str(d.get("music_url") or "")), daemon=True).start()
    return jr(job)


@app.get("/api/film/status")
@api
def film_status():
    e = get_entry()
    return jr(_film_jobs.get(e.key) or {"state": "idle"})


@app.get("/api/film/file/<fid>")
@api
def film_file(fid):
    e = get_entry()
    job = _film_jobs.get(e.key)
    if not job or job.get("id") != fid or job.get("state") != "done" or not re.match(r"^[0-9a-f]{16}$", fid):
        raise ApiError("Không tìm thấy phim", 404)
    p = _FILM_DIR / f"{fid}.mp4"
    if not p.exists():
        raise ApiError("Phim đã bị xoá, hãy dựng lại", 404)
    resp = send_file(str(p), mimetype="video/mp4", conditional=True)
    if request.args.get("dl"):
        resp.headers["Content-Disposition"] = 'attachment; filename="lockcoc-phim-ky-niem.mp4"'
    return resp


@app.post("/api/film/post")
@api
def film_post():
    e = get_entry()
    d = body()
    job = _film_jobs.get(e.key)
    if not job or job.get("id") != str(d.get("id")) or job.get("state") != "done":
        raise ApiError("Phim chưa sẵn sàng", 400)
    mp4, jpg = _FILM_DIR / f"{job['id']}.mp4", _FILM_DIR / f"{job['id']}.jpg"
    if not mp4.exists() or not jpg.exists():
        raise ApiError("Phim đã bị xoá, hãy dựng lại", 404)
    cap = str(d.get("caption") or "").strip()[:300]
    meta = {"caption": cap} if cap else {}
    pid = perform_post(e, meta, str(jpg), str(mp4))
    return jr({"ok": True, "id": pid})


@app.get("/memories")
def memories_page():
    return render_template("memories.html")


start_scheduler()

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    print(f"LockCOC chạy tại http://{host}:{port}  ·  Developed & founded by TRISTAN.faketriss")
    if PASSCODE:
        print("=" * 56)
        print(f"  MÃ KHOÁ APP: {PASSCODE}")
        print("  (nhập mã này khi mở app; đổi bằng biến LOCKETCAC_PASSCODE,")
        print("   tắt bằng LOCKETCAC_PASSCODE=off)")
        print("=" * 56)
    app.run(host=host, port=port, threaded=True, debug=False)
