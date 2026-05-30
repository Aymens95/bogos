const votesByGuild = new Map();

function getSongKey(queue) {
  const song = queue.getCurrent();
  if (!song) return null;

  const stableId = song.youtubeUrl || song.searchQuery || `${song.title}:${song.artist || ""}`;
  return `${queue.currentIndex}:${stableId}`;
}

function getThreshold(voiceChannel) {
  const listeners = voiceChannel.members.filter((member) => !member.user.bot).size;
  return {
    listeners,
    threshold: Math.max(1, Math.floor(listeners / 2) + 1)
  };
}

function addVote(guildId, queue, voiceChannel, userId) {
  const songKey = getSongKey(queue);
  if (!songKey) {
    return {
      ok: false,
      message: "Nothing is playing."
    };
  }

  let entry = votesByGuild.get(guildId);
  if (!entry || entry.songKey !== songKey) {
    entry = {
      songKey,
      votes: new Set()
    };
    votesByGuild.set(guildId, entry);
  }

  const alreadyVoted = entry.votes.has(userId);
  entry.votes.add(userId);

  const { listeners, threshold } = getThreshold(voiceChannel);
  return {
    ok: true,
    alreadyVoted,
    passed: entry.votes.size >= threshold,
    votes: entry.votes.size,
    threshold,
    listeners
  };
}

function clear(guildId) {
  votesByGuild.delete(guildId);
}

module.exports = {
  addVote,
  clear
};
