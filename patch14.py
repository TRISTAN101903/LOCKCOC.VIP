import os,re
R="LockCOC" if os.path.isdir("LockCOC") else "."
def rd(p): return open(os.path.join(R,p),encoding="utf-8").read()
def w(p,s): open(os.path.join(R,p),"w",encoding="utf-8").write(s)

# ---- landing.html ----
p="templates/landing.html"; s=rd(p)
a=s.find('<div class="phone-col">'); b=s.find('</section>',a)
if a<0 or b<0: print("[loi] khong thay phone-col")
else:
    new='''<div class="phone-col">
        <div class="phone">
          <div class="phone-in">
            <video id="demo-vid" muted loop playsinline preload="metadata" poster="/static/downloads/demo-poster.jpg" aria-label="Quay màn hình LockCOC: chụp 4-Cuts, đăng bài, xem bảng tin, nhắn tin">
              <source src="/static/downloads/demo.mp4" type="video/mp4">
            </video>
            <button class="vid-btn" id="vid-btn" type="button" aria-label="Tạm dừng">Tạm dừng</button>
          </div>
        </div>
        <p class="cap-note">Quay màn hình app thật, dữ liệu và ảnh trong video là mẫu.</p>
      </div>
    '''
    s=s[:a]+new+s[b:]
if "Photobooth" not in s:
    add='''
        <article><svg class="ic xl"><use href="#i-frame"/></svg><h3>Photobooth</h3><p>Polaroid, 4-Cuts, Duo 35mm: tự đếm 3-2-1, chụp liên tiếp, ghép khung và màu phim.</p></article>
        <article><svg class="ic xl"><use href="#i-heart"/></svg><h3>Tiếng chụp, tiếng đếm</h3><p>Có âm thanh và rung nhẹ khi chụp, khi đếm ngược và khi có tin mới. Tắt được bất cứ lúc nào.</p></article>
        <article><svg class="ic xl"><use href="#i-users"/></svg><h3>Tin nhắn gọn hơn</h3><p>Chia theo ngày, có giờ, gửi tức thì, thả cảm xúc nhanh và tìm cuộc trò chuyện.</p></article>
        <article><svg class="ic xl"><use href="#i-down"/></svg><h3>Thư viện ảnh</h3><p>Đồng bộ ảnh và video của bạn cùng bạn bè, xem trong app và tải về máy.</p></article>'''
    k=s.find('<h3>Chuỗi ngày</h3>'); e=s.find('</article>',k)+len('</article>')
    s=s[:e]+add+s[e:]
w(p,s)

# ---- landing.js ----
p="static/js/landing.js"; s=rd(p)
a=s.find("// ---- điện thoại minh họa"); b=s.find("// ---- số liệu thật")
if a<0 or b<0: print("[loi] landing.js khong khop")
else:
    new='''// ---- video demo: chỉ chạy khi đang nhìn thấy ----
  var vid = document.getElementById("demo-vid"), vb = document.getElementById("vid-btn"), userPaused = false;
  if (vid) {
    var play = function () { if (!userPaused && !reduce) { var q = vid.play(); if (q && q.catch) q.catch(function () {}); } };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) play(); else vid.pause(); }); }, { threshold: 0.35 }).observe(vid);
    } else play();
    vb.addEventListener("click", function () {
      userPaused = !vid.paused; if (userPaused) vid.pause(); else play();
      vb.textContent = userPaused ? "Phát" : "Tạm dừng"; vb.setAttribute("aria-label", vb.textContent);
    });
    vid.addEventListener("error", function () { vb.hidden = true; }, true);
  }

  '''
    s=s[:a]+new+s[b:]
w(p,s)

# ---- landing.css ----
p="static/landing.css"; s=rd(p)
if ".vid-btn" not in s:
    s+='''
.phone-in video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; background: #000; }
.vid-btn { position: absolute; right: 10px; bottom: 10px; z-index: 6; padding: 5px 11px; border-radius: 999px; background: rgba(14,12,8,.7); color: #fff; font: inherit; font-size: 12px; border: 1px solid rgba(255,255,255,.2); cursor: pointer; }
.vid-btn[hidden] { display: none; }
'''
w(p,s)
print("xong patch14")
