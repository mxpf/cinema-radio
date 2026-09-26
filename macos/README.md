# Cinema Radio for the menu bar

A small macOS AppKit app containing the live radio in a persistent WKWebView. Requires macOS 15.4 or later and an internet connection. Apple silicon and Intel are supported.

Click the radio icon in the menu bar to show or hide the radio. Hiding the transparent panel retains the player. Right-click the icon for power, the website, reload, and quit. The icon turns orange while playing; hover to see the current film and station. Sleep and station controls are the same as the website. System sleep is respected.

Build with `./macos/build.sh` on a Mac with Apple's command-line developer tools. This builds a universal app and applies an ad-hoc signature. This initial build is not Developer ID signed or notarized; downloaded copies may require approval in System Settings → Privacy & Security before first launch.

The app loads https://radio.maxpfennig.haus and receives future radio interface/catalogue changes from that site. It does not download or bundle the soundtracks, start at login, or install a background service.

The app icon is a miniature of the radio, with an ivory case, speaker grille, amber screen, and concentric dial. The build converts `assets/CinemaRadio.png` into all standard macOS icon sizes.

The radio floats in a transparent borderless panel, with no webpage backdrop or native popover frame. Click outside or press Escape to hide it. The web view remains alive for playback.
