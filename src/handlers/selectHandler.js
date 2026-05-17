const { requireSameVoiceChannel } = require("../utils/voiceChecks");

async function handleQueueSelect(interaction, client) {
  if (!interaction.customId.startsWith("queue_select:")) return;

  const voiceCheck = requireSameVoiceChannel(interaction, client);
  if (!voiceCheck.ok) {
    await interaction.reply({ content: voiceCheck.message, flags: 64 });
    return;
  }

  const selected = interaction.values[0];
  if (selected === "empty") {
    await interaction.deferUpdate();
    return;
  }

  const queue = client.player.getQueue(interaction.guildId);
  const index = Number(selected);

  if (!queue.jumpTo(index)) {
    await interaction.reply({ content: "That queue entry no longer exists.", flags: 64 });
    return;
  }

  await interaction.deferUpdate();
  await client.player.playCurrent(interaction.guildId);
}

module.exports = {
  handleQueueSelect
};
