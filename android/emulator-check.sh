#!/usr/bin/env bash
set -euo pipefail
mkdir -p android/emulator-output
collect() {
  timeout 10 adb pull /sdcard/Android/data/haus.maxpfennig.offscreen/files/radio.png android/emulator-output/ || true
  timeout 10 adb logcat -d > android/emulator-output/logcat.txt || true
}
trap collect EXIT
(cd android && ./gradlew --no-daemon connectedDebugAndroidTest)
