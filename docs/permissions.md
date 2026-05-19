# Bogos Permissions

## Required Invite Scopes

When inviting Bogos, select:

- `bot`
- `applications.commands`

## Required Bot Permissions

For the text channel:

- View Channel
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands

For the voice channel:

- View Channel
- Connect
- Speak

## Notes

Bogos can delete its own Now Playing and disconnect notification messages without `Manage Messages`.

`Read Message History` is useful because Bogos has a fallback cleanup that scans recent bot-authored Now Playing embeds.

## DJ Role Settings

Use `/settings dj-role role:<role>` to configure the role allowed to use DJ controls. Use `/settings dj-role` without a role to clear it.

Changing server settings requires `Manage Server` or `Administrator`. Administrators always bypass DJ control restrictions.
