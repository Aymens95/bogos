const { requireSameVoiceChannel } = require("../utils/voiceChecks");
const Favorites = require("../music/Favorites");
const { LOOP_MODES } = require("../utils/constants");
const VoteSkip = require("../music/VoteSkip");
const { canUseDjControl } = require("../utils/permissions");
const { requestSkip } = require("../utils/skipControl");

function nextLoopMode(current) {
  if (current === LOOP_MODES.OFF) return LOOP_MODES.SONG;
  if (current === LOOP_MODES.SONG) return LOOP_MODES.QUEUE;
  return LOOP_MODES.OFF;
}

async function handleButton(interaction, client) {
  const queue = client.player.getQueue(interaction.guildId);

  if (interaction.customId.startsWith("queue_page:")) {
    await interaction.deferUpdate();
    const page = Number(interaction.customId.split(":")[2]);
    await client.player.updateNowPlaying(interaction.guildId, page);
    return;
  }

  const voiceCheck = requireSameVoiceChannel(interaction, client);
  if (!voiceCheck.ok) {
    await interaction.reply({ content: voiceCheck.message, flags: 64 });
    return;
  }

  try {
    if (interaction.customId === "btn_shuffle" && queue.getAll().length <= 1) {
      await interaction.reply({ content: "⚠️ Nothing to shuffle.", flags: 64 });
      return;
    }

    if (["btn_shuffle", "btn_stop"].includes(interaction.customId)) {
      const permission = canUseDjControl(interaction);
      if (!permission.ok) {
        await interaction.reply({ content: permission.message, flags: 64 });
        return;
      }
    }

    if (interaction.customId === "btn_favorite") {
      const song = queue.getCurrent();
      if (!song) {
        await interaction.reply({ content: "Nothing is playing.", flags: 64 });
        return;
      }

      const result = Favorites.toggleFavorite(interaction.user.id, song);
      if (result.limitReached) {
        await interaction.reply({ content: "❤️ Favorites limit reached (50). Remove some first.", flags: 64 });
        return;
      }

      if (!result.ok) {
        await interaction.reply({ content: "❌ Could not save data. Check file permissions.", flags: 64 });
        return;
      }

      await client.player.updateNowPlaying(interaction.guildId, 1, false, interaction.user.id);
      await interaction.reply({
        content: result.favorited ? `Added **${song.title}** to your favorites.` : `Removed **${song.title}** from your favorites.`,
        flags: 64
      });
      return;
    }

    await interaction.deferUpdate();

    if (interaction.customId === "btn_shuffle" && !queue.shuffle()) {
      return;
    }
    if (interaction.customId === "btn_shuffle") client.player.saveQueue(interaction.guildId);
    if (interaction.customId === "btn_previous") await client.player.previous(interaction.guildId);
    if (interaction.customId === "btn_pause_resume") {
      if (queue.paused) await client.player.resume(interaction.guildId);
      else await client.player.pause(interaction.guildId);
    }
    if (interaction.customId === "btn_skip") {
      const message = await requestSkip(interaction, client, voiceCheck.voiceChannel);
      await interaction.followUp({ content: message, flags: 64 }).catch(() => {});
    }
    if (interaction.customId === "btn_loop") await client.player.setLoop(interaction.guildId, nextLoopMode(queue.loopMode));
    if (interaction.customId === "btn_remove") {
      VoteSkip.clear(interaction.guildId);
      queue.remove(queue.currentIndex);
      client.player.saveQueue(interaction.guildId);
    }
    if (interaction.customId === "btn_rewind") await client.player.seek(interaction.guildId, -10, true);
    if (interaction.customId === "btn_stop") await client.player.stop(interaction.guildId);
    if (interaction.customId === "btn_forward") await client.player.seek(interaction.guildId, 10, true);
    await client.player.updateNowPlaying(interaction.guildId, 1, false, interaction.user.id).catch(() => {});
  } catch (error) {
    console.error("Button action failed:", error);
    const payload = { content: "That control failed.", flags: 64 };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

module.exports = {
  handleButton
};
