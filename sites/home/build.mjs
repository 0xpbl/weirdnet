import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist", "home");

const LINKS_JSON = path.join(ROOT, "data", "links.json");
const FEATURED_JSON = path.join(ROOT, "sites", "home", "featured.json");

const HERO_HTML   = path.join(ROOT, "sites", "home", "content", "hero.html");
const ABOUT_HTML  = path.join(ROOT, "sites", "home", "content", "about.html");
const RULES_HTML  = path.join(ROOT, "sites", "home", "content", "rules.html");

// Footer ONLY for weirdnet.org (home).
const FOOTER_HTML = path.join(ROOT, "sites", "home", "content", "footer.html");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function readText(p) {
  return fs.readFileSync(p, "utf8");
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function copyDirIfExists(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirIfExists(s, d);
    else fs.copyFileSync(s, d);
  }
}

function parseDate(x) {
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : 0;
}
function ymdNowUTC() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pickFeatured(links) {
  const cfg = readJson(FEATURED_JSON);
  if (cfg.mode === "manual") return cfg.manual;

  const pool = links.filter(l => {
    const isDir = l.isDirectory === true;
    const tags = (l.tags || []).map(t => String(t).toLowerCase());
    const cat  = String(l.category || "").toLowerCase();
    return isDir && !tags.includes("nsfw") && cat !== "nsfw";
  });

  if (!pool.length) return null;

  const key = ymdNowUTC();
  const idx = hashStr(key) % pool.length;
  const l = pool[idx];

  return {
    url: l.url,
    title: l.title || l.url,
    description: l.desc || l.description || "",
    tags: l.tags || []
  };
}

function renderDrops(items) {
  return items.map(l => {
    const title = escapeHtml(l.title || l.url);
    const url = escapeHtml(l.url);
    const desc = escapeHtml(l.desc || l.description || "");
    const date = escapeHtml((l.addedAt || l.date || "").slice(0, 10));
    return `<li><span class="kbd">${date || "????-??-??"}</span> <a href="${url}" rel="noreferrer">${title}</a>${desc ? ` — <span class="small">${desc}</span>` : ""}</li>`;
  }).join("\n");
}

function main() {
  ensureDir(OUT);

  if (!fs.existsSync(FOOTER_HTML)) {
    throw new Error(`[home] missing footer file: ${FOOTER_HTML}\nCreate it at: sites/home/content/footer.html`);
  }

  const links = readJson(LINKS_JSON);

  const latestDrops = links
    .filter(l => l.isDirectory !== true)
    .sort((a, b) => parseDate(b.addedAt || b.date) - parseDate(a.addedAt || a.date))
    .slice(0, 7);

  const featured = pickFeatured(links);

  const hero   = readText(HERO_HTML);
  const about  = readText(ABOUT_HTML);
  const rules  = readText(RULES_HTML);
  const footer = readText(FOOTER_HTML).trim();

  // NOTE: Wiby link target assumed as https://wiby.me/ (se quiser outro, você troca aqui).
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>weirdnet.org</title>
  <meta name="description" content="A small web observatory: curated links, strange archives, and living artifacts from the open web." />
  <link rel="icon" type="image/png" href="/img/favicon.png" />
  <link rel="stylesheet" href="/css/home.css" />
</head>
<body>
  <div class="wrapper">

    <div class="topbar">
      <span class="kbd">weirdnet.org</span>
      <span class="small">phase 1: drops + directory • phase 2: submissions + webring + guestbook + bbs (soon)</span>
    </div>

    <div class="grid">
      <div class="panel">
        ${hero}
        <div class="hr"></div>
        ${about}
        <div class="hr"></div>
        ${rules}
      </div>

      <div class="panel">
        <h2>today’s featured site</h2>
        ${
          featured
            ? `<p><a href="${escapeHtml(featured.url)}" rel="noreferrer"><b>${escapeHtml(featured.title || featured.url)}</b></a></p>
               ${featured.description ? `<p class="small">${escapeHtml(featured.description)}</p>` : ""}
               ${(featured.tags && featured.tags.length) ? `<p class="small">tags: ${featured.tags.map(t => `<span class="kbd">${escapeHtml(t)}</span>`).join(" ")}</p>` : ""}`
            : `<p class="small">no featured item found (pool empty).</p>`
        }

        <div class="hr"></div>

        <h2>latest drops</h2>
        <ul>
          ${renderDrops(latestDrops)}
        </ul>

        <div class="hr"></div>

        <h2>buttons</h2>
        <div class="buttons">
          <a href="https://links.weirdnet.org/" rel="noreferrer"><img src="/buttons/drops.png" alt="drops"></a>
          <a href="https://directory.weirdnet.org/" rel="noreferrer"><img src="/buttons/directory.png" alt="directory"></a>
        </div>

        <div class="hr"></div>

        <h2>letters</h2>
        <p class="small">
          <a href="/letters/">correspondence archive &raquo;</a>
        </p>

        <div class="hr"></div>

        <div class="gifs">
          <h2>status</h2>
          <div class="gifbar">
            <a href="https://wiby.me/" rel="noreferrer"><img src="/gifs/wiby.gif" alt="Wiby Search"></a>
            <a href="https://icra.org" rel="noreferrer"><img src="/gifs/icra.gif" alt="ICRA"></a>
          </div>
        </div>
      </div>
    </div>

    <!-- AwayMessage (before footer) -->
    <div id="away-slot"></div>
    <script id="_amlol" src="/js/awaymessage.js?v=4#pablomurad" defer></script>

    ${footer}
  </div>
</body>
</html>
`;

  fs.writeFileSync(path.join(OUT, "index.html"), html, "utf8");

  fs.writeFileSync(
    path.join(OUT, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: https://weirdnet.org/sitemap.xml\n`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(OUT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://weirdnet.org/</loc></url>
</urlset>
`,
    "utf8"
  );

  // assets: /css, /js, /img, /buttons, /gifs
  copyDirIfExists(path.join(ROOT, "public", "home", "css"),     path.join(OUT, "css"));
  copyDirIfExists(path.join(ROOT, "public", "home", "js"),      path.join(OUT, "js"));
  copyDirIfExists(path.join(ROOT, "public", "home", "img"),     path.join(OUT, "img"));
  copyDirIfExists(path.join(ROOT, "public", "home", "buttons"), path.join(OUT, "buttons"));
  copyDirIfExists(path.join(ROOT, "public", "home", "gifs"),    path.join(OUT, "gifs"));

  console.log("[home] built:", OUT);
}

main();
