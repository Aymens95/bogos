# Bogos Setup

## Requirements

Install these on the host machine:

- Node.js `22.12.0` or newer
- npm
- FFmpeg in system `PATH`
- yt-dlp in system `PATH`

Check them with:

```powershell
node -v
npm -v
ffmpeg -version
yt-dlp --version
```

## Environment

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

Spotify credentials are optional. If they are present, Bogos tries the Spotify Web API first. If they are missing or the API is blocked, Bogos uses public Spotify oEmbed/embed metadata fallback paths.

Spotify is only used for metadata. YouTube links and text search remain the most reliable playback paths.

## Install

```powershell
npm install
```

## Register Slash Commands

Run this after first setup and whenever slash commands change:

```powershell
npm run deploy
```

## Start Bogos

```powershell
npm start
```

On Windows, you can also double-click:

```text
Discord Music Bot.exe
```

This opens the Bogos control panel. It can start, stop, restart, deploy slash commands, run checks, show live logs, and open common project files.

Launcher logs are written to:

```text
logs/bogos-launcher.log
```

## Build The Windows Launcher

The launcher source lives in `launcher/` and requires Rust/Cargo only when you want to rebuild the executable.

From the project root:

```powershell
cd .\launcher
cargo build --release
Copy-Item -LiteralPath .\target\release\discord-music-bot-launcher.exe -Destination "..\Discord Music Bot.exe" -Force
```

This refreshes the root `Discord Music Bot.exe` that opens the Bogos control panel. The copied exe and `launcher/target/` are local build outputs and are ignored by Git.
