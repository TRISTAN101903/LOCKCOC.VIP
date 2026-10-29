import os
R = "LockCOC" if os.path.isdir("LockCOC") else "."
p = os.path.join(R, "templates/landing.html")
s = open(p, encoding="utf-8").read()
def sub(old, new, what):
    global s
    if old not in s: raise SystemExit("[loi] khong thay doan can sua: " + what)
    s = s.replace(old, new, 1)
if "Chụp Đêm" in s: raise SystemExit("[loi] da ap dung patch28 roi")

def card(ic, t, d): return '        <article class="feat-new"><svg class="ic xl"><use href="#i-%s"/></svg><h3>%s <em class="nw">Mới</em></h3><p>%s</p></article>\n' % (ic, t, d)
new = (
 card("camera", "Chụp Đêm", "Chồng 8 khung hình liên tiếp để giảm nhiễu và sáng vùng tối. Giữ yên máy khoảng 1 giây.") +
 card("grid", "Chụp liên tiếp, tự chọn nét nhất", "Chụp 8 tấm, app chấm điểm độ nét và chọn sẵn tấm đẹp nhất. Bạn vẫn đổi được tấm khác.") +
 card("film", "Boomerang", "Quay khoảng 1 giây rồi chạy tới lui, lặp hai vòng, đăng như một video ngắn.") +
 card("star", "Lưới, thước cân bằng, đèn pin", "Lưới 3×3 và thước đổi màu khi máy thẳng. Đèn pin hiện khi điện thoại hỗ trợ.") +
 card("flame", "Thống kê của bạn", "Chuỗi ngày, bản đồ nhiệt 120 ngày, giờ và thứ bạn hay đăng nhất, bạn gửi ảnh nhiều nhất.") +
 card("box", "Xoá nhiều khoảnh khắc", "Chọn nhiều bài của mình trong Thư viện rồi xoá một lượt, hoặc xoá từng bài. Không thể hoàn tác.") +
 card("clock", "Hàng đợi khi mất mạng", "Đăng lúc mất mạng hoặc server đang ngủ thì bài được lưu trong máy và tự đăng lại khi có mạng.") +
 card("lock", "Nhẹ và nhanh hơn", "Nén dữ liệu, tải ảnh khi cuộn tới, giữ server thức khi đang dùng."))
sub('        <article><svg class="ic xl"><use href="#i-clock"/></svg><h3>Hẹn giờ đăng</h3>', new + '        <article><svg class="ic xl"><use href="#i-clock"/></svg><h3>Hẹn giờ đăng</h3>', "cards")
sub('<div><b>Photobooth</b><span>Polaroid, 4-Cuts, Duo</span></div>', '<div><b>Camera mới</b><span>Đêm, Liên tiếp, Boomerang, Photobooth</span></div>', "facts")
sub('<div><b>Thẻ nhạc</b><span>gắn bài hát vào bài đăng</span></div>', '<div><b>Thống kê</b><span>chuỗi ngày, bản đồ nhiệt, xoá nhiều bài</span></div>', "facts2")
sub('content="LockCOC: chat kiểu mới, Photobooth, thẻ nhạc,', 'content="LockCOC: camera Đêm, Liên tiếp, Boomerang, chat kiểu mới, Photobooth, thống kê, xoá nhiều bài,', "meta")
sub('<p class="lead">Chụp ảnh, quay video, nhắn tin, gắn nhạc,', '<p class="lead">Chụp ảnh (cả chế độ Đêm và Liên tiếp), quay video, Boomerang, nhắn tin, gắn nhạc,', "lead")
def row(t, y): return '            <tr><th scope="row">%s</th><td><svg class="ic no"><use href="#i-no"/></svg>Chưa thấy</td><td class="us"><svg class="ic ok"><use href="#i-ok"/></svg>%s</td></tr>\n' % (t, y)
rows = row("Chụp Đêm, Liên tiếp tự chọn nét, Boomerang", "Có") + row("Thống kê chuỗi ngày, bản đồ nhiệt", "Có") + row("Chọn nhiều bài để xoá một lượt", "Có") + row("Tự đăng lại khi mất mạng", "Có")
sub('            <tr><th scope="row">Hẹn giờ đăng</th>', rows + '            <tr><th scope="row">Hẹn giờ đăng</th>', "rows")
def faq(q, a): return '      <details><summary>%s</summary><p>%s</p></details>\n' % (q, a)
faqs = (faq("Chế độ Đêm hoạt động thế nào?", "App chụp 8 khung hình liên tiếp rồi lấy trung bình để giảm nhiễu và nâng vùng tối. Hãy giữ yên máy khoảng 1 giây. Kết quả phụ thuộc camera của điện thoại.") +
        faq("Xoá khoảnh khắc có hoàn tác được không?", "Không. Vào Thư viện ảnh, bấm Chọn để xoá, chọn các bài của bạn rồi xác nhận. Bài sẽ bị xoá khỏi Locket. Bài của bạn bè không xoá được.") +
        faq("Bài đăng lúc mất mạng có bị mất không?", "Không. Bài được lưu tạm trong máy và tự đăng lại khi có mạng. Đóng hẳn trình duyệt hoặc xoá dữ liệu trang thì bài chờ có thể mất."))
sub('      <details><summary>Video đăng được dài bao lâu?', faqs + '      <details><summary>Video đăng được dài bao lâu?', "faq")
open(p, "w", encoding="utf-8").write(s)
print("[ok] patch28 xong")
