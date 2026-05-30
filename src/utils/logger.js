const fs = require("node:fs");
const path = require("node:path");

const LOG_FILE = process.env.BOGOS_LOG_FILE || null;
const REDACT_PATTERNS = [
  /Bot\s+[A-Za-z0-9._-]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/g,
  /DISCORD_TOKEN=[^\s]+/g,
  /SPOTIFY_CLIENT_SECRET=[^\s]+/g
];

function redact(value) {
  let text = value instanceof Error ? `${value.message}${value.stack ? `\n${value.stack}` : ""}` : String(value);
  for (const pattern of REDACT_PATTERNS) text = text.replace(pattern, "[redacted]");
  return text;
}

function formatMeta(meta) {
  if (!meta || !Object.keys(meta).length) return "";

  const parts = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${redact(value)}`);

  return parts.length ? ` ${parts.join(" ")}` : "";
}

function write(level, message, meta = {}) {
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${redact(message)}${formatMeta(meta)}`;
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[method](line);

  if (!LOG_FILE) return;

  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, `${line}\n`);
  } catch {
    // Logging must never crash the bot.
  }
}

module.exports = {
  debug: (message, meta) => {
    if (process.env.BOGOS_DEBUG === "1") write("debug", message, meta);
  },
  error: (message, meta) => write("error", message, meta),
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta)
};
