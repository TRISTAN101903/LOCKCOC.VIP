import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."

def rd(path):
    return open(os.path.join(R, path), encoding="utf-8").read()

def wr(path, text):
    open(os.path.join(R, path), "w", encoding="utf-8").write(text)

# ===== 1) SERVER: khung VIP cho video =====
a = rd("app.py")
if "def vip_video(" not in a:
    VV = r"""
def _vip_overlay_png(path, S=720):
    '''Khung VIP (vien vang + logo, o giua trong suot) cho video vuong SxS.'''
    from PIL import Image, ImageDraw, ImageOps
    SS = 3
    N = S * SS
    k = N / 720.0
    px, py, side = round(N * 0.09), round(N * 0.05), round(N * 0.82)
    gold_g = ImageOps.colorize(Image.linear_gradient("L").resize((N, N)), black="#fbe3a0", white="#b9822a", mid="#e2b04a").convert("RGBA")
    base = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    # nen toi bao quanh o video (bo goc o giua)
    bgm = Image.new("L", (N, N), 0)
    ImageDraw.Draw(bgm).rectangle((px, py, px + side, py + side), fill=255)
    ImageDraw.Draw(bgm).rounded_rectangle((px, py, px + side, py + side), radius=round(N * 0.035), fill=0)
    base.paste(Image.new("RGBA", (N, N), (15, 13, 9, 255)), (0, 0), bgm)
    # dia logo toi
    cx, cy = N / 2, py + side + (N - py - side) / 2
    ls = N * 0.12
    u = ls / 512.0
    def P(x, y): return (cx + (x - 256) * u, cy + (y - 256) * u)
    d = ImageDraw.Draw(base)
    c0, c1 = P(256 - 152, 292 - 152), P(256 + 152, 292 + 152)
    d.ellipse((c0[0], c0[1], c1[0], c1[1]), fill=(18, 16, 12, 255))
    m = Image.new("L", (N, N), 0)
    md = ImageDraw.Draw(m)
    md.rounded_rectangle((N * 0.008, N * 0.008, N * 0.992, N * 0.992), radius=round(N * 0.066), outline=255, width=max(2, round(N * 0.012)))
    md.rounded_rectangle((px, py, px + side, py + side), radius=round(N * 0.035), outline=255, width=max(2, round(N * 0.006)))
    a, b = P(226, 62), P(286, 134)
    md.rounded_rectangle((a[0], a[1], b[0], b[1]), radius=30 * u, outline=255, width=max(2, round(14 * u)))
    md.ellipse((c0[0], c0[1], c1[0], c1[1]), outline=255, width=max(2, round(16 * u)))
    r = 82 * u
    ccx, ccy = P(256 + 3, 292)
    md.arc((ccx - r, ccy - r, ccx + r, ccy + r), start=45, end=315, fill=255, width=max(2, round(40 * u)))
    dx, dy = P(259, 292)
    md.ellipse((dx - 17 * u, dy - 17 * u, dx + 17 * u, dy + 17 * u), fill=255)
    base.paste(gold_g, (0, 0), m)
    base.resize((S, S), Image.LANCZOS).save(path)


def vip_video(video: str, tmpdir: str) -> str:
    '''Dong khung thuong hieu LockCOC VIP len video (vuong 720, cat giua nhu khung anh), giu nguyen am thanh.'''
    exe = ffmpeg_exe()
    if exe is None:
        return video
    png = str(Path(tmpdir) / (uuid.uuid4().hex + "_vip.png"))
    dst = str(Path(tmpdir) / (uuid.uuid4().hex + "_vip.mp4"))
    try:
        _vip_overlay_png(png)
        fc = ("color=c=0x0f0d09:s=720x720:r=30[bg];"
              "[0:v]scale=590:590:force_original_aspect_ratio=increase,crop=590:590,setsar=1,fps=30[v];"
              "[bg][v]overlay=65:36:shortest=1[b];[b][1:v]overlay=0:0:shortest=1,format=yuv420p[o]")
        cmd = [exe, "-y", "-i", video, "-loop", "1", "-framerate", "30", "-i", png, "-filter_complex", fc,
               "-map", "[o]", "-map", "0:a?", "-t", str(MAX_VIDEO_SECONDS),
               "-c:v", "libx264", "-preset", "ultrafast", "-crf", "27", "-c:a", "copy", "-movflags", "+faststart", dst]
        proc = subprocess.run(cmd, capture_output=True, timeout=200)
        if proc.returncode == 0 and Path(dst).exists() and Path(dst).stat().st_size > 1000:
            return dst
        app.logger.error("ffmpeg khung VIP loi: %s", proc.stderr[-600:].decode("utf-8", "ignore"))
    except Exception:  # noqa: BLE001
        app.logger.exception("khung VIP video loi")
    return video

"""
    anchor = '@app.get("/sw.js")'
    if anchor not in a: raise SystemExit("[loi] khong thay /sw.js trong app.py")
    a = a.replace(anchor, "# ---------- patch62: khung VIP cho video ----------\n" + VV.strip("\n") + "\n\n\n" + anchor, 1)
    old = "        elif video:\n            video = to_mp4(video, tmp)\n        if run_at:"
    if old not in a: raise SystemExit("[loi] khong thay doan xu ly video trong app.py")
    a = a.replace(old, "        elif video:\n            video = to_mp4(video, tmp)\n        if video and request.form.get(\"vip_frame\") == \"1\":\n            video = vip_video(video, tmp)\n        if run_at:", 1)
    wr("app.py", a)

# ===== 2) JS =====
JS = """
eNqNVs1u20YQvvspRiyQkDFFK0GLAhXUok4dNHBRFFDhi2AYS3Ilbr3aZbhLuW6jUx+gMPoATdBTD0XQq3100PfQG/QROrMkJVKy
nR4kkrvz+823M+uVhoOxhUisN9w7eAILkbPS6ugHA304z0o1g5OX30GSadxKuYZ9sKubv+H2bd7aPqgW5e2bOajbPy1uCTB6df1W
QXz7RoAfr67/sih1/Q7/C416X69ufgPzz9sAnhzs+dNSJVZoBX4AP+8BiCn49jLnego65+ooFVYX0BuNwGtEPXj9GloyY1umQt8v
w3Jx/yaXW3sBFNyWhRpiMAtWwPEJ4LZMzgieM4TJC+F43F4zGStyj+TXycy49c8xIUz5Ev8riyB1wuQY82EzHqHIS8vnJDaiAJ56
Q1hCwmySgc+DjdaUScNpb9n2YMhDCIuNk45101hHEfiCrMNn4A28YNsJlj5e3fwKr0qG9ai9XAiV6otIJiciP3HVH9Vh7NWonGmO
a5sKUfateo02gfpCCVvVtlKlXVSPWJ7LS99mwoTAilk558qaYOjkXEburdIRBsNAvV6PrMGjR0DP6BzjrNBzHPWGtcpd8VcmUJNq
c3wSDFvmTWxQItWJCyJ6VfLicswlTzCXL6X0vUgv+rFOLyEyjmz92CJTQlREPdSe4C+SXM1shsfn6WmIGOe4pUopG0fEbBMT5hWA
pgawou+wTeU2fK5KlTViwbCutomjRIrk3HcVnQrFpKT1jhV00hCnicDBEKzBbcIiYHpoM2cFIvCtTnkXBYRgsaiybitX8EkWd0Ju
kdf79/erKzje7SfIRmwp/m6lkKyH1DMcYb+nvuFIO9zySR45ViYurcVTGxJIkhmDSpsSwYyWoI48dGceBWodWIYUuh8EbeNxxNL0
aIEofCOM5Ypj7g5p1O+meBfLejuLQ7Ro+Y/2uVZozaKM84kpddx2sRfK8MIe8qkuuB8TzyKFNsYilkLNWorL9VsNeNHstYteU77h
XpKJ/F6++4+jaaEvYJIyy/rTkUct7/QxBkyWSDVwBlr02/Y0DohOxFl81H12jcuRyphKeHVsNx25UojEHLtXm2Hbev5aKoRnQWQz
rlozRMX1aalE6ATGQ/d9xsQhM82KS4VWi3kA9UtVk8g1x+5Y2mmSQRfkhzvq3nZ1lpsuSqNpRAOK1usPc6mSFtNyZrMQjzX2xhoW
Cp5WKwgPUO0g18Y6DEmueUbInjk2SmMJOKzBC/z+CqtKAjs8DToNd+qaU22DZgiebxpZft1pg3ZXW7SdHErtuskiMuInDp/DoF3O
KU0mMpKfTQs253iocDa1CF11NwqBEmycump6NQdx4w5/Nc/wCKW8eEG20y2OBY33yhpOnQuGw6St4RPWXjXkP302wA7v5Zmma1E+
u3N2zsTq5h2srv9QGcxWN1fJpuRrdrQJQBV/YPJV1FgXf65LZf328Myw0PcfXe+jHDPrzzlEc95nzohpYOuRbrB1q6ANWt/p9mzR
t3o2k5wafq1ji5JXlZpMjk9Cas87N0K6AL6/ev+Lmnk4BSfH40Zsc0es0NrcFL3TU6LZEeucu7xLyAdmTD55eoqzxKtHChEmnwxO
gw+Nkg+MEZofZo5jFTZY3DVCSN3kbEe5jyFz2Zoya5b//xFj6lxC6K3TCmiibJdr4y+4e9pYzYz13QdWRJ97nQnkKIC0xKPwPBMy
9eN6qxHZYsCyvqn3aoY2k0Whw0EIgvoFXUExiGLB5FY7Jc2G2ngT399X2CY+xj6RSM6KtZJYUIwhfDIYuCmzDDCRvf8ATqoF1Q==
"""
open(os.path.join(R, "static/js/vipauto.js"), "wb").write(zlib.decompress(base64.b64decode("".join(JS.split()))))
h = rd("templates/index.html")
tag = '  <script src="/static/js/vipauto.js"></script>'
if tag not in h:
    anchor = '  <script src="/static/js/aistudio.js"></script>'
    if anchor not in h: anchor = '  <script src="/static/js/fastpost.js"></script>'
    if anchor not in h: raise SystemExit("[loi] khong thay vi tri chen script trong index.html")
    wr("templates/index.html", h.replace(anchor, anchor + "\n" + tag, 1))
c = rd("static/polish.css")
if "/*vvbtn*/" not in c:
    wr("static/polish.css", c + "\n/*vvbtn*/\n.vv-btn{margin-top:8px}\n")

# ===== 3) ANDROID: giu dang nhap sau khi tat app (cookie phai duoc ghi ra dia) =====
mp = os.path.join(R, "android/app/src/main/java/vn/lockcoc/app/MainActivity.java")
if os.path.exists(mp):
    j = open(mp, encoding="utf-8").read()
    ch = False
    if "setAcceptCookie" not in j:
        k = "        s.setDomStorageEnabled(true);"
        if k in j:
            j = j.replace(k, k + "\n        CookieManager.getInstance().setAcceptCookie(true);", 1); ch = True
    if "CookieManager.getInstance().flush()" not in j:
        k = "    protected void onPause() { super.onPause(); if (web != null) web.onPause(); }"
        if k in j:
            j = j.replace(k, "    protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); if (web != null) web.onPause(); }", 1); ch = True
        k2 = "    protected void onStop() {"
        if k2 in j and "flush()" not in j:
            j = j.replace(k2, k2 + " CookieManager.getInstance().flush();", 1); ch = True
    if ch: open(mp, "w", encoding="utf-8").write(j)
print("[ok] patch62 xong: khung VIP cho video, tu ap khung/lam net (bat trong Ho so), APK giu dang nhap 7 ngay")
