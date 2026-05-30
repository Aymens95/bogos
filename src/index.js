require("dotenv").config();

const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { Player } = require("./music/Player");
const { loadCommands } = require("./handlers/commandHandler");
const { loadEvents } = require("./handlers/eventHandler");
const logger = require("./utils/logger");
const { runStartupChecks } = require("./utils/startupChecks");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
});

client.commands = new Collection();
client.player = new Player(client);

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", { error });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
});

async function main() {
  loadCommands(client);
  loadEvents(client);
  logger.info("Loaded bot modules", { commands: client.commands.size });

  const checks = await runStartupChecks();
  for (const [name, result] of Object.entries(checks)) {
    const level = result.ok ? "info" : "warn";
    logger[level]("Startup dependency check", { dependency: name, ok: result.ok, detail: result.detail });
  }

  if (!process.env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN is required in .env");
  }

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((error) => {
  logger.error("Failed to start bot", { error });
  process.exitCode = 1;
});
