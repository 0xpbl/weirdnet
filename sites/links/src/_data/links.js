const fs = require("fs");
const path = require("path");

module.exports = () => {
  const jsonPath = path.resolve(__dirname, "../../../../data/links.json");
  try {
    const raw = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    // site "links" -> só o que NÃO é directory
    return data.filter((x) => x && x.isDirectory !== true);
  } catch (e) {
    return [];
  }
};
