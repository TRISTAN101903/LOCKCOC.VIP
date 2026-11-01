import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
def rd(p): return open(P(p), encoding="utf-8").read()
def w(p, s): open(P(p), "w", encoding="utf-8").write(s)
T = {'brandframe.js': 'eNqNV8tu20YU3fsrbpiFqZihSephOYIXjpsEBpI0iNx2WYzIITUxX5mhXm2y6KrrfEGadFGgm3ZXwEZXBvIf+oN+Qu8dkhJlKWkB0STv+849c4Y2JoqDKqTwC2Owd3gPRpKlQShZwu1XCu7D5XiSRrC8+jUdQzH+9OenD/g6FsvrnydgPM38y7Ovz+Db8xfGA5ii9KcUpje/pJEFcRZlkCyv/ioguPm4IDEUN7+nwPIcltfvwR/ffEyryPcO98xwkvqFyFIwW/DjHoAIwSwWOc9CePzy9NmjIZycnIAxSQMeipQHBrx5A5WB5CiVj6nsAO6QWR3NaKGymMh0UIW8UwazVZbwRs4Qk1aWENoiKJNNRW4M4G2rBbVXHgufm64FjoUOInhQGlmQPthcDws4Sv55/+6dgQEo+ypZlMXBE8kC07dgjnEWeM0x5MKlIqZMQgQn4Nu+5KzgT7FZJsle8LQwbzkMILJZEJxlcSaHRZabqDLuhiPeZo6xQ2t3u2TAvZHTYTsMXNKOjvuep7XVikS4CM0OpNS1YwUWzCwYWyCpdN8e8UikL1gxNtHZt5Nsyi8ycw4HINFYy5j0K9FM+9dPeNNxtm1KzXy3zYZ+W7eOX+v8OFO8LpG6QtTfBqs/Xl7/AWcWTJdXfyPueaZNbDWNwF9e/8YIxQMw/bnlL1oQa2x/TCxQ+tlfXn1AVJd7p+t6hO/G6lEoWj/0Bh/rUiXgQY/+Ekev4JDcqFrFprxcywJ3pooREJgVN6bX7cE9uKQI6zdtqHwWcxM1lxp2sEJUE3eug0Dp4dVx6U/XqWzRvZDZJR8Wi5iTD0WMEYLfiaAYo8DtDKrxe14PQ3hlmCO8t50yvw5grgLewgTOxsRy0f8Yfdyup/fSM9TbL86xCU9bhSKO6xqMu66H9fpGrSgDbVTV25W5adFxap8zllNQmSGVGA23lM+AyvS+Mo1nbfcYvHYfTvse4M8BFy8Stjs9o/Xl3o7r3o7+s7VosyXJVZHJqgPCJo3uexmiZZPiSLtBeSfA1CL11xAzR3E2skATOQJM/MBrjBEHanHJk0ReNUVSJhuBHS/MYiyUBUxGkwRJR1X9UhyCJ92QfF2nj4tKJQ4rqQWjhBaXzZgooOSv84RF/KEoEpbrqhqg9KdoG2S+TlLR3aOY05tp+CydMkUk5E/tWTVFfBxzEY0LfB6Wuf1SHPHiLEsLPkdXLzAaWUbRk8/TqaNHNMQfJkLLHWTqBm7f1WS6pdds6TDn2DmqM5Z7Yx0Wfzh5x3aOtoaP4Rrj3739Glt2o9RNcFcpiDLK/JXA6e94PO53djw6vd6O3Uvrp0TAVzn6iOt8jq/mEGmHVC0kKxIu1nXgEaNe46tGfiJSE1FRjlADpBrhuuWK48rS8zkFs3Ts+m8Vt92tGFzk6wULJJtpjFEWC9a5qL7XVXXmOm1TrF6X13bO7e345eHUEXI6bsow+aJ6/Ny4nN7/73l7LCNa8FUOvOmJ5IvNscRqlc91u3UfIe4U4sAjxwEDXfWgNCGa9QhbKDawmyc8k5Fg1v6FSLiC50iSL7OEpfuW4lKERrkJi5neYglnaiL5hd6Fza+hVj3+SJNvlcRDoBRZwWIUYaEHWnuAwei7qMaYNtDdlNXXpydaHJCXbnO0oFZXcyIaOI1FlFKTMQ8LzfMkfcgUp1GQIhFBEHNji5M3Ps90EkqApdQjWScvix3RFGrlqgiKub0STV9sdzOy67Vuj6j72RF59Yj2hzzKOHxzvm+dSsFiS+GXwv16PLfOUhmNmOl1epbXcS2v7Vh2r7WyKsu9eHk+vDh9bofskuO/BkrdLnrdrePt7r46UPSRKrNEqOa3Nm4r/bU4tYvsIZ4IJEAiFbSJD1/lPMJ8yE10WpZfzm8He29bhP1/Aa0CsHs=', 'apkcheck.js': 'eNqVlM1u00AQx+95iukeKrskdgotoEYRSksRiI9y6As46028xFmH9bgkojkgDghxgIoTt5YKIVEQILiQiFMq3sNvwqztVOmXCodYXu/Mzv8/88uyJBYQo5YcWa3kLoDX6/BA8I7zKIYKqMkIAdPRvoTGw7twuJOO33EI09GX3gp0gslP1YZekI4/AAZJthdzLXto9vZ4mVLH36FJ4ZgfFXuJ+bYj6SgPrkBbTt4PYMEtWa1EcZSRAsuGpyWALU9nJevA3Bg9lNz1oycqjDw/du9FvLO2seaQWFaGJioK8yOedIVCpy1wPRTmdXVwx7cYBVUohNkkp48XRaLoowlVEYqLYk0Ms2ukVrbAmjM6trdhjqrYoAUmWpm9I2dCec1QWKFQuUUwyp1AixYVIq+1bB0LbCANpJmgsNjUM9lks67ts4I9Lb2KL2NTJstoeWFcKARj3jHu1iKFZMN0djOb7Oy5cAmMQLgBDKyjlQuL1aXry9eu2g5Gt2Rf+NaiTZsM7q/aDFaATYuYRpi22FkDT9ZbI1ReFjy1ZCgMCweEwmREHKH26KkmuwMHGsrXkfQhTke/gZJeS3icDNLxMwV8sivzPNUm5N6qKYd9Ii4j9JUKHGbkDOlHHdqUXREleAqxYmzu4RtTuCPT8fOuUeGS7BitE/2yZ2ea8+lHyjCSdZngotfzquWVTLxZFHmoE1GbUlGliQ5hWIalarVaNLMlkAcWkVGmpK7AIPKp1bfXGzdpuFwLn2RJKk4fY68rKpGWbakYDGlMgVAzEvTUce45F1LYOS6Hh8LTUw9YCMntcuNQO4HwfKFj84+wGM+bU8FBj0Az+DNWm6mknagD8/OU60jli/5Gy2KmqW6A3ZAS6vU6VIilogsPkm5TaOucIoRiG4O8TNU+0iao/dSgM/heJdJUdo0QSF97xM4PVvsHRj8WMNIlRU9urjtQQXaNZdhmI6FrbU/BVjo6UOBPfmXhf76l431OZHoDOmLySZnnZxWAb+h9gcRlRiWYGXHPjPc0J/8xnWP0ZA0hgi4vZwQNbcuulf4C09ULog=='}
def D(k): return zlib.decompress(base64.b64decode(T[k])).decode("utf-8")
if os.path.exists(P("static/js/brandframe.js")): raise SystemExit("[loi] da ap dung patch48 roi")
# 1) sua loi dung script trang gioi thieu (nut tam dung da bi go o patch44)
lj = P("static/js/landing.js")
if os.path.exists(lj):
    s = rd("static/js/landing.js"); o = s
    s = s.replace('    vb.addEventListener("click", function () {', '    if (vb) vb.addEventListener("click", function () {', 1)
    s = s.replace('vid.addEventListener("error", function () { vb.hidden = true; }, true);', 'vid.addEventListener("error", function () { if (vb) vb.hidden = true; }, true);', 1)
    if s != o: w("static/js/landing.js", s); print("[ok] da vá lỗi script trang giới thiệu")
    else: print("[ghi chu] landing.js khong can va (da duoc sua truoc do)")
# 2) nut APK doc lap
w("static/js/apkcheck.js", D("apkcheck.js"))
L = rd("templates/landing.html")
if "apkcheck.js" not in L:
    if "</body>" not in L: raise SystemExit("[loi] landing.html khong co </body>")
    L = L.replace("</body>", '  <script src="/static/js/apkcheck.js"></script>\n</body>', 1)
w("templates/landing.html", L)
# 3) khung thuong hieu LockCOC VIP trong trinh soan khoanh khac
w("static/js/brandframe.js", D("brandframe.js"))
h = rd("templates/index.html")
tag = '  <script src="/static/js/brandframe.js"></script>'
if "/static/js/devsync.js" in h: h = h.replace('  <script src="/static/js/devsync.js"></script>', '  <script src="/static/js/devsync.js"></script>\n' + tag, 1)
elif "</body>" in h: h = h.replace("</body>", tag + "\n</body>", 1)
else: raise SystemExit("[loi] index.html khong co </body>")
w("templates/index.html", h)
print("[ok] patch48 xong: sua nut tai APK + khung thuong hieu LockCOC VIP")
