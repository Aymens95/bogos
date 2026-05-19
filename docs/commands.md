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
- `/autoplay` - Toggle autoplay state.
- `/equalizer filter:<filter>` - Apply an FFmpeg audio filter.

## Queue

- `/queue` - Show the queue.
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
- `/invite` - Show the bot invite URL.

## Buttons

The Now Playing embed includes controls for shuffle, previous, pause/resume, skip, loop, remove, rewind, stop, forward, and favorite.
