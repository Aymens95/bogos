const { Events, ActivityType } = require("discord.js");
const logger = require("../utils/logger");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info("Logged in as", { user: client.user.tag });
    client.user.setActivity("/play to start music", { type: ActivityType.Listening });
  }
};
