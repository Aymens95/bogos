# Bogos Developer Notes

## Important Rules

- Do not rewrite the bot from scratch.
- Preserve the current audio pipeline unless intentionally replacing it.
- Do not reintroduce `@discordjs/opus` or `ffmpeg-static` without a clear reason.
- Run `npm run check` after JavaScript changes.
- Run `npm run deploy` after slash command changes.
- Do not commit `.env`, `data/`, `node_modules/`, or `launcher/target/`.

## Audio Pipeline

```text
YouTube URL
-> yt-dlp extracts best audio stream URL, or a low-bandwidth audio-bearing HLS fallback for live streams
-> ffmpeg reads stream and ignores any video track
-> optional equalizer/volume filters via -af
-> ffmpeg outputs Ogg Opus
-> @discordjs/voice plays StreamType.OggOpus
```

Bogos uses system `ffmpeg` and system `yt-dlp`.

## Storage

Use `src/utils/storage.js` for JSON persistence.

Current data files:

- `data/playlists/{guildId}.json`
- `data/favorites/{userId}.json`
- `data/settings/{guildId}.json`
- `data/queues/{guildId}.json`
- `data/history/{guildId}.json`

`data/` is ignored by Git.

## Logging

Use `src/utils/logger.js` for new logs.

Logs are structured as timestamped single-line records with `level message key=value` fields. The logger redacts common bot token and bearer token patterns.

Optional environment variables:

- `BOGOS_LOG_FILE` - append logs to a file, for example `logs/bogos.log`
- `BOGOS_DEBUG=1` - enable debug logs

Startup logs include dependency checks for Node.js, FFmpeg, and yt-dlp. Command logs include command name, guild ID, user ID, and duration in milliseconds.

## Interaction Handling

For buttons and select menus:

- acknowledge interactions before slow work
- use `deferUpdate()` for silent control updates
- use `flags: 64` for ephemeral replies
- avoid deprecated `ephemeral: true`

## Project Context

For future AI or developer sessions, read the root `PROJECT_CONTEXT.md` first.
