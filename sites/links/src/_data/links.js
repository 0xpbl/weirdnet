const fs = require("fs");
const path = require("path");

module.exports = () => {
  const jsonPath = path.resolve(__dirname, "../../../../data/links.json");
  try {
    const raw = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    // site "links" -> TODOS os links (mesmo que directory)
    // Filtrar e ordenar por data (mais recente primeiro)
    return data
      .filter((x) => x && typeof x === "object" && x.id && x.url && x.title)
      .sort((a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")));
  } catch (e) {
    return [];
  }
};
