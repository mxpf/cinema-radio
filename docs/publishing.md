# Publishing Cinema Radio

Destination: https://radio.maxpfennig.haus

GitHub Pages serves the interface. The 45 Opus soundtracks remain outside Git and require HTTPS object storage with byte-range support.

## Launch sequence

1. Enable Cloudflare R2, create a dedicated audio bucket, upload the exact files listed in programme.json, and configure a production media endpoint.
2. Set CINEMA_RADIO_MEDIA_BASE_URL in config.js to that HTTPS endpoint with a trailing slash. Verify partial-content requests and playback.
3. Configure GitHub Pages for GitHub Actions and custom domain radio.maxpfennig.haus.
4. At Porkbun, add CNAME `radio` pointing to `mxpf.github.io`. Preserve other records.
5. Run the manual Publish radio workflow. It tests behavior and publishes only the interface, config, fonts and CNAME. It refuses publication without an HTTPS media location.
6. Confirm DNS and TLS, enforce HTTPS, and test live playback and controls.

The Keepinghaus credit remains on the page. This is an independent subdomain deployment, not a release of the Keepinghaus site.
