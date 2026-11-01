import os, base64, zlib
R = "LockCOC" if os.path.isdir("LockCOC") else "."
def P(p): return os.path.join(R, p)
def rd(p): return open(P(p), encoding="utf-8").read()
def w(p, s): open(P(p), "w", encoding="utf-8").write(s)
if not os.path.isdir(P("android/app")): raise SystemExit("[loi] khong thay thu muc android/app")
if os.path.exists(P("android/lockcoc.jks")): raise SystemExit("[loi] da ap dung patch47 roi")
PFX = "LockCOC/" if R == "LockCOC" else ""
JAVA = zlib.decompress(base64.b64decode('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')).decode("utf-8")
JKS = base64.b64decode('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')
w("android/app/src/main/java/vn/lockcoc/app/MainActivity.java", JAVA)
open(P("android/lockcoc.jks"), "wb").write(JKS)
w("android/app/build.gradle", """plugins { id 'com.android.application' }

def ksFile = file('../lockcoc.jks')
def vCode = (project.findProperty('VERSION_CODE') ?: '1').toString().toInteger()

android {
    namespace 'vn.lockcoc.app'
    compileSdk 34
    defaultConfig {
        applicationId 'vn.lockcoc.app'
        minSdk 24
        targetSdk 34
        versionCode vCode
        versionName (project.findProperty('VERSION_NAME') ?: '1.0').toString()
        // địa chỉ server LockCOC (truyền bằng -PAPP_URL=https://...)
        buildConfigField 'String', 'APP_URL', "\\"${project.findProperty('APP_URL') ?: 'https://lockcoc-vip.onrender.com'}\\""
    }
    signingConfigs {
        release {
            // khoá ký cố định: các bản cập nhật sau cài đè được lên bản cũ
            if (ksFile.exists()) {
                storeFile ksFile
                storePassword 'lockcoc2026'
                keyAlias 'lockcoc'
                keyPassword 'lockcoc2026'
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            if (ksFile.exists()) signingConfig signingConfigs.release
        }
    }
    buildFeatures { buildConfig true }
    lint { checkReleaseBuilds false; abortOnError false }
    compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
}
""")
mp = "android/app/src/main/AndroidManifest.xml"
m = rd(mp)
if "DOWNLOAD_WITHOUT_NOTIFICATION" not in m and '    <uses-permission android:name="android.permission.VIBRATE" />' in m:
    m = m.replace('    <uses-permission android:name="android.permission.VIBRATE" />', '    <uses-permission android:name="android.permission.VIBRATE" />\n    <uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />', 1)
    w(mp, m)
wf = """name: Build APK
on:
  workflow_dispatch:
  push:
    paths:
      - '@@PFX@@android/**'
      - '.github/workflows/build-apk.yml'
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: android-actions/setup-android@v3
      - uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.7'
      - name: Build APK da ky
        run: gradle -p @@PFX@@android --no-daemon assembleRelease -PAPP_URL=https://lockcoc-vip.onrender.com -PVERSION_CODE=${{ github.run_number }} -PVERSION_NAME=1.${{ github.run_number }}
      - name: Kiem tra chu ky
        run: |
          APK=$(ls @@PFX@@android/app/build/outputs/apk/release/*.apk | head -1)
          "$ANDROID_HOME"/build-tools/*/apksigner verify --verbose "$APK" | head -8
          mkdir -p @@PFX@@static/downloads
          cp "$APK" @@PFX@@static/downloads/LockCOC.apk
          ls -la @@PFX@@static/downloads/LockCOC.apk
      - uses: actions/upload-artifact@v4
        with:
          name: LockCOC-apk
          path: @@PFX@@static/downloads/LockCOC.apk
      - name: Dua APK len trang
        run: |
          git config user.name "lockcoc-bot"
          git config user.email "bot@users.noreply.github.com"
          git add @@PFX@@static/downloads/LockCOC.apk
          git commit -m "APK ${{ github.run_number }} (tu dong)" || echo "khong co thay doi"
          git pull --rebase origin ${{ github.ref_name }} || true
          git push origin HEAD:${{ github.ref_name }}
"""
os.makedirs(".github/workflows", exist_ok=True)
open(".github/workflows/build-apk.yml", "w", encoding="utf-8").write(wf.replace("@@PFX@@", PFX))
print("[ok] patch47 xong: APK ky co dinh, tu thu lai khi server ngu, tai file, workflow tu build va dua APK len trang")
print("     Sau khi push, vao GitHub > Actions > Build APK de xem tien trinh (khoang 5 phut).")
