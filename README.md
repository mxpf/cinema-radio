# Cinema Radio

An ambient, always-on English-language cinema-as-radio service: film soundtracks, no visible video, and no seek, skip, or rewind. Quiet passages belong in the programme. Thrillers, noir, mystery and suspense are welcome; straight horror is excluded.

## Run locally

Open `index.html` in a browser, or serve this folder with a static file server. There is no build step, database, or application server.

The interface and metadata are included. **Audio is not stored in Git.** Place the 87 Opus files listed in `programme.json` into `audio/`, or set `CINEMA_RADIO_MEDIA_BASE_URL` in `config.js` to their object-storage URL prefix. Keep the exact filenames from the catalogue. A clone will display the radio without media, but playback needs those files.

## Stations and controls

- **Repertory** — all 80 films.
- **Noir & Mystery** — 21 films.
- **Comedy** — 20 films.
- **Drama & Romance** — 20 films.
- **Musicals** — 19 films.
- **Sci-Fi** — 7 titles: four Doctor Who episodes, two Star Wars films, and Prisoners of the Lost Universe (1983).

The right-hand wheel changes stations: drag up/down, scroll, tap for the next station, or use keyboard arrows. Each station has its own continuously repeating schedule anchored to 26 September 2026 at 00:00 UTC. Listeners join the current scheduled position. The selected station is remembered locally when browser storage is available.

The outer ring sets sleep from 0–60 minutes; its marker counts down. The inner cone controls volume. The centre button switches power with a short audio fade. Manual power-off freezes sleep; power-on resumes it. Sleep fades during the final 30 seconds. Station changes are silent, followed by a gentle audio fade-in.

The amber screen has a fixed height. Long titles loop left, pausing two seconds at the start of each loop; short titles stay still. Reduced-motion preferences disable the marquee. The film year appears at the bottom right. Fonts are bundled locally.

## Files

- `index.html` — the self-contained radio interface and playback logic.
- `config.js` — audio location.
- `programme.json` — shared catalogue and Repertory order.
- `stations.json` — station membership and durations.
- `manifest.json` — source URLs, working rights basis, hashes and audio measurements.
- `docs/stations.md` — station catalogue.
- `assets/fonts/` — IBM Plex Mono Regular and Medium, with its license.

Schedules and track metadata are embedded in the HTML so local file playback does not require fetching JSON. Keep the embedded records and JSON files aligned when adding films.

## Audio and hosting

Soundtracks use Opus at 96 kbps VBR with static gain toward −23 LUFS and a −2 dBFS sample limiter. Silence is preserved. The complete selected transfers were decoded and duration-checked. Sources have working public-domain listing evidence; this is not a worldwide rights-clearance determination. Full perceptual auditions and scene-by-scene completeness reviews have not been performed.

The deployment uses GitHub Pages and Cloudflare R2 through a read-only streaming Worker. Storage should serve the Opus files with the correct content type and support byte-range requests. The current prototype uses device clocks and can have short loading gaps; it is not sample-accurate or guaranteed gapless. The public destination is https://radio.maxpfennig.haus; the manual GitHub Pages workflow publishes the interface.

## Checks

Run `npm test` (Node.js required; no dependencies to install). The tests cover all station boundaries, tuning, rapid changes, power and sleep fades, keyboard/pointer input, and marquee behavior. These use a lightweight DOM/audio model; they do not replace browser playback or visual testing.

IBM Plex is provided under the license in `assets/fonts/IBM-Plex-LICENSE.txt`. No license is granted here for other project code or media.

## Keepinghaus page

The interface is prepared for `/cinema-radio/` on Keepinghaus, with an unobtrusive inspiration credit and source link. Inspired by [Cinema Radio by Hiran Venugopalan and Arun Sajeev](https://hiran.in/projects/cinema-radio/). The source link points to this repository.

Copy `index.html`, `config.js`, and `assets/` together into the site's `cinema-radio/` directory. Configure the media URL before publication; local audio symlinks are not a deployment. The Keepinghaus bounded release must explicitly admit this new page and its assets before deploying it.

## Mac menu bar app

See [macos/README.md](macos/README.md). The universal Mac app loads the live radio and keeps its player alive when the popover closes. Initial builds are ad-hoc signed, not notarized.

## Local day and night appearance

The radio uses the listener’s device time: daytime is 07:00–18:59, night is 19:00–06:59. It checks once per minute and when returning to the page. No location permission, location service, or clock data collection is needed. The station schedule still uses UTC.

The sunrise button beside GitHub optionally requests browser location permission. Only a coarse location (rounded to 0.1°) is saved in local storage, and SunCalc 2.0.2 calculates daylight locally. No coordinates are sent to an application server or third-party solar API. Click again to forget the location and restore fixed clock hours. Saved coordinates remain until disabled; turn off and re-enable after travelling to refresh them. Polar daylight/night is supported. Permission denial, timeout and unavailable location preserve the clock-based fallback.

SunCalc is bundled under its BSD-2-Clause license in `assets/vendor/suncalc/LICENSE`; upstream: https://github.com/mourner/suncalc.
