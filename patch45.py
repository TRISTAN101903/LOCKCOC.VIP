import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
def rd(p): return open(P(p), encoding="utf-8").read()
def w(p, s): open(P(p), "w", encoding="utf-8").write(s)
def sub(s, old, new, what):
    if old not in s: raise SystemExit("[loi] khong thay doan can sua: " + what)
    return s.replace(old, new, 1)
T = {'devsync.js': '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', 'devsync.css': 'eNp1UkFu2zAQvPcVCxQB7FRUJDWKBeo1lEhRi1CkQNK2kqLnXgv01GN/0LuPLfoP/6SUZNlOmxwEULuLmZ2ZvbuF31+Ph29aQnU8fAff/vkJOzwevmjofv14gtu7dzF3pGEVfILeOPRoNIUGB8FLsChbTyHN+qEEb3oKNVP1SujdyrFGEGYFI6id8CR0I0j6YQ0fpvl1Cc+hxcVA4WNSwh65byncJyNUK2bg+a8ylgtLLOO4dRTy5GapBeo47wdwRiEHKyu2yvI8Wr44ywNNxepHac1Wc3oaSaJ0E6VZFG9CuzbKBKD3TVMXWVECR9cr9kRBWgwSw7sWBL3oAnUttBc2FBnnqCWFZIbn1vSkQeXHlSq1tauHSeHnyTzXCuGDff8gSxb8SieFHRvIorlIdm0JZidso8yehHG29ebMSSrjvekoZJPpM0OLeiTomJWop60aoz1x+CwoxIUVXUDsWY0+wMWbkJUYPGEKpb6IUqjFeYs0vl/AK2YD9tJ4eCWRufafzddJpNn6IopCi5wLfc2A1wZVytSPlzNIkzHy04UkL6nOuXnL9HKe0yiE+N1C0TkZCF64kk+2vOZEh/rKiGwcOy1qhgjGhzX7NwIt5lT+Av8rGdQ='}
def D(k): return zlib.decompress(base64.b64decode(T[k])).decode("utf-8")
if os.path.exists(P("static/js/devsync.js")): raise SystemExit("[loi] da ap dung patch45 roi")
if not os.path.exists(P("static/js/cam28.js")): raise SystemExit("[loi] can cai cac patch truoc (patch31 tro len)")
w("static/js/devsync.js", D("devsync.js"))
w("static/polish.css", rd("static/polish.css") + "\n" + D("devsync.css"))
h = rd("templates/index.html")
tag = '  <script src="/static/js/devsync.js"></script>\n'
if '/static/js/orient.js"></script>' in h: h = h.replace('  <script src="/static/js/orient.js"></script>', '  <script src="/static/js/orient.js"></script>\n' + tag.rstrip("\n"), 1)
else: h = sub(h, "</body>", tag + "</body>", "index body")
w("templates/index.html", h)
# app Android: luu thang vao Anh/Phim (can build lai APK)
jp = "android/app/src/main/java/vn/lockcoc/app/MainActivity.java"
if os.path.exists(P(jp)):
    j = rd(jp)
    if "LockCOCNative" not in j:
        j = sub(j, "import android.Manifest;", "import android.Manifest;\nimport android.app.DownloadManager;\nimport android.os.Environment;\nimport android.webkit.CookieManager;\nimport android.webkit.JavascriptInterface;", "imports")
        bridge = '''
    /** Cầu nối cho trang web: lưu ảnh/video vào thư viện máy (Ảnh, Phim → LockCOC). */
    private class Bridge {
        @JavascriptInterface
        public void save(String url, String name, String mime) {
            try {
                Uri u = Uri.parse(url);
                String h = Uri.parse(BuildConfig.APP_URL).getHost();
                if (h == null || !h.equals(u.getHost())) return;
                DownloadManager.Request r = new DownloadManager.Request(u);
                String ck = CookieManager.getInstance().getCookie(url);
                if (ck != null) r.addRequestHeader("Cookie", ck);
                r.setMimeType(mime);
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_HIDDEN);
                String dir = mime != null && mime.startsWith("video") ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES;
                r.setDestinationInExternalPublicDir(dir, "LockCOC/" + name.replaceAll("[^A-Za-z0-9._-]", "_"));
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
            } catch (Exception e) { /* bo qua */ }
        }
    }
'''
        j = sub(j, "    private boolean hasNative() {", bridge + "\n    private boolean hasNative() {", "bridge")
        j = sub(j, "        web.loadUrl(BuildConfig.APP_URL);", "        web.addJavascriptInterface(new Bridge(), \"LockCOCNative\");\n        web.loadUrl(BuildConfig.APP_URL);", "loadUrl")
        w(jp, j)
    mp = "android/app/src/main/AndroidManifest.xml"
    m = rd(mp)
    if "DOWNLOAD_WITHOUT_NOTIFICATION" not in m:
        m = sub(m, '    <uses-permission android:name="android.permission.VIBRATE" />', '    <uses-permission android:name="android.permission.VIBRATE" />\n    <uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />', "manifest")
        w(mp, m)
    print("[ok] da them cau noi Android (can build lai APK de co tinh nang luu thang vao may)")
print("[ok] patch45 xong: dong bo thu vien may (luu ve may + dua tu may len)")
