# Bogos Troubleshooting

## Slash Command Does Not Appear

Run:

```powershell
npm run deploy
```

Then reload Discord with `Ctrl+R`.

Make sure Bogos was invited with the `applications.commands` scope.

## Bot Starts But Does Not Play Audio

Run `/status` in Discord to check the current voice connection, playback state, queue, FFmpeg, yt-dlp, Node.js, and discord.js diagnostics.

Check:

```powershell
ffmpeg -version
yt-dlp --version
```

Also confirm you are in a voice channel and Bogos has `Connect` and `Speak`.

## Spotify Links Are Wrong Or Fail

Spotify support is best-effort.

Known behavior:

- Spotify track links may use a fallback if Spotify Web API access is restricted.
- The fallback can choose the wrong YouTube video.
- Spotify playlists and albums need Spotify Web API access.

Use direct YouTube links when accuracy matters.

## Large Playlists Take Time

YouTube playlists queue with lightweight metadata first, then resolve audio as each song starts. Spotify playlists and albums still depend on Spotify Web API access.

## Long Video Seeking Lags

Forward and rewind restart FFmpeg and reopen the stream. Long videos can lag more than normal songs.

## Interaction Errors

Button and dropdown interactions must be acknowledged quickly. The current handlers defer before slow playback work. If `Unknown interaction` appears again, check any recently changed button/select handler.
