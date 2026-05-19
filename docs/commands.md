# Bogos Commands

## Music

- `/play query:<song or link>` - Play or queue a song, YouTube link, Spotify link, or playlist.
- `/pause` - Pause playback.
- `/resume` - Resume playback.
- `/skip` - Skip the current song.
- `/stop` - Stop playback, clear the queue, and disconnect shortly after.
- `/previous` - Play the previous song.
- `/nowplaying` - Refresh the Now Playing embed.
- `/loop mode:<off|song|queue>` - Set loop mode.
- `/volume level:<1-100>` - Set playback volume.
- `/seek timestamp:<MM:SS>` - Seek to a timestamp.
- `/autoplay` - Toggle autoplay. When enabled, Bogos adds a related YouTube song when the queue ends.
- `/equalizer filter:<filter>` - Apply an FFmpeg audio filter.
- `/lyrics` - Show lyrics for the current song.
- `/lyrics query:<song and artist>` - Search lyrics by title and artist.

## Queue

- `/queue` - Show a compact paged queue view.
- `/queue page:<number>` - Show a specific queue page.
- `/queue action:restore` - Restore the saved queue and start playback from voice.
- `/remove position:<number>` - Remove a song by queue position.
- `/clear` - Clear the queue.
- `/shuffle` - Shuffle upcoming songs while keeping the current song first.
- `/move from:<number> to:<number>` - Move a song to another queue position.

## Saved Playlists

- `/playlist save name:<name>` - Save the current queue as a server playlist.
- `/playlist load name:<name>` - Add a saved playlist to the queue.
- `/playlist list` - List saved playlists on the server.
- `/playlist delete name:<name>` - Delete a saved playlist.
- `/playlist view name:<name>` - View songs in a saved playlist.

## Favorites

- `/favorites list` - View your favorites.
- `/favorites play` - Queue your favorites.
- `/favorites remove position:<number>` - Remove a favorite by position.
- `/favorites clear` - Clear all favorites after confirmation.

## Utility

- `/help` - List available commands.
- `/ping` - Show bot latency.
- `/status` - Show bot, voice, queue, and runtime diagnostics.
- `/settings view` - Show current server settings.
- `/settings dj-role role:<role>` - Set the DJ role. Omit `role` to clear it.
- `/invite` - Show the bot invite URL.

## DJ Role And Vote Skip

When a DJ role is configured, `/stop`, `/clear`, `/shuffle`, `/move`, `/volume`, `/equalizer`, and matching Now Playing controls require that role. Administrators always bypass this restriction.

`/skip` and the skip button use vote skip for users without the DJ role, and also when no DJ role is configured. A majority of non-bot users in the voice channel skips the current song.

## Buttons

The Now Playing embed includes controls for shuffle, previous, pause/resume, skip, loop, remove, rewind, stop, forward, and favorite.
