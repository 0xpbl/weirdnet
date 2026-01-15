import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LINKS_JSON = path.join(ROOT, "data", "links.json");

function nowIso() {
  return new Date().toISOString();
}

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
  // dedupe: same url + same "isDirectory"
  return `${String(item.url).trim()}|${item.isDirectory ? "dir" : "drop"}`;
}

function addIfMissing(list, item) {
  const k = keyOf(item);
  if (list._seen.has(k)) return false;
  list._seen.add(k);
  list.push(item);
  return true;
}

// Links do seu PDF (Creative Coding & Glitch)
const items = [
  {
    title: "Homeostasis Lab (course — glitch)",
    url: "https://homeostasislab.org/cursos/info/108",
    desc: "Glitch course page at Homeostasis Lab.",
    tags: ["creative-coding", "glitch", "learning"],
    dirCategory: "net-art",
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
    tags: ["art", "directory", "artists"],
    dirCategory: "directories",
  },
  {
    title: "Processing — Download",
    url: "https://processing.org/download",
    desc: "Download Processing.",
    tags: ["processing", "creative-coding", "tool"],
    dirCategory: "tools",
  },
  {
    title: "Processing — Tutorials",
    url: "https://processing.org/tutorials/",
    desc: "Processing tutorials.",
    tags: ["processing", "creative-coding", "tutorials"],
    dirCategory: "tools",
  },
  {
    title: "Processing — Reference",
    url: "https://processing.org/reference/",
    desc: "Processing reference.",
    tags: ["processing", "creative-coding", "reference"],
    dirCategory: "tools",
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
  const links = loadLinks();

  // preparar set para dedupe
  links._seen = new Set(links.map(keyOf));

  let added = 0;
  const stamp = nowIso();

  for (const it of items) {
    // 1) ADD as DROP (chronological log)
    added += addIfMissing(links, {
      url: it.url,
      title: it.title,
      desc: it.desc,
      tags: it.tags,
      addedAt: stamp,
      isDirectory: false
    }) ? 1 : 0;

    // 2) ADD as DIRECTORY (curated catalog)
    added += addIfMissing(links, {
      url: it.url,
      title: it.title,
      desc: it.desc,
      tags: it.tags,
      category: it.dirCategory,
      addedAt: stamp,
      isDirectory: true
    }) ? 1 : 0;
  }

  // limpar helper
  const out = links.filter(x => x && typeof x === "object" && !("_seen" in x));
  saveLinks(out);

  console.log(`[import] done. added: ${added} entries (drop + directory variants).`);
}

main();
