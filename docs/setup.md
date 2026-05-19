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
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

Spotify is only used for metadata. YouTube links and text search are the most reliable playback paths.

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
