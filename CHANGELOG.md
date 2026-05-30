# Changelog

All notable Bogos changes made so far are summarized here.

## 2026-05-30

### Added

- Added live progress bar to the Now Playing embed showing elapsed / total time, auto-updates every 15 seconds.
- Added SoundCloud track and playlist support via `/play` (direct URLs resolved through yt-dlp).
- Added Bandcamp track and album support via `/play` (direct URLs resolved through yt-dlp).
- Added song request channel: users paste song names or links directly into a configured text channel without using slash commands.
- Added `/settings request-channel channel:<channel>` to configure the song request channel.
- Added 24/7 mode: bot stays in the voice channel when the queue ends instead of disconnecting.
- Added `/settings always-on enabled:<true|false>` to toggle 24/7 mode.
- Added loudness normalization (loudnorm): all songs play at a consistent perceived volume using FFmpeg `loudnorm`.
- Added `/settings loudnorm enabled:<true|false>` to toggle loudness normalization.
- Added max song duration limit: songs longer than the configured limit are rejected at queue time.
- Added `/settings max-song-duration minutes:<number>` to configure the duration limit (0 = no limit).
- Added duplicate song detection: `/play` warns and blocks adding a song already present in the queue; playlist imports silently skip duplicates and report how many were filtered.
- Added `/queue action:Export to file` that sends the full queue as a `queue.txt` file attachment.
- Added 6 new equalizer presets: Pop, Jazz, Metal, Classical, Echo, Karaoke.
- Added smarter autoplay using YouTube Mix/Radio for the seed song's video ID before falling back to text search.
- Added `messageCreate` event handler for the song request channel feature.
- Added `GuildMessages` intent to support the song request channel.
- Added `findDuplicatePosition()` method to `MusicQueue` for duplicate detection.
- Added `friendlyError()` helper in `Player` that maps raw yt-dlp error strings to readable Discord messages.
- Added `extractVideoId()` helper in `Autoplay` for YouTube Mix URL construction.

### Changed

- Changed YouTube audio extraction to fall back to a low-bandwidth audio-bearing format when live streams do not expose a separate `bestaudio` stream.
- Changed FFmpeg playback to explicitly ignore video tracks when a live-stream fallback URL includes audio and video together.
- Changed `Player.startAudio()` to start a 15-second progress bar refresh interval per guild and clear it on disconnect.
- Changed `Player.startDisconnectTimer()` to skip the disconnect entirely when 24/7 mode is enabled.
- Changed `Player.skipFailedCurrent()` to use human-readable error messages instead of raw yt-dlp stderr output.
- Changed `Player.startAudio()` to apply the `loudnorm` FFmpeg filter when the server setting is enabled.
- Changed `metadataFromYouTube` in `resolveInput.js` to delegate to a shared `metadataFromYtdlp` helper used by all direct-URL sources (YouTube, SoundCloud, Bandcamp).
- Changed `/settings view` embed to display the four new settings: request channel, 24/7 mode, loudnorm, and max song duration.
- Changed `serverSettings` schema to include `requestChannelId`, `alwaysOn`, `loudnorm`, and `maxSongDuration` with safe defaults so existing guilds auto-migrate.
- Changed autoplay candidate selection to prefer YouTube Mix/Radio results over generic artist-name text searches when a YouTube URL is available for the seed song.

### Known Issues

- Spotify playlist/album Web API access may be blocked:
  - `403 Active premium subscription required for the owner of the app`
- Spotify track fallback still depends on weaker oEmbed metadata when Spotify blocks full track metadata.
- Spotify fallback matching is improved, but wrong YouTube matches can still happen when source metadata is weak.
- Spotify playlist/album public embed fallback is lower confidence and may expose fewer tracks than the full Spotify app.
- Long YouTube videos can lag when using rewind/forward because seeking restarts FFmpeg and reopens the stream.
- Equalizer changes restart the current song from the beginning.
- Song request channel requires the `MessageContent` privileged intent to be enabled in the Discord Developer Portal before adding it to `index.js`.

## 2026-05-19

### Added

- Added the Bogos GUI launcher/control panel opened by `Discord Music Bot.exe`.
- Added launcher controls:
  - Start Bot
  - Stop Bot
  - Restart Bot
  - Deploy Commands
  - Run Check
  - Clear Logs
  - Save Logs
  - Copy Logs
  - Auto-restart on crash
- Added launcher dependency/status checks for Node, npm, FFmpeg, yt-dlp, `.env`, `node_modules`, `package.json`, and `src/index.js`.
- Added launcher open buttons for Project Folder, `.env`, and Docs.
- Added file-backed launcher logs under `logs/`.
- Added lazy playlist loading for YouTube playlists.
- Added lazy YouTube resolution for Spotify playlist/album entries when Spotify metadata is available.
- Added pending song fields:
  - `unresolved`
  - `searchQuery`
- Added failed lazy-resolution skip handling.
- Added preservation of pending resolution fields in saved playlists and favorites.
- Added `src/music/matcher.js` for YouTube candidate scoring.
- Added candidate metadata search through `yt-dlp`.
- Added scored YouTube matching for Spotify-derived tracks and lazy-resolved tracks.
- Added Spotify oEmbed title parsing for better low-confidence fallback metadata.
- Added `scripts/check-matcher.js`.
- Wired matcher assertions into `npm run check`.
- Added `/search query:<text>` as a dedicated YouTube result picker.
- Added a search select menu with 10-minute in-memory expiry.
- Added requester-only protection for search result selection.
- Added fallback metadata enrichment for `/search` results when yt-dlp initially returns only video IDs.
- Added filtering of unresolved `YouTube video - YouTube (0:00)` placeholder rows when real metadata results are available.
- Added `/status` diagnostics for uptime, WebSocket ping, voice connection, playback state, queue, current song, loop mode, equalizer, volume, FFmpeg, yt-dlp, Node.js, and discord.js.
- Added timeout-bound runtime diagnostics helper for external binary checks.
- Added `/settings view` and `/settings dj-role role:<role>` for server DJ role configuration.
- Added persistent server settings under `data/settings/{guildId}.json`.
- Added DJ role restrictions for stop, clear, shuffle, move, volume, equalizer, and matching Now Playing stop/shuffle buttons.
- Added vote skip for `/skip` and the skip button when no DJ role is configured or the user lacks the DJ role.
- Added queue persistence under `data/queues/{guildId}.json`.
- Added `/queue action:restore` to restore a saved queue and start playback explicitly from voice.
- Added real autoplay that queues one related YouTube song when the queue ends.
- Added bounded autoplay recommendation logic that avoids recent duplicates and obvious non-song results.
- Added `/lyrics` for current-song lyrics and `/lyrics query:<song and artist>` for manual lyrics search.
- Added LRCLIB lyrics lookup with plain-lyrics preference, synced-lyrics timestamp stripping, timeout handling, and Discord-length truncation.
- Added compact paged `/queue` view with First/Previous/Next/Last buttons.
- Added `/queue page:<number>`.
- Added persistent per-server playback history under `data/history/{guildId}.json`.
- Added `/history list` and `/history play position:<number>`.
- Added per-server default volume, loop mode, autoplay, max queue size, and preferred text channel settings.
- Added `/settings defaults`, `/settings max-queue`, and `/settings text-channel`.
- Added structured logger utility with optional `BOGOS_LOG_FILE` file output and `BOGOS_DEBUG=1` debug logging.
- Added startup dependency checks for Node.js, FFmpeg, and yt-dlp.
- Added command timing logs.
- Added Spotify playlist/album public embed fallback for cases where Spotify Web API metadata is blocked.
- Added no-key Spotify mode that uses public oEmbed/embed metadata when Spotify API credentials are missing.

### Changed

- Reworked the Rust launcher so it opens `launcher/bogos-control-panel.ps1`.
- Changed launcher process output handling from fragile PowerShell/.NET callbacks to file polling so the panel stays open after bot login.
- Changed Stop Bot behavior to use WMI/CIM process-tree traversal instead of relying only on `taskkill /T`.
- Changed launcher PowerShell discovery to fall back to standard Windows PowerShell install paths when PowerShell is not in `PATH`.
- Changed YouTube playlist loading to use flat playlist metadata instead of fetching full metadata for every item up front.
- Changed Spotify playlist/album handling to queue metadata first instead of resolving every YouTube match before queueing.
- Changed `Player.playCurrent()` to resolve missing YouTube URLs right before playback.
- Changed plain search internals to use candidate metadata while preserving the existing fast `/play` behavior.
- Changed Spotify blocked playlist/album errors to return a clear user-facing Discord message.
- Changed Spotify playlist/album handling to try public embed track rows before failing when the Web API is premium-blocked.
- Changed Spotify credentials from required-for-Spotify-links to optional API enhancement.
- Changed command error logging to avoid dumping full Axios objects and bearer tokens.
- Changed YouTube text search to fall back to fast flat yt-dlp rows when rich metadata search stalls.
- Changed skip behavior so admins and DJs skip directly while other users vote.
- Changed `/queue` to include an optional `action` choice while preserving the default queue display behavior.
- Changed `/autoplay` from a passive flag into active end-of-queue recommendation behavior.
- Changed `/queue` default behavior to show a compact queue embed instead of refreshing Now Playing.
- Changed queue-add commands to enforce the server max queue size setting.
- Changed playback-starting commands to use the preferred text channel setting when configured.
- Changed startup, deploy, command, storage, playback, button, lyrics, and equalizer logs to use the structured logger.
- Changed `.gitignore` to ignore `logs/` and `*.log`.
- Removed project planning Markdown files from Git tracking while keeping them local and ignored.
- Removed Markdown file buttons from the launcher panel.

### Fixed

- Fixed launcher panel closing after the bot logged in.
- Fixed launcher staying stuck on `Starting` after Phase 13 structured logging changed the ready log format.
- Fixed Stop Bot leaving orphan `node.exe` processes on some Windows configurations.
- Fixed Stop Bot PowerShell 5.1 issue caused by using reserved `$Pid`/PID-style variable names in process stopping logic.
- Fixed launcher failing on systems where `powershell.exe` exists but is not in `PATH`.
- Fixed Spotify failure logs exposing sensitive Axios configuration.
- Fixed unavailable or failed lazy-resolved songs crashing/stalling playback; they now skip cleanly.
- Fixed failed lazy-resolution edge case that could replay a previous song after removing the last failed item.
- Fixed `/search` sometimes showing repeated placeholder rows like `YouTube video - YouTube (0:00)`.
- Fixed `/play` and `/search` getting stuck on queries where yt-dlp rich YouTube search hangs or returns channel rows first.

### Verified

- Confirmed launcher Start Bot works.
- Confirmed launcher Stop Bot leaves no Bogos orphan Node processes.
- Confirmed launcher Restart Bot works.
- Confirmed closing the launcher while Bogos is running prompts whether to stop it.
- Confirmed launcher smoke test passes.
- Confirmed YouTube playlist lazy loading queues quickly and plays correctly.
- Confirmed `/search` returns usable results, queues the selected song, and plays correctly.
- Confirmed `npm run deploy` registered 23 slash commands after adding `/search`.
- Confirmed `npm run deploy` registered 24 slash commands after adding `/status`.
- Confirmed `npm run deploy` registered 25 slash commands after adding `/settings`.
- Confirmed `npm run deploy` registered 25 slash commands after updating `/queue`.
- Confirmed `npm run check` passes after adding DJ role and vote skip code.
- Confirmed `npm run check` passes after adding queue persistence.
- Confirmed `npm run check` passes after adding real autoplay.
- Confirmed local yt-dlp autoplay lookup returns a related candidate.
- Confirmed live `/queue action:restore` test restores the saved queue.
- Confirmed live autoplay test adds and plays a related song when the queue ends.
- Confirmed local LRCLIB lookup finds lyrics for a known test query.
- Confirmed live Discord `/lyrics` test passes.
- Confirmed `npm run check` passes after queue UI improvements.
- Confirmed live Discord `/queue` pagination test passes.
- Confirmed local playback history persistence smoke test passes.
- Confirmed live Discord `/history` list and replay test passes.
- Confirmed settings validation smoke test passes.
- Confirmed live Discord settings test passes.
- Confirmed `npm run check` passes after health and maintenance logging changes.
- Confirmed logger file-output/redaction smoke test passes.
- Confirmed live restart/log smoke test passes.
- Confirmed Spotify public embed fallback smoke tests for playlist and album metadata.
- Confirmed local Spotify/YouTube matcher probes select expected candidates for representative ambiguous tracks.
- Added matcher regression assertions for duration-sensitive official-audio selection and scene-style false positives.
- Confirmed local `/play`-style resolution for `DIDINE CANON 16` completes without hanging.
- Confirmed live Discord `/play` and `/search` tests pass after the yt-dlp search fallback fix.
- Confirmed `npm run check` passes after each completed phase.

### Known Issues

- Spotify playlist/album Web API access may be blocked:
  - `403 Active premium subscription required for the owner of the app`
- Spotify track fallback still depends on weaker oEmbed metadata when Spotify blocks full track metadata.
- Spotify fallback matching is improved, but wrong YouTube matches can still happen when source metadata is weak.
- Spotify playlist/album public embed fallback is lower confidence and may expose fewer tracks than the full Spotify app.
- Long YouTube videos can lag when using rewind/forward because seeking restarts FFmpeg and reopens the stream.
- Equalizer changes restart the current song from the beginning.

## Initial Release

### Added

- Created the Node.js Discord music bot project.
- Added Discord client startup and slash command deployment.
- Added recursive command and event loading.
- Added core event handlers:
  - `ready`
  - `interactionCreate`
  - `voiceStateUpdate`
- Added per-guild queue state with `MusicQueue.js`.
- Added playback manager with `Player.js`.
- Added yt-dlp wrapper.
- Added Spotify API wrapper.
- Added input parsing and link detection.
- Added duration formatting.
- Added disconnect timer handling.
- Added embed and component builders.
- Added slash commands for music controls:
  - `/play`
  - `/pause`
  - `/resume`
  - `/skip`
  - `/stop`
  - `/previous`
  - `/nowplaying`
  - `/loop`
  - `/volume`
  - `/seek`
  - `/autoplay`
  - `/equalizer`
- Added queue commands:
  - `/queue`
  - `/remove`
  - `/clear`
  - `/shuffle`
  - `/move`
- Added saved server playlists:
  - `/playlist save`
  - `/playlist load`
  - `/playlist list`
  - `/playlist delete`
  - `/playlist view`
- Added per-user favorites:
  - `/favorites list`
  - `/favorites play`
  - `/favorites remove`
  - `/favorites clear`
- Added utility commands:
  - `/help`
  - `/ping`
  - `/status`
  - `/invite`
- Added Now Playing buttons:
  - shuffle
  - previous
  - pause/resume
  - skip
  - loop
  - remove
  - rewind
  - stop
  - forward
  - favorite
- Added queue dropdown jump control.
- Added persistent "Added to Queue" embeds.
- Added cleanup of Now Playing embeds after disconnect.
- Added JSON storage helper with atomic-style writes.
- Added `.env.example`.
- Added user-facing docs under `docs/`.
- Added `scripts/check.js`.
- Added Rust one-click launcher.

### Changed

- Replaced the earlier launcher batch/shortcut approach with a Rust-built executable.
- Removed the old `.bat`, `.lnk`, and shortcut generator files.
- Removed `@discordjs/opus`.
- Removed `ffmpeg-static`.
- Kept system FFmpeg and system yt-dlp as runtime requirements.
- Raised required Node.js version to `>=22.12.0`.
- Changed playback to the current Ogg Opus FFmpeg pipeline:

```text
YouTube URL
-> yt-dlp extracts stream URL
-> ffmpeg reads stream
-> optional filters/volume
-> ffmpeg outputs Ogg Opus
-> @discordjs/voice plays StreamType.OggOpus
```

### Fixed

- Fixed duplicate Discord component IDs in queue pagination buttons.
- Fixed audio playback corruption from incorrect stream format assumptions.
- Fixed seek offset handling for rewind/forward.
- Fixed queue move behavior so the current song is preserved correctly.
- Fixed shuffle so the current song stays first.
- Fixed empty/single-song shuffle behavior.
- Fixed skip button `Unknown interaction` errors by acknowledging interactions before slow work.
- Fixed queue dropdown `Unknown interaction` errors by acknowledging before playback jumps.
- Replaced deprecated `ephemeral: true` usage with `flags: 64`.
- Fixed Windows npm launcher behavior by running npm through `cmd /C`.

### Verified

- Confirmed text search playback.
- Confirmed direct YouTube link playback.
- Confirmed queue controls and dropdown jump.
- Confirmed skip, previous, pause/resume, stop.
- Confirmed rewind/forward buttons.
- Confirmed loop and shuffle behavior.
- Confirmed equalizer filters.
- Confirmed saved playlists.
- Confirmed favorites.
- Confirmed auto-disconnect cleanup.
- Confirmed zero high-severity audit issues after dependency update.
