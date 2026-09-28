# Android prototype

The Android app uses the same radio design as the website, with Kotlin and
Media3 handling playback in a foreground media service. It runs on Android 8
(API 26) and later. There are no Google Play Services, accounts, ads, or analytics.
The application ID is `haus.maxpfennig.offscreen`.

## Build

Use JDK 17, Python 3, and the Android SDK with platform 36 and build tools 35.0.0.
Open this directory in Android Studio, or set `ANDROID_HOME` and run:

```sh
./gradlew testDebugUnitTest lintDebug assembleDebug
```

The installable test APK is `app/build/outputs/apk/debug/app-debug.apk`. Install
with `adb install -r app/build/outputs/apk/debug/app-debug.apk`, or copy it to a
phone and open it. This is a debug build for evaluation, not a stable release.
GitHub Actions builds the same APK and runs emulator checks. Debug signing keys
may differ between CI runs, so later test builds may need an uninstall first.

## Playback and privacy

The interface and catalogue are bundled in the APK. Audio streams from the
existing HTTPS media host; recordings are not included in the download.
Catalogue and interface updates currently require an app update.

Power, volume, stations, and the sleep ring talk to a native player. Playback
continues when the screen closes, with Android media controls for play/pause.
Station schedules use the same UTC epoch as the website. Two players provide
three-second film transitions. The sleep timer uses a monotonic clock and
fades during its final ten seconds. It pauses when the radio is turned off.

The app handles audio focus, headphone disconnection, and system media controls.
It uses local clock day/night appearance. Location-based daylight is not in the
first Android version, so no location permission is requested. System-level
media controls do not expose film seeking or skipping.

The WebView only loads bundled assets. It cannot fetch remote scripts, frames,
or audio, and external links open in a browser without access to the native
bridge. The native bridge accepts radio controls, never arbitrary file paths or
media URLs. Only controllers with the app's UID can use those custom commands.

Android may stop a foreground service under device-specific battery policies;
real-device background and Bluetooth checks are still required before release.

## Checks completed

The Android 15 emulator check passed native playback, background playback, system
play/pause, station changes, and a full one-minute sleep countdown through shutdown.
Unit tests cover schedule boundaries and retained-audio positions, plus sleep
countdown pause/resume and cancellation. Build and Android lint checks pass.
Physical-device, Bluetooth, and real film-boundary crossfade checks remain.

## F-Droid preparation

Application code is GPL-3.0-only; see the root LICENSE and NOTICE.md. The build
uses free/open-source dependencies from Google Maven and Maven Central. The
Gradle wrapper is pinned and checks the distribution SHA-256.

Before submitting to the main F-Droid repository:

- Sign and tag the first public release after device checks.
- Finish real-phone checks for background playback, calls, Bluetooth, sleep,
  network loss, rotation, and accessibility.
- Review the distributed catalogue's rights. The existing catalogue contains
  films for which we have not established redistribution/streaming permission;
  this prototype is not a rights-cleared F-Droid release.
- Record dependency versions, licenses, screenshots, and store descriptions.
- Tag a release and submit build metadata for F-Droid's source build and review.

No submission has been made. Main-repository acceptance is determined by
F-Droid's review, not by a successful APK build.
