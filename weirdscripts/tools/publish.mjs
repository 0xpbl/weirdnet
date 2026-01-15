import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const HOME = "/root/weirdnet.org";
const SRC = "/home/weirdnet/_src";

const JSON_FILE = "/home/weirdnet/_src/data/links.json";

const DIST_DIR = "/home/weirdnet/_src/dist/directory";
const DIST_LINKS = "/home/weirdnet/_src/dist/links";

const DEPLOY_DIR = "/home/weirdnet-directory/htdocs/directory.weirdnet.org";
const DEPLOY_LINKS = "/home/linksweird/htdocs/links.weirdnet.org";

const URL_DIR = "https://directory.weirdnet.org";
const URL_LINKS = "https://links.weirdnet.org";

function die(msg) {
  console.error(`\n[FAIL] ${msg}\n`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with exit ${res.status}`);
  }
}

function runCapture(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return { status: res.status ?? 1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

function ymdSaoPauloNow() {
  // YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCategoryLine(line) {
  // category: tag1, tag2
  const idx = line.indexOf(":");
  if (idx === -1) return null;

  const left = line.slice(0, idx).trim();
  const right = line.slice(idx + 1).trim();

  if (!left) return null;

  const category = slugify(left);
  const tags = right
    ? right.split(",").map((t) => slugify(t)).filter(Boolean)
    : [];

  return { category, tags };
}

function splitLinkLine(line) {
  // URL: Title: Description   (DELIMITERS MUST BE ": " to avoid https:// issues)
  const i = line.indexOf(": ");
  if (i === -1) return null;
  const url = line.slice(0, i).trim();
  const rest = line.slice(i + 2);

  const j = rest.indexOf(": ");
  if (j === -1) return null;
  const title = rest.slice(0, j).trim();
  const desc = rest.slice(j + 2).trim();

  if (!url || !title) return null;
  return { url, title, desc };
}

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) die(`links.json is not an array: ${file}`);
  return data;
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function ensureFileIfMissing(filepath, content) {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, content, "utf8");
  }
}

function ensureRobotsAndSitemapsAndFeeds() {
  // robots (directory)
  ensureFileIfMissing(
    "/home/weirdnet/_src/sites/directory/src/robots.njk",
`---
permalink: "robots.txt"
eleventyExcludeFromCollections: true
---

User-agent: *
Allow: /

Sitemap: https://directory.weirdnet.org/sitemap.xml
`
  );

  // robots (links)
  ensureFileIfMissing(
    "/home/weirdnet/_src/sites/links/src/robots.njk",
`---
permalink: "robots.txt"
eleventyExcludeFromCollections: true
---

User-agent: *
Allow: /

Sitemap: https://links.weirdnet.org/sitemap.xml
`
  );

  // sitemap (directory)
  ensureFileIfMissing(
    "/home/weirdnet/_src/sites/directory/src/sitemap.njk",
`---
permalink: "sitemap.xml"
eleventyExcludeFromCollections: true
---

<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  {% set base = "https://directory.weirdnet.org" %}
  {% for item in collections.all %}
    {% if item.page and item.page.url and item.page.outputPath %}
      {% set url = item.page.url %}
      {% set out = item.page.outputPath %}
      {% if out.endsWith(".html") and url != "/404.html" %}
  <url>
    <loc>{{ (base ~ url) | escape }}</loc>
  </url>
      {% endif %}
    {% endif %}
  {% endfor %}
</urlset>
`
  );

  // sitemap (links)
  ensureFileIfMissing(
    "/home/weirdnet/_src/sites/links/src/sitemap.njk",
`---
permalink: "sitemap.xml"
eleventyExcludeFromCollections: true
---

<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  {% set base = "https://links.weirdnet.org" %}
  {% for item in collections.all %}
    {% if item.page and item.page.url and item.page.outputPath %}
      {% set url = item.page.url %}
      {% set out = item.page.outputPath %}
      {% if out.endsWith(".html") and url != "/404.html" %}
  <url>
    <loc>{{ (base ~ url) | escape }}</loc>
  </url>
      {% endif %}
    {% endif %}
  {% endfor %}
</urlset>
`
  );

  // NOTE: RSS/Atom robustos dependem do eleventy.config.cjs do links ter filtros.
  // Aqui a gente só garante que rss.njk/atom.njk existem (sem sobrescrever se você já customizou).
  ensureFileIfMissing("/home/weirdnet/_src/sites/links/src/rss.njk",
`---
permalink: "rss.xml"
eleventyExcludeFromCollections: true
---

<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>weirdnet links</title>
    <link>https://links.weirdnet.org/</link>
    <description>link dump from weirdnet</description>
    <language>en</language>
    {% for item in links | slice(0, 50) %}
    <item>
      <title>{{ item.title | escape }}</title>
      <link>{{ item.url | escape }}</link>
      <guid isPermaLink="true">{{ item.url | escape }}</guid>
      <description>{{ item.desc | escape }}</description>
      <pubDate>{{ item.addedAt }}T00:00:00Z</pubDate>
    </item>
    {% endfor %}
  </channel>
</rss>
`
  );

  ensureFileIfMissing("/home/weirdnet/_src/sites/links/src/atom.njk",
`---
permalink: "atom.xml"
eleventyExcludeFromCollections: true
---

<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>weirdnet links</title>
  <id>https://links.weirdnet.org/</id>
  <link href="https://links.weirdnet.org/atom.xml" rel="self"/>
  <link href="https://links.weirdnet.org/"/>
  <updated>2026-01-11T00:00:00Z</updated>

  {% for item in links | slice(0, 50) %}
  <entry>
    <title>{{ item.title | escape }}</title>
    <id>{{ item.url | escape }}</id>
    <link href="{{ item.url | escape }}"/>
    <updated>{{ item.addedAt }}T00:00:00Z</updated>
    <summary>{{ item.desc | escape }}</summary>
  </entry>
  {% endfor %}
</feed>
`
  );
}

function makeId(url, title, addedAt, existingIds) {
  let base = slugify(title);
  if (!base) {
    try {
      const u = new URL(url);
      base = slugify(u.hostname.replace(/^www\./, ""));
    } catch {
      base = "link";
    }
  }

  let id = base;
  if (existingIds.has(id)) id = `${base}-${slugify(addedAt)}`;
  let n = 2;
  while (existingIds.has(id)) {
    id = `${base}-${slugify(addedAt)}-${n}`;
    n++;
  }
  return id;
}

function parseQueueFile(text) {
  const lines = text.split(/\r?\n/);

  let current = null; // {category, tags}
  const out = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;

    // category: tags
    if (!line.startsWith("http://") && !line.startsWith("https://")) {
      const cat = parseCategoryLine(line);
      if (!cat) die(`Invalid category line: "${line}"`);
      current = cat;
      continue;
    }

    if (!current) {
      die(`Link line before any category header: "${line}"`);
    }

    const item = splitLinkLine(line);
    if (!item) {
      die(`Invalid link line (use "URL: Title: Description" with ": "): "${line}"`);
    }

    out.push({
      ...item,
      category: current.category,
      tags: current.tags,
    });
  }

  return out;
}

function mergeEntry(existing, incoming, mode) {
  // mode: "dir" promotes isDirectory true; "links" does NOT demote existing true
  const updated = { ...existing };

  // always update metadata if provided
  if (incoming.title) updated.title = incoming.title;
  if (incoming.desc) updated.desc = incoming.desc;
  if (incoming.category) updated.category = incoming.category;

  if (Array.isArray(incoming.tags) && incoming.tags.length) {
    const set = new Set(Array.isArray(updated.tags) ? updated.tags : []);
    for (const t of incoming.tags) set.add(t);
    updated.tags = Array.from(set);
  }

  if (!updated.addedAt) updated.addedAt = incoming.addedAt;

  if (mode === "dir") updated.isDirectory = true;
  else if (updated.isDirectory !== true) updated.isDirectory = false;

  return updated;
}

function updateJsonFromQueue(mode, queueItems) {
  const today = ymdSaoPauloNow();
  const data = readJSON(JSON_FILE);

  const existingByUrl = new Map();
  const existingIds = new Set();

  for (const it of data) {
    if (it && it.url) existingByUrl.set(String(it.url).trim(), it);
    if (it && it.id) existingIds.add(String(it.id).trim());
  }

  let added = 0;
  let updated = 0;

  for (const q of queueItems) {
    const entry = {
      url: q.url.trim(),
      title: q.title.trim(),
      desc: (q.desc || "").trim(),
      category: slugify(q.category),
      tags: (q.tags || []).map(slugify).filter(Boolean),
      addedAt: today,
      isDirectory: mode === "dir",
    };

    const found = existingByUrl.get(entry.url);
    if (found) {
      const merged = mergeEntry(found, entry, mode);
      // replace in array by reference
      Object.assign(found, merged);
      updated++;
    } else {
      entry.id = makeId(entry.url, entry.title, entry.addedAt, existingIds);
      existingIds.add(entry.id);
      data.push(entry);
      existingByUrl.set(entry.url, entry);
      added++;
    }
  }

  // sort newest first by addedAt (stable enough)
  data.sort((a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")));

  writeJSON(JSON_FILE, data);

  return { added, updated, total: data.length };
}

function archiveAndClear(mode, txtPath, originalText) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = path.join(HOME, "processed", `${mode}-${stamp}.txt`);
  fs.writeFileSync(out, originalText, "utf8");
  fs.writeFileSync(txtPath, "", "utf8");
}

function check200(url) {
  // -k: ignora self-signed se existir
  const res = runCapture("curl", ["-kfsS", "-o", "/dev/null", "-w", "%{http_code}", url]);
  const code = (res.stdout || "").trim();
  if (code !== "200") {
    throw new Error(`Healthcheck failed for ${url} (got ${code || "no-code"})`);
  }
}

function main() {
  const argv = process.argv.slice(2);
  const mode = argv[0]; // "dir" or "links"
  if (mode !== "dir" && mode !== "links") {
    die(`Usage: node publish.mjs <dir|links> [--reload-nginx] [--no-check]`);
  }

  const reloadNginx = argv.includes("--reload-nginx");
  const noCheck = argv.includes("--no-check");

  const txtPath = path.join(HOME, mode === "dir" ? "dir.txt" : "links.txt");
  if (!fs.existsSync(txtPath)) fs.writeFileSync(txtPath, "", "utf8");
  const txt = fs.readFileSync(txtPath, "utf8");

  ensureRobotsAndSitemapsAndFeeds();

  const hasWork = txt.trim().length > 0;

  if (hasWork) {
    const queue = parseQueueFile(txt);
    const stats = updateJsonFromQueue(mode, queue);
    console.log(`\n[OK] JSON updated. added=${stats.added} updated=${stats.updated} total=${stats.total}\n`);
  } else {
    console.log(`\n[OK] ${path.basename(txtPath)} is empty. Skipping JSON update.\n`);
  }

  // build both always (keeps sitemap/robots/feeds fresh)
  console.log("[RUN] build directory...");
  run("npx", ["@11ty/eleventy", "--config=sites/directory/eleventy.config.cjs"], { cwd: SRC });

  console.log("[RUN] build links...");
  run("npx", ["@11ty/eleventy", "--config=sites/links/eleventy.config.cjs"], { cwd: SRC });

  // deploy
  console.log("[RUN] deploy directory (rsync)...");
  run("rsync", ["-a", "--delete", "--exclude", ".well-known", `${DIST_DIR}/`, `${DEPLOY_DIR}/`]);

  console.log("[RUN] deploy links (rsync)...");
  run("rsync", ["-a", "--delete", "--exclude", ".well-known", `${DIST_LINKS}/`, `${DEPLOY_LINKS}/`]);

  if (reloadNginx) {
    console.log("[RUN] nginx -t && reload...");
    run("nginx", ["-t"]);
    run("systemctl", ["reload", "nginx"]);
  }

  if (!noCheck) {
    console.log("[RUN] health checks (expect 200)...");
    check200(`${URL_DIR}/sitemap.xml`);
    check200(`${URL_DIR}/robots.txt`);

    check200(`${URL_LINKS}/sitemap.xml`);
    check200(`${URL_LINKS}/robots.txt`);
    check200(`${URL_LINKS}/rss.xml`);
    check200(`${URL_LINKS}/atom.xml`);
  }

  // only clear the txt if everything above succeeded
  if (hasWork) {
    archiveAndClear(mode, txtPath, txt);
    console.log(`[OK] consumed + archived ${path.basename(txtPath)}\n`);
  } else {
    console.log("[OK] done.\n");
  }
}

try {
  main();
} catch (e) {
  console.error(`\n[FAIL] ${e?.message || e}\n`);
  process.exit(1);
}
