require("dotenv").config();

const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { Player } = require("./music/Player");
const { loadCommands } = require("./handlers/commandHandler");
const { loadEvents } = require("./handlers/eventHandler");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();
client.player = new Player(client);

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

async function main() {
  loadCommands(client);
  loadEvents(client);

  if (!process.env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN is required in .env");
  }

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exitCode = 1;
});
