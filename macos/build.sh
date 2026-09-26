#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
DEST="${1:-../../Cinema Radio.app}"
mkdir -p "$DEST/Contents/MacOS"
mkdir -p build "$DEST/Contents/Resources" build/CinemaRadio.iconset
for SIZE in 16 32 128 256 512; do
  /usr/bin/sips -z "$SIZE" "$SIZE" assets/CinemaRadio.png --out "build/CinemaRadio.iconset/icon_${SIZE}x${SIZE}.png" >/dev/null
  DOUBLE=$((SIZE * 2))
  /usr/bin/sips -z "$DOUBLE" "$DOUBLE" assets/CinemaRadio.png --out "build/CinemaRadio.iconset/icon_${SIZE}x${SIZE}@2x.png" >/dev/null
done
/usr/bin/iconutil -c icns build/CinemaRadio.iconset -o "$DEST/Contents/Resources/CinemaRadio.icns"
for ARCH in x86_64 arm64; do
  /usr/bin/swiftc -parse-as-library CinemaRadio.swift -o "build/CinemaRadio-$ARCH" -framework AppKit -framework WebKit -O -target "$ARCH-apple-macosx15.4"
done
/usr/bin/lipo -create build/CinemaRadio-x86_64 build/CinemaRadio-arm64 -output "$DEST/Contents/MacOS/CinemaRadio"
cat > "$DEST/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>CinemaRadio</string>
<key>CFBundleIdentifier</key><string>haus.maxpfennig.radio</string>
<key>CFBundleName</key><string>Cinema Radio</string>
<key>CFBundleDisplayName</key><string>Cinema Radio</string>
<key>CFBundleIconFile</key><string>CinemaRadio</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.2</string>
<key>CFBundleVersion</key><string>3</string>
<key>LSMinimumSystemVersion</key><string>15.4</string>
<key>LSUIElement</key><true/>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
/usr/bin/codesign --force --sign - "$DEST"
echo "Built $DEST"
