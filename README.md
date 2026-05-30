# Discord Music Bot

Node.js Discord music bot that plays YouTube audio, resolves Spotify metadata, supports slash commands, buttons, queue controls, and voice auto-disconnect.

## Setup

1. Install Node.js 22.12.0 or newer.
2. Install `ffmpeg` and `yt-dlp` so both are available in `PATH`.
3. Install dependencies:

```bash
npm install
```

4. Copy `.env.example` to `.env` and fill in Discord credentials. Spotify credentials are optional.
5. Register slash commands:

```bash
npm run deploy
```

6. Start the bot:

```bash
npm start
```

## Build The Windows Launcher

The one-click launcher is built from the Rust project in `launcher/`. Install Rust/Cargo first, then run:

```powershell
cd .\launcher
cargo build --release
Copy-Item -LiteralPath .\target\release\discord-music-bot-launcher.exe -Destination "..\Discord Music Bot.exe" -Force
```

The copied `Discord Music Bot.exe` opens the Bogos control panel from the project root. Both the copied exe and `launcher/target/` are local build outputs and are ignored by Git.

## Notes

- Spotify links are used for metadata, then resolved to YouTube audio. Spotify API credentials are optional; public metadata fallbacks are used when credentials are missing or blocked.
- Playlist and album imports are capped at 100 tracks.
- The bot keeps queue/player state isolated per guild.
- See [CHANGELOG.md](CHANGELOG.md) for completed features, fixes, and known limitations.
