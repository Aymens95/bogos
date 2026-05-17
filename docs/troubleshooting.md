# Bogos Troubleshooting

## Slash Command Does Not Appear

Run:

```powershell
npm run deploy
```

Then reload Discord with `Ctrl+R`.

Make sure Bogos was invited with the `applications.commands` scope.

## Bot Starts But Does Not Play Audio

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

Large playlists can take 10-15 seconds because Bogos resolves metadata and YouTube matches before queueing.

Future optimization idea: lazy resolution, where Bogos queues metadata first and resolves each YouTube stream only when the song is about to play.

## Long Video Seeking Lags

Forward and rewind restart FFmpeg and reopen the stream. Long videos can lag more than normal songs.

## Interaction Errors

Button and dropdown interactions must be acknowledged quickly. The current handlers defer before slow playback work. If `Unknown interaction` appears again, check any recently changed button/select handler.

