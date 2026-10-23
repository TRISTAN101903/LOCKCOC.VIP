# LockCOC

Web app (cài như app trên điện thoại) dùng tài khoản Locket thật, giao diện **Liquid Glass**, xây dựng bằng Flask trên thư viện không chính thức [`locketlam`](https://github.com/leanhminh2104/locketlam).

## Tính năng

- **Camera**: chạm để chụp, **giữ để quay tối đa 60 giây**, hoặc bấm nút video đỏ để quay rảnh tay; zoom 1×–5× (chụm/thanh trượt/nút), 7 bộ lọc màu, hẹn giờ chụp 3s/10s, chọn ảnh/video từ thư viện, đổi camera.
- **Soạn bài**: caption, gradient, nhãn Locket, biểu tượng, **Studio** (tìm nhạc iTunes / dán link Spotify, widget đồng hồ-thời tiết-pin-đánh giá sao, hiệu ứng tuyết/lấp lánh/tim… xem trước).
- **Khung widget Locket**: Vàng, Polaroid, Tròn, Tim, Phim, Kính (in thẳng vào ảnh trước khi gửi; video giữ nguyên).
- **Hẹn giờ đăng** (tối đa 30 ngày) và **chọn người nhận**; chụp lại, nút gửi lớn.
- **Bảng tin**: danh sách hoặc lưới, lọc theo từng bạn, **đồng bộ toàn bộ** khoảnh khắc của mọi bạn, thả cảm xúc kèm hiệu ứng emoji bay, chạm đúp để thả tim.
- **Bạn bè, Chat** (thông báo tin mới + chấm đỏ), **nhiều tài khoản**, đổi tên/ảnh đại diện, xem lượt xem, xoá bài.

- **Hai dạng giao diện:** trên điện thoại là app (thanh điều hướng dưới), trên máy tính là bản web (thanh bên trái, bố cục rộng). Cùng một server; bản APK chỉ là vỏ mở server này.
- **VIP:** mọi tài khoản trong LockCOC hiển thị huy hiệu VIP và dùng được toàn bộ khung, bộ lọc, hiệu ứng, hẹn giờ. Đây là hạng của riêng app, không phải gói Locket Gold của Locket.

- **Chuỗi ngày + khôi phục chuỗi VIP:** đếm số ngày liên tiếp đăng bài qua LockCOC; chuỗi đứt tối đa 7 ngày thì thành viên VIP bấm *Khôi phục* ở tab Tôi để nối lại (tính theo bài đăng trong app, không phải chuỗi gốc của Locket).

## Chạy trên GitHub Codespaces

```bash
unzip -o LockCOC.zip && cd LockCOC
pip install -r requirements.txt
python app.py
```

Terminal sẽ in **MÃ KHOÁ APP**. Mở tab **Ports** → cổng **5000** (để **Private**), dùng link `*.app.github.dev` (camera cần HTTPS). Cài lên màn hình chính: menu trình duyệt → *Thêm vào màn hình chính*.

## Bảo mật (nhiều lớp, không có thứ gọi là "tuyệt đối")

- Mã khoá app khi mở (tự sinh, lưu `data/passcode.txt`; đặt bằng `LOCKETCAC_PASSCODE`, tắt bằng `off`); tự khoá sau 24 giờ không dùng; nút *Khoá app ngay*.
- HTTPS bắt buộc (tự chuyển hướng qua proxy), HSTS, cookie SameSite=Strict + Secure, CSRF header `X-LockCOC`, CSP chặt, COOP/CORP, Permissions-Policy.
- Giới hạn đăng nhập/mở khoá sai (8 lần/5 phút), chống SSRF (chỉ gọi iTunes/Spotify oEmbed/Open-Meteo), thư mục `data/` quyền 0700, token phiên quyền 600.
- **Mật khẩu Locket không bao giờ được lưu.** Đăng xuất xoá token và lịch sử trên server.
- Chỉ dùng với tài khoản **của chính bạn**; đừng chia sẻ link cổng.

## Dữ liệu (SQLite `data/locketcac.db`)

`accounts`, `posts` (lịch sử + ảnh nhỏ), `scheduled` (bài hẹn giờ). `data/` đã nằm trong `.gitignore`, đừng commit.

## Biến môi trường (tuỳ chọn)

| Biến | Ý nghĩa |
| --- | --- |
| `PORT` / `HOST` | Cổng / địa chỉ lắng nghe (5000 / 0.0.0.0) |
| `LOCKETCAC_PASSCODE` | Mã khoá app (`off` để tắt) |
| `LOCKETCAC_SECRET` | Khoá ký cookie |
| `LOCKETCAC_SECURE_COOKIES` | `1` khi chạy HTTPS (đã bật sẵn ở devcontainer) |
| `LOCKETCAC_FORCE_HTTPS` / `LOCKETCAC_BEHIND_PROXY` | Chuyển HTTPS / tin proxy (mặc định 1) |
| `LOCKETCAC_NO_SCHEDULER` | `1` để tắt bộ hẹn giờ |
| `LOCKETCAC_DATA` | Thư mục dữ liệu |

(Tên biến giữ nguyên tiền tố `LOCKETCAC_` để tương thích bản cũ.)

## Lưu ý

- Hẹn giờ chỉ chạy khi server còn bật (Codespaces ngủ thì bài chờ đến lúc bật lại).
- Nhạc và widget được gửi dưới dạng caption văn bản; hiệu ứng chỉ xem trước trong app (icon tương ứng được gửi kèm).
- Video quay trên trình duyệt được server chuyển sang mp4 H.264, tối đa 60 giây.
- `locketlam` là dự án dịch ngược, không liên kết với Locket Camera, Inc.; có thể ngừng hoạt động khi Locket đổi API và có thể vi phạm điều khoản của họ.
- Chưa kiểm thử với tài khoản Locket thật (chỉ thử với thư viện giả lập); nếu có chỗ hiển thị trống, báo lại để chỉnh `norm_moment` / `norm_user` trong `app.py`.

---
Developed & founded by **TRISTAN.faketriss**
