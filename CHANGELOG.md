# Changelog

All notable Bogos changes made so far are summarized here.

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
- Changed command error logging to avoid dumping full Axios objects and bearer tokens.
- Changed `.gitignore` to ignore `logs/` and `*.log`.
- Removed project planning Markdown files from Git tracking while keeping them local and ignored.
- Removed Markdown file buttons from the launcher panel.

### Fixed

- Fixed launcher panel closing after the bot logged in.
- Fixed Stop Bot leaving orphan `node.exe` processes on some Windows configurations.
- Fixed Stop Bot PowerShell 5.1 issue caused by using reserved `$Pid`/PID-style variable names in process stopping logic.
- Fixed launcher failing on systems where `powershell.exe` exists but is not in `PATH`.
- Fixed Spotify failure logs exposing sensitive Axios configuration.
- Fixed unavailable or failed lazy-resolved songs crashing/stalling playback; they now skip cleanly.
- Fixed failed lazy-resolution edge case that could replay a previous song after removing the last failed item.
- Fixed `/search` sometimes showing repeated placeholder rows like `YouTube video - YouTube (0:00)`.

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
- Confirmed `npm run check` passes after each completed phase.

### Known Issues

- Spotify playlist/album support is currently blocked by Spotify Web API access:
  - `403 Active premium subscription required for the owner of the app`
- Spotify track fallback still depends on weaker oEmbed metadata when Spotify blocks full track metadata.
- Spotify fallback matching is improved, but wrong YouTube matches can still happen when source metadata is weak.
- Spotify playlist lazy loading needs to be revisited after Spotify API access is fixed or a fallback strategy is chosen.
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
