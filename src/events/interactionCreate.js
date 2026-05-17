const { Events } = require("discord.js");
const { executeCommand } = require("../handlers/commandHandler");
const { handleButton } = require("../handlers/buttonHandler");
const { handleQueueSelect } = require("../handlers/selectHandler");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      await executeCommand(interaction, client);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction, client);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleQueueSelect(interaction, client);
    }
  }
};
