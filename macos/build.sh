#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
DEST="${1:-../../Cinema Radio.app}"
mkdir -p "$DEST/Contents/MacOS"
mkdir -p build
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
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>15.4</string>
<key>LSUIElement</key><true/>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
/usr/bin/codesign --force --sign - "$DEST"
echo "Built $DEST"
