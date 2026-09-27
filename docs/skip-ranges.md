# Per-film skip ranges

Skip studio roars, non-musical studio bumpers, certificate cards and added uploader intros where verified against the actual recording. Preserve fanfares, opening scores, dialogue, credits accompanied by music, and quiet scenes. Never apply a blanket opening cut.

The original audio files and backups remain intact. In `programme.json`, an optional `skip` array stores start/end pairs in source-file seconds. For example, `"skip": [[0, 15], [5400, 5430]]` skips the first 15 seconds and 90:00–90:30. These are illustrative timestamps only. Each actual cut needs a `skip_review` note recording its basis.

Run `python3 scripts/sync-catalogue.py`, then `npm test`, and publish. The script validates ranges, updates broadcast durations and embeds the catalogue. Source `duration` remains unchanged. Overlapping ranges are merged; invalid ranges and wholly removed films are rejected.

Shared UTC schedules count only retained audio. Joining mid-film and crossing a cut map to the correct original timestamp. Films without ranges play in full. Revised ranges change the affected station's schedule; listeners need to reload for updates.

## Review status

No skip ranges are active yet. Source-video opening frames were checked for Anna Christie, Royal Wedding, Till the Clouds Roll By and The Last Time I Saw Paris. Royal Wedding and The Last Time I Saw Paris already begin with their title sequences in these copies. The two other recordings show MGM logos, but exact audio cut points have not been auditioned; no cut was inferred from the logo alone.
