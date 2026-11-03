import os
R = "LockCOC" if os.path.isdir("LockCOC") else "."

def edit(path, pairs):
    p = os.path.join(R, path)
    h = open(p, encoding="utf-8").read()
    changed = False
    for old, new in pairs:
        if new in h:
            continue
        if old not in h:
            raise SystemExit("[loi] khong thay doan can sua trong " + path + ": " + old[:50])
        h = h.replace(old, new, 1)
        changed = True
    if changed:
        open(p, "w", encoding="utf-8").write(h)

edit("templates/landing.html", [
    # the tinh nang
    ('<h3>Mã khóa</h3><p>Chưa nhập mã thì không vào được app, kể cả khi có đường dẫn.</p></article>',
     '<h3>Mã khóa và mã tài khoản</h3><p>Nhập mã khóa mới vào được app. Đăng nhập xong, mỗi tài khoản nhận một mã riêng dạng TRIS-XXXX-XXXX-XXXX, xem trong Hồ sơ.</p></article>'),
    # buoc cai dat
    ('<li><b>Mở LockCOC</b>, nhập mã khóa rồi đăng nhập tài khoản Locket.</li>',
     '<li><b>Mở LockCOC</b>, nhập mã khóa rồi đăng nhập tài khoản Locket. Đăng nhập xong, mã tài khoản TRIS- của bạn hiện trong Hồ sơ.</li>'),
    # hoi nhanh
    ('<details><summary>Mã khóa lấy ở đâu?</summary><p>Mã do người quản trị máy chủ đặt. Hãy hỏi người đã chia sẻ LockCOC cho bạn. Mã chỉ để chặn người lạ vào app, không phải mật khẩu Locket của bạn.</p></details>',
     '<details><summary>Mã khóa lấy ở đâu?</summary><p>Mã do người quản trị máy chủ đặt. Hãy hỏi người đã chia sẻ LockCOC cho bạn. Mã chỉ để chặn người lạ vào app, không phải mật khẩu Locket của bạn.</p></details>\n'
     '      <details><summary>Mã TRIS- là gì?</summary><p>Đó là mã tài khoản LockCOC. Mã chỉ được cấp sau khi bạn đăng nhập, mỗi tài khoản có một mã riêng và gắn với tài khoản đó, đăng nhập lại vẫn ra đúng mã cũ. Bạn xem và sao chép mã trong Hồ sơ. Mã này không phải mật khẩu Locket và không thay cho mã khóa dùng để mở app.</p></details>'),
])

edit("templates/index.html", [
    ('Mã chỉ để chặn người lạ vào app, không phải mật khẩu Locket của bạn. Lần mở đầu có thể mất khoảng 30 giây để máy chủ thức dậy.</p>',
     'Mã chỉ để chặn người lạ vào app, không phải mật khẩu Locket của bạn. Sau khi đăng nhập, mỗi tài khoản nhận mã riêng dạng TRIS-XXXX-XXXX-XXXX, xem trong Hồ sơ. Lần mở đầu có thể mất khoảng 30 giây để máy chủ thức dậy.</p>'),
])
print("[ok] patch59 xong: cap nhat thong tin ma khoa va ma tai khoan TRIS- tren trang gioi thieu va man khoa")
