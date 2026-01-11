const getLinks = require("./links");

module.exports = function () {
  const links = getLinks();

  const map = new Map();

  for (const item of links) {
    const id = String(item.category || "").trim().toLowerCase();
    if (!id) continue;

    if (!map.has(id)) map.set(id, []);
    map.get(id).push(item);
  }

  return Array.from(map.entries())
    .map(([id, items]) => ({
      id,
      count: items.length,
      items: items.slice().sort((a, b) => String(a.title).localeCompare(String(b.title))),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};
