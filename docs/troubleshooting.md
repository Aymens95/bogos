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

Bogos also logs startup dependency checks for Node.js, FFmpeg, and yt-dlp.

Check:

```powershell
ffmpeg -version
yt-dlp --version
```

Also confirm you are in a voice channel and Bogos has `Connect` and `Speak`.

## Log File

Set `BOGOS_LOG_FILE=logs/bogos.log` in `.env` to append structured logs to a file. Use `BOGOS_DEBUG=1` only when you need extra debug output.

Logs redact common token formats, but avoid pasting full logs publicly without reviewing them first.

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

## Skip Starts A Vote

If no DJ role is configured, `/skip` and the skip button use vote skip. If a DJ role is configured, users without that role also vote instead of skipping directly.

A majority of non-bot users in the voice channel is required. Administrators and users with the configured DJ role skip directly.

## Restore Queue After Restart

Bogos saves each server queue under `data/queues/` as songs are added, moved, skipped, or removed.

After a restart, join a voice channel and run `/queue action:restore` to reload the saved queue and start playback. Startup never auto-joins voice or auto-plays by itself.

## Autoplay Stops

Autoplay searches YouTube from the last song's artist or title and adds one related song when the queue ends.

It skips obvious non-song results and stops after a bounded run of autoplay additions. If no usable result is found, Bogos reports that autoplay could not find another song and disconnects normally.

## Lyrics Not Found

`/lyrics` uses LRCLIB and defaults to the current song metadata. If no result is found, try `/lyrics query:<song title artist>`.

Some songs may not be available, and long lyrics are truncated to fit Discord embed limits.

## Playback History Is Empty

Playback history starts recording when a song starts playing. It stores the 50 most recent songs per server under `data/history/`.

Run `/history list` after playing at least one song. Use `/history play position:<number>` from voice to queue an entry again.

## Queue Limit Or Wrong Text Channel

Server admins can run `/settings view` to check the queue limit and preferred text channel.

Use `/settings max-queue size:<1-200>` to change the queue cap. Use `/settings text-channel channel:<channel>` to route playback messages to a specific text channel, or omit `channel` to clear it.
