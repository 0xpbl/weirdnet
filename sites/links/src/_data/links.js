const fs = require("fs");

module.exports = function () {
  const file = "/home/weirdnet/_src/data/links.json";

  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error(`Expected an array in ${file}`);
  }

  return data
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
    .filter((x) => x.id && x.url && x.title && x.addedAt)
    .sort((a, b) => (b.addedAt || "").localeCompare(b.addedAt || ""));
};
