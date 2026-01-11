const getLinks = require("./links");

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = function () {
  const links = getLinks();

  const map = new Map(); // slug -> { id, label, items[] }

  for (const item of links) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    for (const raw of tags) {
      const label = String(raw || "").trim();
      if (!label) continue;

      const id = slugify(label);
      if (!id) continue;

      if (!map.has(id)) map.set(id, { id, label, items: [] });
      map.get(id).items.push(item);
    }
  }

  return Array.from(map.values())
    .map((t) => ({
      id: t.id,
      label: t.label,
      count: t.items.length,
      items: t.items, // já está “newest first” porque vem do getLinks()
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};
