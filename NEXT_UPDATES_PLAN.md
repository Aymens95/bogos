# Bogos - Next Updates Plan

## Purpose

This plan is for the next development session. Bogos is already working, so every update must be additive, stable, and reviewed carefully before moving to the next phase.

Primary goals:

- Improve the development and restart workflow with a GUI launcher/control panel.
- Improve playlist loading speed and search accuracy.
- Add useful moderation, diagnostics, and quality-of-life features.
- Keep the codebase clean, maintainable, and easy to reason about.

Do not rewrite Bogos from scratch.

Before starting, read:

```text
PROJECT_CONTEXT.md
docs/developer-notes.md
```

Recommended new-session prompt:

```text
Use bogos-maintainer and read PROJECT_CONTEXT.md first. Then implement NEXT_UPDATES_PLAN.md phase by phase.
```

---

## Critical Rules

1. Make one phase at a time.
2. Run `npm run check` after every code phase.
3. Run `npm run deploy` after slash command changes.
4. Restart and test Bogos after changes that affect runtime behavior.
5. Do not change the working audio pipeline unless the phase specifically requires it.
6. Preserve current confirmed features:
   - text search playback
   - YouTube link playback
   - queue buttons/dropdown
   - equalizer
   - saved playlists
   - favorites
   - auto-disconnect cleanup
7. For interaction handlers, acknowledge Discord interactions before slow work.
8. Use `flags: 64` for ephemeral replies.
9. Keep `.env`, `data/`, `node_modules/`, and `launcher/target/` out of Git.
10. Update `PROJECT_CONTEXT.md` and `docs/` when architecture, setup, commands, or known issues change.

---

## Phase 1 - GUI Launcher / Control Panel

### Goal

Replace the command-window launcher experience with a small GUI control panel that makes development and restarts smoother.

This phase should not change the bot runtime code unless absolutely necessary. It should wrap the existing commands:

```powershell
npm start
npm run deploy
npm run check
```

### Recommended Scope

Build a lightweight GUI launcher with:

- Start Bot
- Stop Bot
- Restart Bot
- Deploy Commands
- Run Check
- Live logs
- Status indicator
- Dependency checks
- Open useful files/folders
- Optional auto-restart on crash

### Technology Choice

Prefer keeping the current Rust launcher path.

Current launcher:

```text
launcher/
Discord Music Bot.exe
```

Recommended implementation options:

1. Native Rust GUI
   - Lightweight
   - No Electron dependency
   - Fits current Rust launcher

2. Tauri
   - Nice UI
   - More setup
   - Still lighter than Electron

Avoid Electron unless the user explicitly wants a web-style desktop app, because Electron adds significant project weight.

### GUI Features

#### Status Indicator

Show one of:

- Stopped
- Starting
- Running
- Stopping
- Crashed

Status should reflect the actual child process state.

#### Start Bot

Runs:

```powershell
npm start
```

Rules:

- Disable Start while already running.
- Set status to Starting immediately.
- Set status to Running once output includes `Logged in as`.
- If the process exits unexpectedly, set status to Crashed.

#### Stop Bot

Stops the running bot process.

Rules:

- Prefer graceful termination.
- If graceful stop fails, allow a forced stop.
- Set status to Stopped after process exit.
- Do not leave orphan Node processes.

#### Restart Bot

Runs:

```text
Stop Bot -> Start Bot
```

Rules:

- Restart must not spawn duplicate bot processes.
- Restart should preserve the log panel unless the user clicks Clear Logs.

#### Deploy Commands

Runs:

```powershell
npm run deploy
```

Rules:

- Disable while the bot process is starting/stopping if it risks confusion.
- Show output in logs.
- Surface success clearly when output includes registered command count.

#### Run Check

Runs:

```powershell
npm run check
```

Rules:

- Show pass/fail in logs and status area.
- This is useful after code edits before restarting.

#### Live Logs

Show stdout/stderr from:

- `npm start`
- `npm run deploy`
- `npm run check`

Controls:

- Clear Logs
- Save Logs
- Copy Logs

Suggested log file path:

```text
logs/bogos-launcher.log
```

Add `logs/` to `.gitignore`.

#### Dependency Checks

Show pass/fail for:

```powershell
node -v
npm -v
ffmpeg -version
yt-dlp --version
```

Also check:

- `.env` exists
- `node_modules` exists
- `package.json` exists
- `src/index.js` exists

Do not print secrets from `.env`.

#### Open Buttons

Add buttons:

- Open Project Folder
- Open `.env`
- Open Docs
- Open `PROJECT_CONTEXT.md`
- Open `NEXT_UPDATES_PLAN.md`

Do not build a full `.env` editor yet. Opening the file is safer.

#### Auto-Restart Toggle

Optional but useful:

- If enabled and Bogos crashes, restart after 5 seconds.
- Do not auto-restart after the user clicks Stop.
- Log every auto-restart attempt.
- Add a max restart loop guard, e.g. 5 crashes in 5 minutes disables auto-restart.

### Stability Requirements

- The GUI must not require changes to the bot process.
- Closing the GUI should ask whether to stop Bogos if it is running.
- The launcher must not start multiple Bogos processes.
- All process handles must be cleaned up.
- Failure states should be visible in the UI and logs.

### Verification

Test:

- Start Bot
- Stop Bot
- Restart Bot
- Deploy Commands
- Run Check
- Clear Logs
- Save Logs
- Open docs/project files
- Start button disabled while running
- Stop button disabled while stopped
- Crash status if the bot process exits with non-zero code
- No orphan Node process after Stop or GUI close

---

## Phase 2 - Lazy Playlist Loading

### Why This Matters

Large playlists currently take 10-15 seconds because Bogos resolves many tracks and YouTube matches before queueing.

This is the highest-value bot feature because it improves the common user experience immediately.

### Goal

Queue playlist items quickly, then resolve YouTube/audio only when each song is about to play.

### Current Behavior

For playlists:

```text
fetch playlist
for every track:
  resolve metadata
  search YouTube
  validate/extract audio
queue songs
```

### Target Behavior

For playlists:

```text
fetch playlist metadata
queue lightweight pending songs immediately
when a song becomes current:
  resolve YouTube URL if missing
  play
```

### Data Model Changes

Add support for songs like:

```js
{
  title,
  artist,
  duration,
  durationFormatted,
  albumArt,
  youtubeUrl: null,
  requestedBy,
  source: "spotify",
  unresolved: true,
  searchQuery: "title artist"
}
```

For YouTube playlist entries, store:

```js
{
  title,
  artist,
  youtubeUrl,
  unresolved: false
}
```

### Implementation Notes

- Add a resolver step in `Player.playCurrent()`.
- If current song has no `youtubeUrl`, resolve it right before playback.
- Update the Now Playing embed after resolution.
- If a song fails to resolve, mark it failed and skip to the next song.
- Do not block `/play` until every song is resolved.

### Files Likely To Modify

- `src/music/resolveInput.js`
- `src/music/Player.js`
- `src/music/MusicQueue.js`
- `src/utils/embedBuilder.js`
- maybe `src/music/ytdlp.js`

### Stability Requirements

- Normal single-song playback must remain unchanged.
- Direct YouTube links must remain fastest path.
- Failed lazy resolution must not crash the bot.
- Queue dropdown should still show queued metadata even before resolution.
- Favorites/playlists should handle unresolved songs carefully.

### Verification

Test:

- Large YouTube playlist queues quickly.
- Large Spotify playlist, if API works, queues quickly.
- First song starts correctly.
- Later unresolved songs resolve when reached.
- Failed song skips cleanly.
- Queue embed remains accurate.

---

## Phase 3 - Better Spotify / YouTube Matching

### Why This Matters

Spotify fallback can choose the wrong YouTube result, such as a trailer instead of a song.

### Goal

Improve matching quality without making playback fragile.

### Matching Strategy

Use multiple signals:

- title similarity
- artist similarity
- duration difference when known
- avoid obvious non-music results:
  - trailer
  - movie
  - reaction
  - karaoke
  - instrumental
  - lyrics, unless no better result exists
  - live, unless query includes live

### Implementation Ideas

Create:

```text
src/music/matcher.js
```

Functions:

- `scoreYouTubeCandidate(track, candidate)`
- `selectBestCandidate(track, candidates)`
- `normalizeTitle(value)`

Update `ytdlp.js` to return multiple candidate metadata objects instead of only IDs.

### Spotify Fallback Improvements

For oEmbed fallback:

- Use oEmbed title.
- Try parsing artist from common title formats if present.
- Keep fallback marked as low-confidence.

### Stability Requirements

- If scoring fails, fall back to current behavior.
- Avoid slow matching for direct YouTube links.
- Keep matching logic isolated from playback code.

### Verification

Test:

- Known Spotify track that previously matched wrong.
- Plain text song search.
- Songs with remasters.
- Songs with official audio and official video.

---

## Phase 4 - Search Result Picker

### Goal

Allow users to choose from top YouTube results when `/play` search is ambiguous.

### UX

Command option idea:

```text
/play query:<text> choose:<true|false>
```

Or new command:

```text
/search query:<text>
```

Recommended: add `/search` to avoid changing `/play` behavior.

### Behavior

1. User runs `/search query:...`
2. Bot displays top 5 YouTube candidates.
3. User selects one from a dropdown.
4. Bot queues selected result.

### Files Likely To Add

- `src/commands/music/search.js`
- maybe shared search candidate builder in `embedBuilder.js`

### Stability Requirements

- Selection interaction must be acknowledged before slow work.
- Search selection should expire after a reasonable time.
- The picker must not interfere with the queue dropdown.

### Verification

Test:

- `/search` returns candidates.
- Selecting candidate queues and plays it.
- Expired interaction is handled cleanly.

---

## Phase 5 - `/status` Diagnostics Command

### Goal

Add a diagnostics command to help debug Bogos without reading logs.

### Command

```text
/status
```

### Display

Show:

- Bot uptime
- WebSocket ping
- Voice connection state
- Current queue length
- Current song
- Current loop mode
- Current equalizer filter
- Current volume
- FFmpeg available
- yt-dlp available
- Node version
- discord.js version

### Files Likely To Add

- `src/commands/utility/status.js`
- possibly `src/utils/diagnostics.js`

### Stability Requirements

- Diagnostics must not block for too long.
- External binary checks should have a timeout.
- Never print tokens or secrets.

### Verification

Test:

- `/status` while stopped
- `/status` while playing
- `/status` after pause
- `/status` after equalizer change

---

## Phase 6 - DJ Role And Vote Skip

### Goal

Give server owners more control over playback actions.

### Features

#### DJ Role

Add server setting:

```text
/settings dj-role role:<role>
```

Restricted actions:

- stop
- skip
- clear
- shuffle
- move
- volume
- equalizer

Admins should always bypass restrictions.

#### Vote Skip

If no DJ role or user lacks DJ role:

- `/skip` or skip button starts/adds a vote.
- Majority of non-bot users in the voice channel skips.

### Files Likely To Add

- `src/commands/utility/settings.js`
- `src/music/VoteSkip.js`
- `src/utils/permissions.js`
- server settings storage under `data/settings/{guildId}.json`

### Stability Requirements

- Do not lock the server out of controls accidentally.
- Admins must always be able to control playback.
- Vote state resets when song changes.
- Vote state resets on disconnect.

### Verification

Test:

- no DJ role configured
- DJ role configured
- admin bypass
- vote threshold
- vote reset after skip/song change

---

## Phase 7 - Queue Persistence

### Goal

Restore server queue after restart/crash.

### Behavior

Persist:

- queue songs
- current index
- loop mode
- volume

Do not auto-join voice after restart unless explicitly designed later.

Recommended behavior:

- Save queue state periodically and on queue changes.
- On bot startup, load queue state.
- User can run:
  ```text
  /queue restore
  ```
  or `/play` can resume from saved queue if appropriate.

### Stability Requirements

- Do not auto-play unexpectedly on startup.
- Avoid saving corrupt state.
- Keep user data under `data/`.

---

## Phase 8 - Real Autoplay

### Goal

Make autoplay actually add related songs when the queue ends.

### Possible Sources

- YouTube related videos via yt-dlp metadata
- Search based on current song artist/title
- Listening history-based suggestions

### Stability Requirements

- Avoid infinite bad recommendation loops.
- Limit autoplay additions.
- Clearly show autoplay additions in chat.

---

## Phase 9 - Lyrics Command

### Goal

Add:

```text
/lyrics
```

### Requirements

- Use a legal/reliable lyrics provider.
- Handle missing lyrics gracefully.
- Avoid huge embeds that exceed Discord limits.

### Stability Requirements

- Do not scrape fragile sites unless accepted.
- Do not block playback.

---

## Phase 10 - Better Queue UI

### Goal

Improve queue navigation and display.

### Ideas

- `/queue page:<number>`
- better page buttons
- compact queue embeds
- show current page count
- show total duration if cheap to calculate

### Stability Requirements

- Do not exceed Discord component or embed limits.
- Keep dropdown custom IDs unique.
- Acknowledge interactions before slow work.

---

## Phase 11 - Playback History

### Goal

Add:

```text
/history
/history play position:<number>
```

### Behavior

- Track recently played songs per server.
- Allow replaying from history.
- Limit history length, e.g. 50 songs per guild.

### Stability Requirements

- Avoid unbounded memory growth.
- Optionally persist history under `data/history/`.

---

## Phase 12 - Per-Server Settings

### Goal

Store configurable behavior per server.

### Settings Ideas

- default volume
- default loop mode
- default equalizer
- DJ role
- max queue size
- autoplay default
- command text channel

### Command

```text
/settings view
/settings set ...
```

### Stability Requirements

- Validate all values.
- Admin-only for settings changes.
- Store under `data/settings/{guildId}.json`.

---

## Phase 13 - Health And Maintenance Improvements

### Goal

Make the bot easier to maintain.

### Ideas

- structured logger utility
- optional log file output
- improved error messages
- command-level timing logs
- startup dependency check
- update docs automatically when commands change

### Stability Requirements

- Logs must not include secrets.
- Avoid noisy logs during normal playback.
- Keep user-facing errors concise.

---

## Final Review Checklist For Every Phase

Before calling a phase complete:

1. Run:
   ```powershell
   npm run check
   ```
2. If dependencies changed:
   ```powershell
   npm audit --audit-level=high
   ```
3. If slash commands changed:
   ```powershell
   npm run deploy
   ```
4. Restart Bogos.
5. Test at least one normal song:
   ```text
   /play query:<YouTube link>
   ```
6. Test any feature changed in the phase.
7. Check the terminal/GUI logs for warnings or errors.
8. Update docs if behavior changed.
9. Update `PROJECT_CONTEXT.md` if architecture, setup, or known issues changed.

