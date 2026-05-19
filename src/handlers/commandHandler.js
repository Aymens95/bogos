const fs = require("node:fs");
const path = require("node:path");

function getCommandFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getCommandFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectCommandModules() {
  const commandsPath = path.join(__dirname, "..", "commands");
  if (!fs.existsSync(commandsPath)) return [];

  return getCommandFiles(commandsPath).map((file) => require(file));
}

function collectCommandData() {
  return collectCommandModules().map((command) => command.data.toJSON());
}

function loadCommands(client) {
  for (const command of collectCommandModules()) {
    client.commands.set(command.data.name, command);
  }
}

function describeError(error) {
  if (!error) return "Unknown error";

  const status = error.response?.status ? ` status=${error.response.status}` : "";
  const code = error.code ? ` code=${error.code}` : "";
  const message = error.message || String(error);
  return `${message}${status}${code}`;
}

async function executeCommand(interaction, client) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({ content: "Command not found.", flags: 64 });
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Command failed: ${interaction.commandName}: ${describeError(error)}`);
    const payload = { content: error.publicMessage || "An error occurred while running that command.", flags: 64 };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

module.exports = {
  collectCommandData,
  loadCommands,
  executeCommand
};
