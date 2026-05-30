const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 2500;

async function checkBinary(command, args) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 128 * 1024
    });

    const output = `${stdout || ""}${stderr || ""}`.trim();
    return {
      ok: true,
      detail: output.split(/\r?\n/).find(Boolean) || "available"
    };
  } catch (error) {
    return {
      ok: false,
      detail: error.code || error.message || "not available"
    };
  }
}

async function runStartupChecks() {
  const [ffmpeg, ytdlp] = await Promise.all([
    checkBinary("ffmpeg", ["-version"]),
    checkBinary("yt-dlp", ["--version"])
  ]);

  return {
    ffmpeg,
    ytdlp,
    node: {
      ok: true,
      detail: process.version
    }
  };
}

module.exports = {
  runStartupChecks
};
