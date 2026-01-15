import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LINKS_JSON = path.join(ROOT, "data", "links.json");

function nowIso() { return new Date().toISOString(); }

function loadLinks() {
  const raw = fs.readFileSync(LINKS_JSON, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("data/links.json must be an array");
  return data;
}

function saveLinks(arr) {
  fs.writeFileSync(LINKS_JSON, JSON.stringify(arr, null, 2) + "\n", "utf8");
}

function keyOf(item) {
  return `${String(item.url).trim()}|${item.isDirectory ? "dir" : "drop"}`;
}

function addIfMissing(state, item) {
  const k = keyOf(item);
  if (state.seen.has(k)) return false;
  state.seen.add(k);
  state.links.push(item);
  return true;
}

// links do seu PDF
const items = [
  {
    title: "Homeostasis Lab (course — glitch)",
    url: "https://homeostasislab.org/cursos/info/108",
    desc: "Glitch course page at Homeostasis Lab.",
    tags: ["creative-coding", "glitch", "learning"],
    dirCategory: "tools",
  },
  {
    title: "Homeostasis Lab (Processing example)",
    url: "https://homeostasislab.org/cursos/info/124",
    desc: "Processing example page at Homeostasis Lab.",
    tags: ["creative-coding", "processing", "learning"],
    dirCategory: "tools",
  },
  {
    title: "Homeostasis Lab (intro — Processing)",
    url: "https://homeostasislab.org/cursos/info/121",
    desc: "Intro to Processing at Homeostasis Lab.",
    tags: ["creative-coding", "processing", "learning"],
    dirCategory: "tools",
  },
  {
    title: "Aisthesis Lab",
    url: "https://www.aisthesislab.art",
    desc: "Art / research lab with digital works.",
    tags: ["net-art", "art", "weird"],
    dirCategory: "net-art",
  },
  {
    title: "Aisthesis Lab — Artists",
    url: "https://www.aisthesislab.art/artists",
    desc: "Artists index / roster.",
    tags: ["art", "artists", "directory"],
    dirCategory: "directories",
  },
  {
    title: "p5.js",
    url: "https://p5js.org/",
    desc: "p5.js creative coding library.",
    tags: ["p5js", "creative-coding", "javascript"],
    dirCategory: "tools",
  },
  {
    title: "p5.js — Reference",
    url: "https://p5js.org/reference/",
    desc: "p5.js reference.",
    tags: ["p5js", "creative-coding", "reference"],
    dirCategory: "tools",
  },
  {
    title: "p5.js — Web Editor",
    url: "https://editor.p5js.org/",
    desc: "Online editor for p5.js sketches.",
    tags: ["p5js", "creative-coding", "editor"],
    dirCategory: "tools",
  },
  {
    title: "LingoJam — Fancy Text",
    url: "https://lingojam.com/FancyTextGenerator",
    desc: "Fancy text generator.",
    tags: ["text", "typography", "toy"],
    dirCategory: "toys",
  },
  {
    title: "YayText",
    url: "https://yaytext.com/",
    desc: "Text styling / generators.",
    tags: ["text", "typography", "toy"],
    dirCategory: "toys",
  },
  {
    title: "Unicode Explorer",
    url: "https://unicode-explorer.com/",
    desc: "Browse Unicode characters.",
    tags: ["unicode", "standards", "reference"],
    dirCategory: "standards",
  },
  {
    title: "Unicode — Compart",
    url: "https://www.compart.com/en/unicode",
    desc: "Unicode character database.",
    tags: ["unicode", "standards", "reference"],
    dirCategory: "standards",
  },
];

function main() {
  const existing = loadLinks();
  const state = {
    links: existing.slice(),
    seen: new Set(existing.map(keyOf)),
  };

  const stamp = nowIso();
  let added = 0;

  for (const it of items) {
    // 1) DROP (links.weirdnet.org)
    if (addIfMissing(state, {
      url: it.url,
      title: it.title,
      desc: it.desc,
      tags: it.tags,
      addedAt: stamp,
      isDirectory: false
    })) added++;

    // 2) DIRECTORY (directory.weirdnet.org)
    if (addIfMissing(state, {
      url: it.url,
      title: it.title,
      desc: it.desc,
      tags: it.tags,
      category: it.dirCategory,
      addedAt: stamp,
      isDirectory: true
    })) added++;
  }

  saveLinks(state.links);
  console.log(`[import] ok. added ${added} entries (drop + directory variants).`);
}

main();
