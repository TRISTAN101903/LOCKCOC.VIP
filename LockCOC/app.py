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
    sender = first(m, ["sender_id", "sender", "from", "uid"])
    if isinstance(sender, dict):
        sender = first(sender, ["uid", "id"])
    text = first(m, ["text", "body", "message"])
    return {
        "id": first(m, ["id", "message_id"]),
        "sender": sender,
        "mine": bool(my_uid and sender == my_uid),
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


def perform_post(e: Entry, meta: dict, image: str, video: str | None) -> str:
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


@app.get("/api/chat/messages/<other_uid>")
@api
def chat_messages(other_uid):
    if not ID_RE.match(other_uid):
        raise ApiError("UID không hợp lệ")
    e = get_entry()
    with e.lock:
        data = e.client.chat.get_messages(other_user_id=other_uid)
    msgs = [norm_msg(m, e.uid) for m in to_list(data) if isinstance(m, dict)]
    try:
        if msgs and all(m["time"] is not None for m in msgs):
            msgs.sort(key=lambda m: float(m["time"]) if isinstance(m["time"], (int, float)) else str(m["time"]))
    except (TypeError, ValueError):
        pass
    return jr({"items": msgs, "me": e.uid})


@app.post("/api/chat/send")
@api
def chat_send():
    e = get_entry()
    data = body()
    with e.lock:
        e.client.chat.send_message(receiver_uid=need_id(data, "receiver_uid"), text=need(data, "text", 2000))
    return jr({"ok": True})


@app.post("/api/chat/read")
@api
def chat_read():
    e = get_entry()
    with e.lock:
        e.client.chat.mark_as_read(other_user_id=need_id(body(), "other_uid"), send_read_receipt=False)
    return jr({"ok": True})


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
    """Chan doan: in cau truc overlay nhac that trong feed (da che token) de bat chuoc dung dinh dang goc."""
    e = get_entry()
    with e.lock:
        data = e.client.moments.get_latest()
    rows = to_list(data)
    kinds = {}
    hits = []
    for m in rows:
        if not isinstance(m, dict):
            continue
        ovs = m.get("overlays")
        for ov in (ovs if isinstance(ovs, list) else []):
            if isinstance(ov, dict):
                k = f"{ov.get('overlay_type')}|{ov.get('overlay_id')}"
                kinds[k] = kinds.get(k, 0) + 1
        txt = json.dumps(ovs, ensure_ascii=False, default=str).lower()
        if any(w in txt for w in ("music", "spotify", "apple", "song", "track")) and len(hits) < 3:
            hits.append({"overlays": ovs, "keys": sorted(m.keys())})
    out = json.dumps({"scanned": len(rows), "overlay_kinds": kinds, "music_samples": hits}, ensure_ascii=False, indent=1, default=str)
    out = re.sub(r"token=[^&\"\s]+", "token=X", out)
    return Response(out, mimetype="application/json")


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
