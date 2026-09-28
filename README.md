# Offscreen

An app for listening to films as you work. Online and for Mac.

Offscreen plays movie soundtracks through a small, radio-like player. Choose a station and tune into whatever is playing. There's no video to watch, and you don't need to follow every scene. Dialogue, music, and quiet passages are all part of the experience.

**[Listen online](https://radio.maxpfennig.haus/)** · **[Download for Mac](https://github.com/mxpf/offscreen/releases/tag/v0.2.0)**

## Listening

Press the centre button to turn the radio on. The inner dial controls volume; the outer ring sets a sleep timer of up to an hour. The wheel on the right changes stations—drag it, scroll over it, or tap to move to the next one. The controls also work with a keyboard.

Everyone on the same station joins the same point in its schedule, like a broadcast. Films crossfade over three seconds. Sleep gently fades the sound during the final ten seconds, then turns the radio off. Turning it off yourself pauses the sleep countdown until you turn it back on.

The catalogue currently has 112 films across seven stations:

| Station | Films |
| --- | ---: |
| Repertory — the whole collection | 112 |
| Noir & Mystery | 24 |
| Comedy | 18 |
| Drama & Romance | 19 |
| Musicals | 20 |
| Sci-Fi & Fantasy | 26 |
| Westerns | 5 |

The radio switches between day and night appearances using your local time. The sunrise button can use your location to follow local sunrise and sunset instead. This is optional: daylight is calculated on your device, and only a rounded location is saved in your browser. Press the button again to forget it. Without location, daytime runs from 7 a.m. to 7 p.m.

## Mac app

The menu bar app keeps playing when you close its panel. Click its icon to bring the radio back, or right-click for power, reload, and quit. It loads the live website, so changes to the radio and catalogue appear without downloading a new app; changes to the Mac app itself need a new build.

It supports Apple silicon and Intel Macs running macOS 15.4 or later and needs an internet connection. The current download is a prerelease and isn't notarized, so macOS may ask you to approve it in Privacy & Security.

See the [Mac app README](macos/README.md) for build instructions.

## Android prototype

An Android version is in development with native background playback and the same radio interface. See the [Android README](android/README.md) for builds, testing, and F-Droid preparation. It is not yet listed on F-Droid.

## Run it locally

Clone this repository and open `index.html` in a browser. You can also serve the folder with any static file server. There's no build step or dependency installation for the website.

`config.js` already points to the hosted audio, so a clone can play with an internet connection. The audio files themselves aren't included in Git. To use your own hosting, change `CINEMA_RADIO_MEDIA_BASE_URL`; to use local files, set it to `audio/` and put the files there using the names in `programme.json`.

## How it's built

The website is plain HTML, CSS, and JavaScript, hosted on GitHub Pages. Audio lives in Cloudflare R2 and streams through a read-only Worker. There is no database or continuously running application server.

Each station has a repeating schedule calculated from a shared UTC start time and the films' durations. Two audio players overlap at film boundaries, with Web Audio controlling the fades. Playback depends on the device clock and network connection; it isn't sample-accurate, and slow loading can still cause a gap.

The main files are:

| File | Purpose |
| --- | --- |
| `index.html` | Radio interface, controls, and playback |
| `theme.js` | Day/night appearance and optional sunrise/sunset timing |
| `config.js` | Audio host address |
| `programme.json` | Film titles, audio filenames, durations, and playback order |
| `stations.json` | Station membership and schedule durations |
| `manifest.json` | Source records, hashes, and audio measurements |
| `media-worker/` | Audio streaming Worker |
| `macos/` | Mac app source and build script |

The player embeds the catalogue so it can also open directly from a local file. After editing the catalogue or station membership, regenerate that embedded data and run the checks:

```sh
python3 scripts/sync-catalogue.py
npm test
```

Python 3 is needed for the catalogue script and Node.js for the tests. The tests cover schedules, controls, fades, title scrolling, themes, audio streaming, and optional skip ranges. Browser playback and visual checks are still useful alongside them.

The **Publish radio** GitHub Actions workflow deploys the website manually. Audio is uploaded separately. For more detail, see [audio transitions](docs/audio-transitions.md) and [optional intro skips](docs/skip-ranges.md). No intro skips are currently active.

## Credits and licenses

Inspired by [Cinema Radio by Hiran Venugopalan](https://hiran.in/projects/cinema-radio/).

The display uses Bitcount Grid Single. Font files and their licenses are in [assets/fonts](assets/fonts/), including the IBM Plex Mono files retained in the repository. Sunrise and sunset calculations use [SunCalc](https://github.com/mourner/suncalc), bundled with its [BSD-2-Clause license](assets/vendor/suncalc/LICENSE).

The application code is licensed under [GPLv3](LICENSE). See [license notes](NOTICE.md) for artwork and third-party components. Film audio has separate rights; source records in the manifest are not a grant of permission to redistribute it.
