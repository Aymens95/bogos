const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function checkBinary(command, args, timeout = 1500) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout,
      windowsHide: true,
      maxBuffer: 256 * 1024
    });

    const output = `${stdout || ""}${stderr || ""}`.trim();
    return {
      available: true,
      detail: output.split(/\r?\n/).find(Boolean) || "available"
    };
  } catch (error) {
    const timedOut = error.killed || error.signal === "SIGTERM";
    return {
      available: false,
      detail: timedOut ? "timed out" : error.code || error.message || "not found"
    };
  }
}

async function getRuntimeDiagnostics() {
  const [ffmpeg, ytdlp] = await Promise.all([
    checkBinary("ffmpeg", ["-version"]),
    checkBinary("yt-dlp", ["--version"])
  ]);

  return {
    ffmpeg,
    ytdlp,
    nodeVersion: process.version
  };
}

module.exports = {
  getRuntimeDiagnostics
};
