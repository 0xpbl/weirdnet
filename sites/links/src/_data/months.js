const getLinks = require("./links");

module.exports = function () {
  const links = getLinks();

  const map = new Map(); // key: "YYYY/MM" -> items

  for (const item of links) {
    const m = String(item.addedAt || "").match(/^(\d{4})-(\d{2})-/);
    if (!m) continue;
    const year = m[1];
    const month = m[2];
    const key = `${year}/${month}`;

    if (!map.has(key)) map.set(key, { year, month, id: key, items: [] });
    map.get(key).items.push(item);
  }

  // newest month first
  return Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
};
