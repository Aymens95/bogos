require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { collectCommandData } = require("./handlers/commandHandler");
const logger = require("./utils/logger");

async function deploy() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required in .env");
  }

  const commands = collectCommandData();
  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  logger.info("Registered slash commands", { count: commands.length });
}

deploy().catch((error) => {
  logger.error("Failed to deploy commands", { error });
  process.exitCode = 1;
});
