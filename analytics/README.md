# Trackinghaus for Offscreen

[Open the report](https://offscreen-trackinghaus.maxpfennighaus.workers.dev/).

A small adaptation of [Trackinghaus](https://github.com/mxpf/trackinghaus)'s aggregate-only approach for listening rather than reading. This is a separate Cloudflare Worker and D1 database; it does not change or share counters with the Thinkinghaus installation. The dashboard is public.

## What the numbers mean

- **Visits:** once per tab session per day, using a browser-local session-storage flag. These are not unique visitors. If storage is unavailable, each page opening counts.
- **Play starts:** the first observed audio advancement after power-on or a station change. Buffering resumes and crossfades do not create extra starts.
- **Listening hours:** observed advancement of audio while powered on, excluding pauses, buffering and seek jumps. Overlapping crossfade decks count once. Muted playback still counts; the browser cannot know whether speakers are audible.
- **Mac download clicks:** clicks on the download link, not completed downloads or installations.
- **Sources:** direct, search, social, or referral. No referring URL is submitted.

The report compares seven calendar days including today with the preceding seven, using America/New_York. Today is incomplete. Counters are estimates, not billing-grade measurements: background throttling, blockers, network failures and closing the app can lose updates. Unauthenticated public collection is also susceptible to fabricated events, although only bounded, known categories are accepted. No unique-person or average-session claims are made.

Listening sends small totals roughly once per minute, and when hiding or leaving the page. No raw event log is kept: each accepted contribution increments a daily counter directly. There are no visitor IDs, cookies, IP or user-agent fields, film titles, page paths, query strings, location coordinates, or raw referrers in the stored data. The browser submits no credentials and suppresses the HTTP referrer. Cloudflare necessarily receives network requests as the host; application request logging is disabled. Do Not Track and Global Privacy Control prevent collection, with an additional server check of their request headers.

The browser and live-site Mac wrapper are covered. Local previews and the Android prototype are excluded. The script never controls playback, and collection failures do not interrupt it.

## Maintenance

`assets/analytics.js` samples the minimal playback snapshot exposed by `index.html`. `analytics/worker.mjs` validates counters and provides `/api/stats`. `analytics/dashboard.html` renders the report. D1 stores only `day`, `metric`, `station`, `source` and the total `value`.

```sh
npx wrangler d1 execute offscreen-analytics --remote --file analytics/schema.sql
npx wrangler deploy --config analytics/wrangler.jsonc
npm test
```

Deploy the collector before publishing a changed website. Add new station IDs to the collector's allowlist when expanding the catalogue. The endpoint accepts collection only from the production site origin. A manual smoke-test counter must be subtracted after verification so it does not enter the report.

The report reuses the Trackinghaus page style and its licensed Untitled Sans webfonts. The fonts are proprietary and are not covered by the application's GPL license; retain the same font-license restrictions documented in `NOTICE.md`.
