const VoteSkip = require("../music/VoteSkip");
const { canSkipDirectly } = require("./permissions");

async function requestSkip(interaction, client, voiceChannel) {
  const direct = canSkipDirectly(interaction);
  if (direct.ok) {
    await client.player.skip(interaction.guildId);
    return "Skipped.";
  }

  const queue = client.player.getQueue(interaction.guildId);
  const vote = VoteSkip.addVote(interaction.guildId, queue, voiceChannel, interaction.user.id);
  if (!vote.ok) return vote.message;

  if (vote.passed) {
    VoteSkip.clear(interaction.guildId);
    await client.player.skip(interaction.guildId);
    return `Vote skip passed (${vote.votes}/${vote.threshold}). Skipped.`;
  }

  const prefix = vote.alreadyVoted ? "You already voted." : direct.message;
  return `${prefix} Vote skip: ${vote.votes}/${vote.threshold}.`;
}

module.exports = {
  requestSkip
};
