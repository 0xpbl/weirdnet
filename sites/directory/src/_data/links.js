const fs = require("fs");
const path = require("path");

module.exports = function () {
  const jsonPath = path.resolve(__dirname, "../../../../data/links.json");
  
  try {
    const raw = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      return [];
    }

  const normalized = data
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: String(x.id || "").trim(),
      url: String(x.url || "").trim(),
      title: String(x.title || "").trim(),
      desc: String(x.desc || "").trim(),
      category: String(x.category || "").trim(),
      tags: Array.isArray(x.tags) ? x.tags.map((t) => String(t).trim()).filter(Boolean) : [],
      addedAt: String(x.addedAt || "").trim(),
      isDirectory: x.isDirectory !== false,
    }))
    .filter((x) => x.id && x.url && x.title)
    .sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));

    return normalized;
  } catch (e) {
    console.error(`[directory/links.js] Error reading links.json: ${e.message}`);
    return [];
  }
};
