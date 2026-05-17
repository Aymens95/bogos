# Bogos Project Summary

## Purpose

This file summarizes the build history, fixes, and major decisions for Bogos, the Discord music bot in this repository.

For current architecture and handoff details, read `PROJECT_CONTEXT.md`.

For future planned work, read `NEXT_UPDATES_PLAN.md`.

---

## Timeline

### Initial Project Plan

- Started from `discord-music-bot-plan.md`.
- Planned a Discord music bot using:
  - Node.js
  - `discord.js`
  - `@discordjs/voice`
  - system `yt-dlp`
  - FFmpeg
  - Spotify metadata
  - slash commands
  - buttons
  - queue dropdown
  - auto-disconnect

### Initial Bot Scaffold

- Created the Node.js project structure.
- Added:
  - `package.json`
  - `.env.example`
  - `.gitignore`
  - `README.md`
  - `src/index.js`
  - `src/deploy-commands.js`
- Added recursive command and event loading.
- Added base event handlers:
  - `ready`
  - `interactionCreate`
  - `voiceStateUpdate`

### Core Music System

- Added per-guild queue state in `MusicQueue.js`.
- Added playback manager in `Player.js`.
- Added wrappers for:
  - `yt-dlp`
  - Spotify API
  - input parsing
  - duration formatting
  - disconnect timers
  - embeds and controls
- Implemented slash commands for:
  - music controls
  - queue controls
  - utility commands

### First Runtime Fixes

- Fixed duplicate Discord component IDs in queue pagination buttons.
- Fixed audio playback corruption by changing FFmpeg output from wrongly declared Opus packets to raw PCM at that stage.
- Later replaced this again during dependency updates with the current Ogg Opus pipeline.
- Added seek offset handling for rewind/forward.
- Fixed queue move behavior to preserve the current song correctly.

### One-Click Launcher

- Created an initial Windows batch/shortcut launcher with a custom icon.
- Then replaced it with a native Rust-built launcher executable.
- Final launcher:
  - `Discord Music Bot.exe`
  - checks Node/npm
  - checks `.env`
  - installs dependencies if `node_modules` is missing
  - runs `npm start`
- Removed the old `.bat`, `.lnk`, and temporary shortcut generator files.
- Fixed Windows npm launch issue by running npm through `cmd /C`.

### Embed Lifecycle Updates

- Applied `discord-music-bot-modifications.md`.
- Added persistent "Added to Queue" embeds.
- Added deletion of Now Playing embed after disconnect.
- Added fallback cleanup for recent stale Now Playing embeds.
- Kept "Added to Queue" embeds permanent.

### Dependency Update

- Applied Phase 1 of `discord-music-bot-update-plan.md`.
- Removed:
  - `@discordjs/opus`
  - `ffmpeg-static`
- Updated/installed:
  - `discord.js`
  - `@discordjs/voice`
  - `sodium-native`
  - `axios`
  - `dotenv`
  - `mediaplex`
- Required Node.js was raised to `>=22.12.0`.
- Verified system FFmpeg works.
- Found that `mediaplex` is installed but not used by the current `prism-media` Opus encoder path.
- Changed the playback pipeline to avoid a Node Opus encoder:

```text
YouTube URL
-> yt-dlp extracts stream URL
-> ffmpeg reads stream
-> optional filters/volume
-> ffmpeg outputs Ogg Opus
-> @discordjs/voice plays StreamType.OggOpus
```

### Spotify Fixes

- Discovered Spotify Web API returned:

```text
403 Active premium subscription required for the owner of the app
```

- Added a Spotify track fallback using Spotify oEmbed.
- Improved YouTube search so it checks up to five candidates and skips unavailable results.
- Known issue remains: Spotify fallback can match the wrong YouTube video because metadata is limited.

### Equalizer Feature

- Added `Equalizer.js`.
- Added `/equalizer`.
- Implemented FFmpeg `-af` filters:
  - Normal
  - Bass Boost
  - Nightcore
  - Vaporwave
  - 8D Audio
  - Soft
  - Treble Boost
  - Loud
- Added active filter display to Now Playing embed.
- Reset filters on disconnect.
- Confirmed equalizer works.

### Saved Playlists And Favorites

- Added JSON storage helper in `src/utils/storage.js`.
- Added `data/` to `.gitignore`.
- Added saved server playlist command:
  - `/playlist save`
  - `/playlist load`
  - `/playlist list`
  - `/playlist delete`
  - `/playlist view`
- Added per-user favorites:
  - `Favorites.js`
  - `/favorites list`
  - `/favorites play`
  - `/favorites remove`
  - `/favorites clear`
- Wired the Now Playing favorite button.
- Replaced disabled heart button with toggle behavior.
- Confirmed playlists and favorites work.

### Loop And Shuffle Fixes

- Added `constants.js` for loop mode values.
- Updated loop state usage to use shared constants.
- Fixed shuffle so the current song stays first.
- Added guard for empty/single-song shuffle.
- Confirmed loop and shuffle button behavior works.

### Interaction Timing Fixes

- Fixed skip button `Unknown interaction` errors by acknowledging button interactions before slow playback work.
- Fixed queue dropdown `Unknown interaction` errors by acknowledging before `playCurrent()`.
- Converted deprecated `ephemeral: true` options to `flags: 64`.
- Confirmed warnings and interaction errors are gone.

### Validation And Cleanup

- Added `scripts/check.js`.
- Updated `npm run check` to validate every JavaScript file under `src/`.
- Ran:

```powershell
npm run check
npm audit --audit-level=high
```

- Confirmed zero high-severity audit issues after dependency update.

### Documentation And Handoff

- Added `.env.example` for GitHub upload.
- Added `PROJECT_CONTEXT.md`.
- Added `docs/`:
  - setup
  - commands
  - permissions
  - troubleshooting
  - developer notes
- Added `NEXT_UPDATES_PLAN.md`.
- Created and validated the local Codex skill:

```text
C:\Users\Kingo\.codex\skills\bogos-maintainer
```

- Installed `PyYAML` to validate the skill.
- Validation result:

```text
Skill is valid!
```

---

## Current Known Issues

- Spotify fallback can resolve to the wrong YouTube video.
- Spotify playlists/albums depend on Spotify Web API access.
- Large playlists can take 10-15 seconds to load.
- Long YouTube videos can lag when using rewind/forward.
- Equalizer changes restart the current song from the beginning.

---

## Current Stable Commands

Bogos currently registers 22 slash commands:

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
- `/queue`
- `/remove`
- `/clear`
- `/shuffle`
- `/move`
- `/playlist`
- `/favorites`
- `/help`
- `/ping`
- `/invite`

---

## Recommended Next Session Start

Use:

```text
Use bogos-maintainer and read PROJECT_CONTEXT.md first. Then read NEXT_UPDATES_PLAN.md and start with Phase 1.
```

