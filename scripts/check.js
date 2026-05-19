const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function collectJavaScriptFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectJavaScriptFiles(fullPath));
    if (entry.isFile() && entry.name.endsWith(".js")) files.push(fullPath);
  }

  return files;
}

for (const file of collectJavaScriptFiles(path.join(__dirname, "..", "src"))) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

const matcherResult = spawnSync(process.execPath, [path.join(__dirname, "check-matcher.js")], { stdio: "inherit" });
if (matcherResult.status !== 0) process.exit(matcherResult.status || 1);
