import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
def rd(p): return open(P(p), encoding="utf-8").read()
def w(p, s): open(P(p), "w", encoding="utf-8").write(s)
F = {'fold.js': 'eNqVU7FuE0EQ7fMVw9Kcg70u6LBQFKxIFCggJRJICKT13fh2yd3usTcXYsWuUiAKJHoaUkRIkZAQZVJQOOI//CfM3tnhYhCIwmft7ps3897MiKpEKMmbmMRgo78JY5cl8lUJPSCvbAqpWVx+NECa/99W9yDWi8t3UJ8s0PyL1WCvThj48PF+Fwq9uPhsIZ5/s5AtLk4NjBYXZzmIZ5gzx/w8F7DZ34jGlY3JOAtRB443AA6Vh9SbBO5D4uIqR0vydYV+socZxuR8JG6TsbpnQ00yQEVnwIFmDNGtcOyAR6q8HSzZuBwm67+MhloRHHC9JxXkQct0yBLOCrj6wOWsDpmZn7Mes7j4XkyfaEdu5Bzp6W46/zQBW3+uTnI4+vFVTZ96VRSYTPdZ7SVY/p7Gnf4qs/JUcupt79VEFp6paFKgLDMTo4xVlkWhXhlrkyUebacLeMRec8jzF4EjxMux8zsq1i2jVONUk0MzWq07pO8KJiN+0rAFWhLzDp2lYCZ3OGev74EQg5olGMceMaikiDorck4v40yV5SNTklRJwrSOGq9XybmVrTbFHhXhTobhFAnMGcyQhmVX5cjgwDES9XWrqPDAJYg2N09fqH9dmrRvAm0omhGdAJMec3eI0XVpWoau2GQYjI0wXz7MADOe8ePfheXOY11ssF8WVanZ5AHMOGz2a7ia1wxtSro9ZE0TbzKG5Wm8ClpGZP9i1KgicrZBM1KGIQmOLO8H9eUNEwMf/3qpdiXVi9rj4xJZIm0Td5nDMRLKG9XDo0LZBBPRBTFWbEIr2c0uXG8nCLgDbcV8FO01FysG1rtzyOFBPFrkHsU84Aeca323l43l1nCqNdfIpWnG9YbX1ZD9W03NtQWCfIUizHRL3Z/0rfD7uoJ0cfne1kH/KboZibr+QvHe0q5LUBpboqcHyPuKEWfuNgjLdHtmlBmbctisE6b0J/4K2Y4=', 'fold.css': 'eNp1kUFOAzEMRfecwhKbIjGjaasWmtmw5QgsPRMnjZrEo8SFloq7k7QFgQSrWD/vOz92a5PTrWGvAZO40VMbOBGcQLs8eTwqiByph4+b9htteaL4Lz94Hnc9YHQBxXFUUD3PEdrFKgNhJhhYtrXl046OJmGg/MWcwCQO5eAJRyelXdeDJIzZcArqUnoUepmtp8NdaQLCP/H5L/yavabfsgy1PUdpshw91dsU0PdXzb0Xad5Nh6vwRs5uRcFjVyJ4EqHU5PpMtArabk2hh4DJuth4MgVcV+uEWp+JxXSAh6oMnHSxJtRunxVsNpuziuPOJt5HrcC7SJgaWxGKMpsvV5rsPdwa84BLfS6Wek3luyN7TqoKpodXqitA36B3tsw5OK39ZVd1nM0g8Y/FXDKXr5a8gPsyvq5aPgG8xrHR', 'cam28.js': 'eNqNU01r20AQvedXTPYQpCArpVAoMaUkIdBDSA/JLeSwlsb2NtKuulq5McGHnnoqtJdC6aH0VnrpB+nFhvbg0P+h/pLOriRbThrIwWa1O+/NvDczrMgRcqNFZFh3bWsTIp7efxg+y6Fjj6g5DMrZa7kN0bCc/oart+XsPTx5egxDUc5eScjL6U8ZQDT/ISEpp58EyHL6PQWjlRwAOx7Ov6SsC6acfjUwspiIImYvJZwNBf3mlxRWzj4SgNOpzrm5teb1CxkZoSR4PlysAYy4Bq1ewCOIVVSkKE34vEA9PsIEI6O0x0JCd1IVY878LiFEH7x1gvig0RRadmuWTCRJTjwXkwByzOhEQTfI6KWi2dGaj8NMK6PMOMOwr/Q+j4aULUm8G8gdumShraJj8zA/gKWSHkmp0p/0QoPnZk9JY5VQB1LPP6VSel2Y+E2lFKH5IXliyz1hu0pZe+SABcAO/nwrZx+EPV69mX+W7DSAjEtM2g5FGrnB/QTtl8diMao0ucAwSnieW3qCsMo8jdTZOEbJbNgyf6O61RZpxViPK0Hy1K9peZahjPeGIomXb40sCyBrfet8qDFVI/QWel3+28vvFcYoWSmwoaHth629fuhWtyuyFp0Ao1TiAjo9s4jN0ewYcp8Y0GNcC97Bc5IRY2yd7fMkR0pYp1t2zFK74Ya/7345r+wktJVbhN88ZFwT6JBqCYXMUZtdJEPRc4YFLkQS+ZHoJUIOHGxhdD6WUb0DlUuKklD+9VYTD0ROblFpnOg9VrfQ8cD/ancUj5cSLhlsrwi6izsNidEFOnzj1jLrsjijBoOESKhNAaw76MZGe8Bymu3r01XtLTRDZBHN+b+63XDQoLkSJs2U8DjeH5FuG4wSabmjRERnrL2ZbjGv+dmUvHCzbkUzyvW035GdvDwWKarCeJYmgAf3VpaiEtba8Zbc9u2twv0bAur1WhmHWsLaxLf//wCbfBVh', 'cam28.css': 'eNqFj9sKwjAQRN/9inkRLJqQFhFJvyZtYruYGzVqRfx3Wy9QEfFtmT2cYXitHHOhM7hC0yFadZHYWdOXaFSU2MThikpr8o2EQF7E/hmeSadWwpFf1MrWi1yIORgKEftshUe0EacWS2yHJCsfVgkfvClxm/F3MW9Ja+On/V8MuAvasEjWTjnylrxhlQ31/hf/X6/NYfi+NrIqpBScxHrc+MHw0cyqNLqc6hryzJpdklDHFEb2DirXbfc='}
def D(k): return zlib.decompress(base64.b64decode(F[k])).decode("utf-8")
def sub(s, old, new, what):
    if old not in s: raise SystemExit("[loi] khong thay doan can sua: " + what)
    return s.replace(old, new, 1)
if os.path.exists(P("static/js/fold.js")): raise SystemExit("[loi] da ap dung patch31 roi")
w("static/js/fold.js", D("fold.js")); w("static/js/cam28.js", D("cam28.js"))
w("static/landing.css", rd("static/landing.css") + "\n" + D("fold.css"))
w("static/polish.css", rd("static/polish.css") + "\n" + D("cam28.css"))
L = rd("templates/landing.html")
L = sub(L, '  <script src="/static/js/landing.js"></script>', '  <script src="/static/js/landing.js"></script>\n  <script src="/static/js/fold.js"></script>', "landing script")
L = sub(L, 'Mục có nhãn “Mới” vừa được thêm.', 'Dưới đây là các tính năng HOT. Bấm “Xem thêm” để xem đầy đủ.', "sub")
w("templates/landing.html", L)
h = rd("templates/index.html")
h = sub(h, '  <script src="/static/js/cam27.js"></script>', '  <script src="/static/js/cam27.js"></script>\n  <script src="/static/js/cam28.js"></script>', "index script")
w("templates/index.html", h)
print("[ok] patch31 xong")
