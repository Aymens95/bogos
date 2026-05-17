const fs = require("node:fs");
const path = require("node:path");

function readJSON(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`Could not read JSON file ${filePath}:`, error.message);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`Could not write JSON file ${filePath}:`, error.message);
    return false;
  }
}

function dataPath(...parts) {
  return path.join(process.cwd(), "data", ...parts);
}

module.exports = {
  dataPath,
  readJSON,
  writeJSON
};
