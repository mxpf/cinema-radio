#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
DEST="${1:-../../Offscreen.app}"
mkdir -p "$DEST/Contents/MacOS"
mkdir -p build "$DEST/Contents/Resources" build/Offscreen.iconset
for SIZE in 16 32 128 256 512; do
  /usr/bin/sips -z "$SIZE" "$SIZE" assets/Offscreen.png --out "build/Offscreen.iconset/icon_${SIZE}x${SIZE}.png" >/dev/null
  DOUBLE=$((SIZE * 2))
  /usr/bin/sips -z "$DOUBLE" "$DOUBLE" assets/Offscreen.png --out "build/Offscreen.iconset/icon_${SIZE}x${SIZE}@2x.png" >/dev/null
done
/usr/bin/iconutil -c icns build/Offscreen.iconset -o "$DEST/Contents/Resources/Offscreen.icns"
for ARCH in x86_64 arm64; do
  /usr/bin/swiftc -parse-as-library Offscreen.swift -o "build/Offscreen-$ARCH" -framework AppKit -framework WebKit -O -target "$ARCH-apple-macosx15.4"
done
/usr/bin/lipo -create build/Offscreen-x86_64 build/Offscreen-arm64 -output "$DEST/Contents/MacOS/Offscreen"
cat > "$DEST/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Offscreen</string>
<key>CFBundleIdentifier</key><string>haus.maxpfennig.radio</string>
<key>CFBundleName</key><string>Offscreen</string>
<key>CFBundleDisplayName</key><string>Offscreen</string>
<key>CFBundleIconFile</key><string>Offscreen</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.2.1</string>
<key>CFBundleVersion</key><string>5</string>
<key>LSMinimumSystemVersion</key><string>15.4</string>
<key>LSUIElement</key><true/>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
/usr/bin/codesign --force --sign - "$DEST"
echo "Built $DEST"
