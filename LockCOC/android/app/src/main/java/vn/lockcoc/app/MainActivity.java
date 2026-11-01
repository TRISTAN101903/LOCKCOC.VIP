package vn.lockcoc.app;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/** Vỏ WebView mở server LockCOC: camera/mic, chọn nhiều ảnh/video, tải file, lưu vào thư viện máy, tự thử lại khi server đang ngủ. */
public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private PermissionRequest pendingWebPerm;
    private static final int REQ_PERM = 11, REQ_FILE = 12;

    private static final String ERROR_HTML =
        "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
        + "<meta http-equiv='refresh' content='6;url=" + BuildConfig.APP_URL + "'>"
        + "<style>body{margin:0;background:#0B0A09;color:#f6f1e6;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}"
        + ".b{padding:24px}h1{font-size:22px;margin:0 0 10px}p{opacity:.7;margin:0 0 20px;line-height:1.5}"
        + "a{display:inline-block;background:#ffc828;color:#141008;font-weight:700;padding:12px 26px;border-radius:30px;text-decoration:none}"
        + ".d{width:44px;height:44px;border:4px solid #3a3326;border-top-color:#ffc828;border-radius:50%;margin:0 auto 18px;animation:s 1s linear infinite}"
        + "@keyframes s{to{transform:rotate(360deg)}}</style></head><body><div class='b'><div class='d'></div>"
        + "<h1>Đang kết nối LockCOC…</h1><p>Máy chủ có thể đang khởi động (mất tới 1 phút) hoặc bạn đang mất mạng.<br>Tự thử lại sau vài giây.</p>"
        + "<a href='" + BuildConfig.APP_URL + "'>Thử lại ngay</a></div></body></html>";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0B0A09"));
        setContentView(web);
        ensureNativePermissions();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setGeolocationEnabled(true);
        s.setUserAgentString(s.getUserAgentString() + " LockCOCApp/" + BuildConfig.VERSION_NAME);

        final String host = Uri.parse(BuildConfig.APP_URL).getHost();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (host != null && host.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { /* bo qua */ }
                return true; // link ngoài mở bằng trình duyệt
            }
            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) showError();
            }
            @Override
            public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse res) {
                if (r.isForMainFrame() && res.getStatusCode() >= 500) showError();
            }
        });
        web.setDownloadListener((url, ua, cd, mime, len) -> {
            try {
                Uri u = Uri.parse(url);
                if (host == null || !host.equals(u.getHost())) { startActivity(new Intent(Intent.ACTION_VIEW, u)); return; }
                String name = URLUtil.guessFileName(url, cd, mime);
                DownloadManager.Request r = new DownloadManager.Request(u);
                String ck = CookieManager.getInstance().getCookie(url);
                if (ck != null) r.addRequestHeader("Cookie", ck);
                if (mime != null) r.setMimeType(mime);
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
                Toast.makeText(this, "Đang tải " + name, Toast.LENGTH_SHORT).show();
            } catch (Exception e) { Toast.makeText(this, "Không tải được file", Toast.LENGTH_SHORT).show(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest req) {
                runOnUiThread(() -> {
                    if (hasNative()) req.grant(req.getResources());
                    else { pendingWebPerm = req; ensureNativePermissions(); }
                });
            }
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) { cb.invoke(origin, false, false); }
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try { startActivityForResult(p.createIntent(), REQ_FILE); }
                catch (Exception e) { fileCb = null; return false; }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "LockCOCNative");
        web.loadUrl(BuildConfig.APP_URL);
    }

    private void showError() {
        web.loadDataWithBaseURL(BuildConfig.APP_URL, ERROR_HTML, "text/html", "utf-8", null);
    }

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

    private boolean hasNative() {
        return checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
            && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }
    private void ensureNativePermissions() {
        if (!hasNative()) requestPermissions(new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, REQ_PERM);
    }
    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (pendingWebPerm != null) {
            if (hasNative()) pendingWebPerm.grant(pendingWebPerm.getResources()); else pendingWebPerm.deny();
            pendingWebPerm = null;
            web.reload();
        }
    }
    @Override
    protected void onActivityResult(int code, int res, Intent data) {
        super.onActivityResult(code, res, data);
        if (code == REQ_FILE && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCb = null;
        }
    }
    @Override
    protected void onPause() { super.onPause(); if (web != null) web.onPause(); }
    @Override
    protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override
    public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
