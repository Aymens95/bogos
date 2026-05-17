# Discord Music Bot - Project Context

## Current Status

This is a working Discord music bot for a single Node.js project in `D:\VS\discord-bot`.

## Future Session Skill

Use the local Codex skill `bogos-maintainer` for future maintenance sessions.

Recommended prompt for a new session:

```text
Use bogos-maintainer and read PROJECT_CONTEXT.md first.
```

Skill path:

```text
C:\Users\Kingo\.codex\skills\bogos-maintainer
```

Next planned updates are documented in:

```text
NEXT_UPDATES_PLAN.md
```

Build history and major fixes are summarized in:

```text
PROJECT_SUMMARY.md
```

Confirmed working:
- `/play` by text search
- `/play` with direct YouTube links
- queue controls and dropdown jump
- skip, previous, pause/resume, stop
- rewind/forward buttons
- loop and shuffle buttons
- equalizer filters
- saved server playlists
- per-user favorites
- persistent "Added to Queue" embeds
- Now Playing embed cleanup on disconnect
- one-click Windows launcher: `Discord Music Bot.exe`

Spotify links are lower priority. Spotify track links have a fallback path, but matching can choose the wrong YouTube video. Spotify playlist/album support depends on Spotify Web API access and may fail if the Spotify app credentials are restricted.

## Tech Stack

- Node.js `>=22.12.0`
- `discord.js` `^14.26.4`
- `@discordjs/voice` `^0.19.2`
- `sodium-native` for voice encryption
- `mediaplex` installed, but the active audio pipeline avoids depending on a Node Opus encoder
- `axios` for Spotify HTTP calls
- `dotenv` for `.env`
- system `yt-dlp` binary
- system `ffmpeg` binary

The project intentionally removed:
- `@discordjs/opus`
- `ffmpeg-static`

## Setup

Required host tools:

```powershell
node -v
npm -v
ffmpeg -version
yt-dlp --version
```

Required environment variables are documented in `.env.example`:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

Install and run:

```powershell
npm install
npm run deploy
npm start
```

Use `npm run deploy` after adding, removing, or changing slash commands.

Use `npm run check` before finishing any code change.

## Project Tree

```text
discord-bot/
├── src/
│   ├── index.js
│   ├── deploy-commands.js
│   ├── commands/
│   │   ├── music/
│   │   │   ├── play.js
│   │   │   ├── pause.js
│   │   │   ├── resume.js
│   │   │   ├── skip.js
│   │   │   ├── stop.js
│   │   │   ├── previous.js
│   │   │   ├── nowplaying.js
│   │   │   ├── loop.js
│   │   │   ├── volume.js
│   │   │   ├── seek.js
│   │   │   ├── autoplay.js
│   │   │   └── equalizer.js
│   │   ├── queue/
│   │   │   ├── queue.js
│   │   │   ├── remove.js
│   │   │   ├── clear.js
│   │   │   ├── shuffle.js
│   │   │   └── move.js
│   │   ├── playlists/
│   │   │   └── playlist.js
│   │   ├── favorites/
│   │   │   └── favorites.js
│   │   └── utility/
│   │       ├── help.js
│   │       ├── ping.js
│   │       └── invite.js
│   ├── events/
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── voiceStateUpdate.js
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   ├── eventHandler.js
│   │   ├── buttonHandler.js
│   │   └── selectHandler.js
│   ├── music/
│   │   ├── Player.js
│   │   ├── MusicQueue.js
│   │   ├── Equalizer.js
│   │   ├── Favorites.js
│   │   ├── resolveInput.js
│   │   ├── spotify.js
│   │   └── ytdlp.js
│   └── utils/
│       ├── constants.js
│       ├── disconnectTimer.js
│       ├── embedBuilder.js
│       ├── formatDuration.js
│       ├── linkParser.js
│       ├── storage.js
│       └── voiceChecks.js
├── scripts/
│   └── check.js
├── launcher/
│   └── Rust source for the Windows launcher
├── data/
│   ├── playlists/
│   └── favorites/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── Discord Music Bot.exe
```

`data/`, `.env`, `node_modules/`, and `launcher/target/` are ignored by Git.

## Architecture

`src/index.js` creates the Discord client, loads commands/events, creates `client.player`, and logs in.

`src/handlers/commandHandler.js` recursively loads all command files under `src/commands`.

`src/events/interactionCreate.js` routes:
- slash commands to `commandHandler`
- buttons to `buttonHandler`
- queue dropdowns to `selectHandler`

`Player.js` owns per-guild playback, voice connections, FFmpeg spawning, Now Playing updates, disconnect cleanup, and playback controls.

`MusicQueue.js` owns per-guild queue state:
- songs
- current index
- history
- loop mode
- volume
- Now Playing message reference
- disconnect notification reference

`Equalizer.js` stores active filter per guild in memory. Filters reset on disconnect.

`Favorites.js` stores per-user favorites in `data/favorites/{userId}.json`.

`playlist.js` stores per-server playlists in `data/playlists/{guildId}.json`.

## Audio Pipeline

Input resolution:
- YouTube video link: use directly
- YouTube playlist link: flat playlist extraction
- plain text search: `yt-dlp` search
- Spotify track: Spotify Web API, with public oEmbed fallback if Spotify API returns premium restriction
- Spotify playlist/album: Spotify Web API only

Playback:

```text
YouTube URL
-> yt-dlp extracts best audio stream URL
-> ffmpeg reads stream
-> optional equalizer/volume filters via -af
-> ffmpeg outputs Ogg Opus
-> @discordjs/voice plays StreamType.OggOpus
```

The bot uses system `ffmpeg` and system `yt-dlp`; do not reintroduce `ffmpeg-static`.

## Commands

Music:
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

Queue:
- `/queue`
- `/remove`
- `/clear`
- `/shuffle`
- `/move`

Playlists:
- `/playlist save`
- `/playlist load`
- `/playlist list`
- `/playlist delete`
- `/playlist view`

Favorites:
- `/favorites list`
- `/favorites play`
- `/favorites remove`
- `/favorites clear`

Utility:
- `/help`
- `/ping`
- `/invite`

## Buttons And Dropdowns

Now Playing buttons:
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

Important interaction rule:
- Button and dropdown interactions must be acknowledged quickly.
- Normal control buttons call `deferUpdate()` before slow playback work.
- Dropdown jump calls `deferUpdate()` before `playCurrent()`.
- Text responses use `flags: 64` for ephemeral replies, not deprecated `ephemeral: true`.

## Persistent Data

Storage helper: `src/utils/storage.js`.

Data paths:
- `data/playlists/{guildId}.json`
- `data/favorites/{userId}.json`

Writes are atomic-style:
- write temp file
- rename to final file

Missing or corrupt JSON is handled without crashing.

## Known Issues And Tradeoffs

Spotify:
- Spotify API may return `403 Active premium subscription required for the owner of the app`.
- Track fallback uses Spotify oEmbed, but oEmbed does not provide full artist/duration metadata.
- Because fallback metadata can be weak, YouTube matching can pick the wrong video.
- Spotify playlist/album fallback is not implemented.

Large playlist loading:
- Large playlists can take 10-15 seconds because the bot resolves tracks and YouTube matches during load.
- A future optimization would be lazy resolution: queue metadata first, resolve YouTube only when a song is about to play.

Long YouTube videos:
- Rewind/forward can lag on long videos because seeking restarts FFmpeg and reopens the stream.

Equalizer:
- Changing filters restarts the current song from the beginning.
- This is intentional because reliable mid-stream filter changes are not implemented.

## One-Click Launcher

`Discord Music Bot.exe` is a Rust-built launcher.

Launcher source is in `launcher/`.

It:
- locates the project root
- checks for Node/npm
- checks `.env`
- runs `npm install` if `node_modules` is missing
- runs `npm start`

Rebuild:

```powershell
cd D:\VS\discord-bot\launcher
cargo build --release
```

Then copy:

```powershell
copy .\target\release\discord-music-bot-launcher.exe "..\Discord Music Bot.exe"
```

## Future Change Rules

- Do not rewrite the bot from scratch.
- Preserve the current audio pipeline unless the task is explicitly to replace it.
- Do not reintroduce `@discordjs/opus` or `ffmpeg-static` without a specific reason.
- Do not commit `.env`, `data/`, `node_modules/`, or `launcher/target/`.
- Run `npm run check` after JS changes.
- Run `npm run deploy` after slash command changes.
- For button/dropdown handlers, acknowledge interactions before slow work.
- For new persistent user/server data, use `src/utils/storage.js`.
- For new voice-channel commands, use `src/utils/voiceChecks.js`.
- For new embeds/buttons/dropdowns, prefer `src/utils/embedBuilder.js`.
