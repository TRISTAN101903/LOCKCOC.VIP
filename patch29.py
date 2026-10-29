import os
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
def rd(p): return open(P(p), encoding="utf-8").read()
def w(p, s): open(P(p), "w", encoding="utf-8").write(s)
def sub(s, old, new, what):
    if old not in s: raise SystemExit("[loi] khong thay doan can sua: " + what)
    return s.replace(old, new, 1)

SRV = '''
# ---------- patch29: cai len iPhone bang cau hinh (Web Clip) ----------
@app.get("/ios.mobileconfig")
def ios_profile():
    import plistlib
    host = request.host_url.rstrip("/")
    url = host + "/app"
    icon = (Path(app.static_folder) / "icons" / "apple-touch-icon.png").read_bytes()
    sid = str(uuid.uuid5(uuid.NAMESPACE_URL, host))
    clip = {
        "PayloadType": "com.apple.webClip.managed", "PayloadVersion": 1,
        "PayloadIdentifier": "vip.lockcoc.webclip", "PayloadUUID": str(uuid.uuid5(uuid.NAMESPACE_URL, host + "#clip")).upper(),
        "PayloadDisplayName": "LockCOC", "Label": "LockCOC", "URL": url, "IsRemovable": True,
        "FullScreen": True, "Precomposed": True, "Icon": icon,
    }
    prof = {
        "PayloadType": "Configuration", "PayloadVersion": 1, "PayloadIdentifier": "vip.lockcoc.profile",
        "PayloadUUID": sid.upper(), "PayloadDisplayName": "LockCOC", "PayloadOrganization": "LockCOC",
        "PayloadDescription": "Thêm LockCOC vào màn hình chính như một ứng dụng.", "PayloadContent": [clip],
    }
    r = Response(plistlib.dumps(prof), mimetype="application/x-apple-aspen-config")
    r.headers["Content-Disposition"] = 'attachment; filename="LockCOC.mobileconfig"'
    r.headers["Cache-Control"] = "no-store"
    return r
'''
a = rd("app.py")
if "ios.mobileconfig" in a: raise SystemExit("[loi] da ap dung patch29 roi")
a = sub(a, '@app.get("/library")', SRV.lstrip("\n") + '\n\n@app.get("/library")', "route library")
w("app.py", a)

s = rd("templates/landing.html")
s = sub(s, '<span class="tag alt">Thêm vào màn hình chính</span></div></div>\n          <ol class="steps">\n            <li>Mở trang này bằng <b>Safari</b>.</li>\n            <li>Bấm <b>Chia sẻ</b> (ô vuông có mũi tên hướng lên).</li>\n            <li>Chọn <b>Thêm vào MH chính</b>, rồi bấm <b>Thêm</b>.</li>\n          </ol>\n          <p class="fine">Chưa có bản IPA vì Apple yêu cầu ký riêng. Cách trên cho trải nghiệm gần như app.</p>',
        '<span class="tag alt">Cấu hình cài đặt</span></div></div>\n          <a class="btn btn-gold big" id="ios-btn" href="/ios.mobileconfig"><svg class="ic"><use href="#i-down"/></svg><span>Tải cấu hình cho iPhone</span></a>\n          <ol class="steps">\n            <li>Mở trang này bằng <b>Safari</b>, bấm nút trên rồi chọn <b>Cho phép</b>.</li>\n            <li>Vào <b>Cài đặt</b>, bấm dòng <b>Đã tải về hồ sơ</b> (hoặc Cài đặt → Cài đặt chung → VPN &amp; Quản lý thiết bị).</li>\n            <li>Chọn <b>LockCOC</b> → <b>Cài đặt</b>, nhập mật mã iPhone. Icon LockCOC sẽ xuất hiện ở màn hình chính.</li>\n          </ol>\n          <p class="fine">Hồ sơ chỉ thêm một lối tắt mở LockCOC toàn màn hình, không cài gì khác và gỡ được bất cứ lúc nào. iPhone sẽ báo “chưa được ký” vì đây không phải hồ sơ doanh nghiệp, đó là bình thường. Chưa có bản IPA vì Apple yêu cầu ký riêng. Cách khác: Safari → Chia sẻ → Thêm vào MH chính.</p>', "ios card")
s = sub(s, '      <details><summary>Video đăng được dài bao lâu?', '      <details><summary>Cài lên iPhone có an toàn không?</summary><p>Hồ sơ cấu hình chỉ tạo một lối tắt (Web Clip) tới LockCOC, không chạy mã nào trên máy và không đọc dữ liệu khác. Bạn có thể xoá trong Cài đặt → Cài đặt chung → VPN &amp; Quản lý thiết bị. Nếu không thấy nút Cho phép, hãy mở bằng Safari, không phải Chrome.</p></details>\n      <details><summary>Video đăng được dài bao lâu?', "faq")
w("templates/landing.html", s)
print("[ok] patch29 xong")
