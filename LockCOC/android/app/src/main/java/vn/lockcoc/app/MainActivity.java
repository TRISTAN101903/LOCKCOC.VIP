package vn.lockcoc.app;

import android.Manifest;
import android.app.DownloadManager;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Vỏ WebView mở server LockCOC; xin quyền camera/mic và hỗ trợ chọn ảnh/video. */
public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private PermissionRequest pendingWebPerm;
    private static final int REQ_PERM = 11, REQ_FILE = 12;

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

        final String host = Uri.parse(BuildConfig.APP_URL).getHost();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (host != null && host.equals(u.getHost())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, u)); // link ngoài mở bằng trình duyệt
                return true;
            }
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
    protected void onPause() {
        super.onPause();
        try {
            CookieManager cm = CookieManager.getInstance();
            cm.flush();
            String c = cm.getCookie(BuildConfig.APP_URL);
            getSharedPreferences("w", MODE_PRIVATE).edit().putString("cookie", c == null ? "" : c).apply();
            LockWidget.refreshAll(this);
        } catch (Throwable t) { /* widget chỉ là phần phụ */ }
    }
    @Override
    public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
