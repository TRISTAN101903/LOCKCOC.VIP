package vn.lockcoc.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Widget màn hình chính: hiện khoảnh khắc mới nhất của bạn bè, bấm để mở LockCOC. */
public class LockWidget extends AppWidgetProvider {
    private static final int MAX_SIDE = 400;

    /** Yêu cầu mọi widget đang có cập nhật lại (gọi khi rời app). */
    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, LockWidget.class));
        if (ids == null || ids.length == 0) return;
        Intent i = new Intent(c, LockWidget.class);
        i.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        c.sendBroadcast(i);
    }

    @Override
    public void onUpdate(final Context ctx, final AppWidgetManager mgr, final int[] ids) {
        // vẽ ngay khung cơ bản + bấm để mở app, rồi mới tải dữ liệu
        final SharedPreferences sp = ctx.getSharedPreferences("w", Context.MODE_PRIVATE);
        if (!sp.getBoolean("has_img", false)) {
            for (int id : ids) mgr.updateAppWidget(id, base(ctx, null, null, null, "Đang tải..."));
        }
        final PendingResult pr = goAsync();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    load(ctx, mgr, ids);
                } catch (Throwable t) {
                    if (!sp.getBoolean("has_img", false)) {
                        for (int id : ids) mgr.updateAppWidget(id, base(ctx, null, null, null, "Chưa tải được, bấm để mở app"));
                    }
                } finally {
                    pr.finish();
                }
            }
        }).start();
    }

    private static RemoteViews base(Context ctx, Bitmap img, String who, String cap, String msg) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget);
        Intent open = new Intent(ctx, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        rv.setOnClickPendingIntent(R.id.w_root, pi);
        if (img != null) {
            rv.setImageViewBitmap(R.id.w_img, img);
            rv.setViewVisibility(R.id.w_img, View.VISIBLE);
            rv.setViewVisibility(R.id.w_msg, View.GONE);
            rv.setViewVisibility(R.id.w_shade, View.VISIBLE);
            rv.setTextViewText(R.id.w_who, who == null ? "" : who);
            rv.setTextViewText(R.id.w_cap, cap == null ? "" : cap);
            rv.setViewVisibility(R.id.w_cap, cap == null || cap.isEmpty() ? View.GONE : View.VISIBLE);
        } else {
            rv.setViewVisibility(R.id.w_img, View.GONE);
            rv.setViewVisibility(R.id.w_shade, View.GONE);
            rv.setViewVisibility(R.id.w_msg, View.VISIBLE);
            rv.setTextViewText(R.id.w_msg, msg == null ? "" : msg);
        }
        return rv;
    }

    private void load(Context ctx, AppWidgetManager mgr, int[] ids) throws Exception {
        SharedPreferences sp = ctx.getSharedPreferences("w", Context.MODE_PRIVATE);
        String cookie = sp.getString("cookie", "");
        if (cookie == null || cookie.isEmpty()) {
            push(ctx, mgr, ids, base(ctx, null, null, null, "Mở LockCOC để đăng nhập"));
            return;
        }
        String root = BuildConfig.APP_URL;
        while (root.endsWith("/")) root = root.substring(0, root.length() - 1);
        String host = Uri.parse(root).getHost();

        HttpURLConnection c = open(root + "/api/feed", cookie);
        int code = c.getResponseCode();
        if (code == 401 || code == 403) {
            push(ctx, mgr, ids, base(ctx, null, null, null, "Mở LockCOC để mở khóa"));
            return;
        }
        if (code != 200) {
            if (!sp.getBoolean("has_img", false)) push(ctx, mgr, ids, base(ctx, null, null, null, "Máy chủ đang bận, thử lại sau"));
            return;
        }
        JSONObject o = new JSONObject(new String(readAll(c.getInputStream(), 2 * 1024 * 1024), "UTF-8"));
        JSONArray items = o.optJSONArray("items");
        JSONObject best = null;
        double bestTs = -1;
        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject m = items.optJSONObject(i);
                if (m == null) continue;
                String im = m.optString("image", "");
                if (im.isEmpty()) continue;
                double ts = m.optDouble("ts", 0);
                if (best == null || ts > bestTs) { best = m; bestTs = ts; }
            }
        }
        if (best == null) {
            push(ctx, mgr, ids, base(ctx, null, null, null, "Chưa có khoảnh khắc nào"));
            return;
        }
        String url = best.optString("image", "");
        if (url.startsWith("/")) url = root + url;
        if (!url.startsWith("https://")) return;
        String uh = Uri.parse(url).getHost();
        HttpURLConnection ic = open(url, host != null && host.equals(uh) ? cookie : null);
        if (ic.getResponseCode() != 200) return;
        byte[] raw = readAll(ic.getInputStream(), 6 * 1024 * 1024);
        Bitmap bmp = decode(raw);
        if (bmp == null) return;

        JSONObject u = best.optJSONObject("user");
        String who = "";
        if (u != null) {
            who = u.optString("first_name", "");
            if (who.isEmpty()) who = u.optString("username", "");
        }
        String cap = best.optString("caption", "");
        push(ctx, mgr, ids, base(ctx, bmp, who, cap, null));
        sp.edit().putBoolean("has_img", true).apply();
    }

    private static void push(Context ctx, AppWidgetManager mgr, int[] ids, RemoteViews rv) {
        for (int id : ids) mgr.updateAppWidget(id, rv);
    }

    private static HttpURLConnection open(String url, String cookie) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(4000);
        c.setReadTimeout(5000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("Accept", "*/*");
        if (cookie != null) c.setRequestProperty("Cookie", cookie);
        return c;
    }

    private static byte[] readAll(InputStream in, int cap) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        try {
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                if (out.size() > cap) throw new Exception("too big");
            }
        } finally {
            in.close();
        }
        return out.toByteArray();
    }

    private static Bitmap decode(byte[] raw) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(raw, 0, raw.length, o);
        int s = 1;
        while (o.outWidth / s > MAX_SIDE * 2 || o.outHeight / s > MAX_SIDE * 2) s *= 2;
        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = s;
        Bitmap b = BitmapFactory.decodeByteArray(raw, 0, raw.length, o2);
        if (b == null) return null;
        int w = b.getWidth(), h = b.getHeight();
        float k = Math.min(1f, (float) MAX_SIDE / Math.max(w, h));
        if (k < 1f) b = Bitmap.createScaledBitmap(b, Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), true);
        return b;
    }
}
