import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const HOME = process.env.WEIRDNET_HOME || "/home/weirdnet.org";
const SRC = process.env.WEIRDNET_SRC || path.resolve(path.join(__dirname, "../.."));

const JSON_FILE = path.join(SRC, "data", "links.json");

const DIST_DIR = path.join(SRC, "dist", "directory");
const DIST_LINKS = path.join(SRC, "dist", "links");
const DIST_HOME = path.join(SRC, "dist", "home");

const DEPLOY_DIR = "/home/weirdnet-directory/htdocs/directory.weirdnet.org";
const DEPLOY_LINKS = "/home/linksweird/htdocs/links.weirdnet.org";
const DEPLOY_HOME = "/home/weirdnetorg/htdocs/weirdnet.org";

const URL_DIR = "https://directory.weirdnet.org";
const URL_LINKS = "https://links.weirdnet.org";
const URL_HOME = "https://weirdnet.org";

function die(msg) {
  console.error(`\n[FAIL] ${msg}\n`);
  process.exit(1);
}

function ensureDeployDir(dirPath) {
  // Cria diretório de deploy completo se não existir
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
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
  // Backup automático antes de escrever
  if (fs.existsSync(file)) {
    const backupDir = path.join(path.dirname(file), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupFile = path.join(backupDir, `${path.basename(file)}.bak.${timestamp}`);
    fs.copyFileSync(file, backupFile);
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function deduplicateLinks(data) {
  // SEGURANÇA: Esta função NUNCA apaga links únicos, apenas remove duplicados (mesma URL)
  // Agrupa links por URL normalizada (trim, lowercase)
  const byUrl = new Map();
  
  for (const link of data) {
    if (!link || !link.url) continue;
    const urlKey = String(link.url).trim().toLowerCase();
    
    if (!byUrl.has(urlKey)) {
      byUrl.set(urlKey, []);
    }
    byUrl.get(urlKey).push(link);
  }
  
  // Para cada URL, mantém apenas o registro mais antigo
  // IMPORTANTE: Links com URLs diferentes (mesmo que similares) são preservados
  const deduplicated = [];
  let removedCount = 0;
  const uniqueUrls = new Set();
  
  for (const [urlKey, links] of byUrl.entries()) {
    if (links.length === 1) {
      // Link único - SEMPRE preservado
      deduplicated.push(links[0]);
      uniqueUrls.add(urlKey);
    } else {
      // Duplicados encontrados - mantém apenas o mais antigo
      // Ordena por addedAt (mais antigo primeiro)
      links.sort((a, b) => {
        const dateA = String(a.addedAt || "").trim();
        const dateB = String(b.addedAt || "").trim();
        return dateA.localeCompare(dateB);
      });
      
      // Mantém o mais antigo (preserva todos os metadados)
      deduplicated.push(links[0]);
      uniqueUrls.add(urlKey);
      removedCount += links.length - 1;
    }
  }
  
  // Validação de segurança: garantir que não perdemos URLs únicas
  if (deduplicated.length < uniqueUrls.size) {
    throw new Error(`[SECURITY] deduplicateLinks: Perda de links únicos detectada!`);
  }
  
  if (removedCount > 0) {
    console.log(`[deduplicate] Removed ${removedCount} duplicate link(s) (same URL), preserved ${deduplicated.length} unique links`);
  }
  
  return deduplicated;
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
    path.join(SRC, "sites", "directory", "src", "robots.njk"),
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
    path.join(SRC, "sites", "links", "src", "robots.njk"),
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
    path.join(SRC, "sites", "directory", "src", "sitemap.njk"),
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
    path.join(SRC, "sites", "links", "src", "sitemap.njk"),
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
  ensureFileIfMissing(path.join(SRC, "sites", "links", "src", "rss.njk"),
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

  ensureFileIfMissing(path.join(SRC, "sites", "links", "src", "atom.njk"),
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
  // mode: "dir" promotes isDirectory true; "links" sets isDirectory false
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

  // SEMPRE preservar addedAt original (não sobrescrever com data de hoje)
  // Só usar incoming.addedAt se o existing não tiver addedAt
  if (!updated.addedAt) updated.addedAt = incoming.addedAt;

  // Garantir isDirectory correto baseado no mode
  if (mode === "dir") {
    updated.isDirectory = true;
  } else if (mode === "links") {
    updated.isDirectory = false;
  }

  return updated;
}

function updateJsonFromQueue(mode, queueItems) {
  // SEGURANÇA CRÍTICA: Esta função NUNCA remove links existentes, apenas adiciona ou atualiza
  // Todos os links que não estão na fila são 100% preservados
  const today = ymdSaoPauloNow();
  const data = readJSON(JSON_FILE);
  const beforeCount = data.length;
  const beforeUrls = new Set(data.map(l => String(l?.url || "").trim().toLowerCase()).filter(Boolean));

  const existingByUrl = new Map();
  const existingIds = new Set();

  // Usar URL normalizada (trim + lowercase) para evitar duplicados
  // IMPORTANTE: Todos os links existentes são preservados no Map
  for (const it of data) {
    if (it && it.url) {
      const urlKey = String(it.url).trim().toLowerCase();
      existingByUrl.set(urlKey, it);
    }
    if (it && it.id) existingIds.add(String(it.id).trim());
  }

  let added = 0;
  let updated = 0;

  // Processar apenas itens da fila - links não na fila são preservados automaticamente
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

    // Buscar por URL normalizada
    const urlKey = entry.url.toLowerCase();
    const found = existingByUrl.get(urlKey);
    if (found) {
      // Link existe - apenas atualiza (nunca remove)
      const merged = mergeEntry(found, entry, mode);
      // replace in array by reference
      Object.assign(found, merged);
      updated++;
    } else {
      // Link novo - adiciona
      entry.id = makeId(entry.url, entry.title, entry.addedAt, existingIds);
      existingIds.add(entry.id);
      data.push(entry);
      existingByUrl.set(urlKey, entry);
      added++;
    }
  }

  // Validação de segurança CRÍTICA: garantir que não perdemos links
  if (data.length < beforeCount) {
    throw new Error(`[SECURITY] updateJsonFromQueue: Links foram removidos! Antes: ${beforeCount}, Depois: ${data.length}`);
  }

  // Validação adicional: garantir que todas as URLs originais estão presentes
  const afterUrls = new Set(data.map(l => String(l?.url || "").trim().toLowerCase()).filter(Boolean));
  for (const url of beforeUrls) {
    if (!afterUrls.has(url)) {
      throw new Error(`[SECURITY] updateJsonFromQueue: URL única foi removida: ${url}`);
    }
  }

  // sort newest first by addedAt (stable enough)
  data.sort((a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")));

  writeJSON(JSON_FILE, data);

  return { added, updated, total: data.length };
}

function normalizeDate(dateStr) {
  // Normalizar addedAt para formato YYYY-MM-DD
  if (!dateStr) return ymdSaoPauloNow();
  const str = String(dateStr).trim();
  // Se já está em formato YYYY-MM-DD, retorna
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Se é ISO format, extrai a data
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  // Tenta parsear como Date
  try {
    const d = new Date(str);
    if (Number.isFinite(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  } catch {}
  return ymdSaoPauloNow();
}

function ensureAllLinksHaveId() {
  // Garantir que todos os links tenham id (necessário para aparecer no directory)
  if (!fs.existsSync(JSON_FILE)) {
    console.log("[fix-ids] links.json não encontrado, pulando correção\n");
    return;
  }
  
  const data = readJSON(JSON_FILE);
  const existingIds = new Set();
  let fixedIdCount = 0;
  let fixedDateCount = 0;
  let needsSave = false;
  let linksWithoutId = 0;
  let linksWithoutUrlOrTitle = 0;
  
  // Coletar todos os ids existentes
  for (const it of data) {
    if (it && it.id) existingIds.add(String(it.id).trim());
  }
  
  // Corrigir links que não têm id ou têm addedAt em formato errado
  for (const link of data) {
    if (!link) continue;
    
    // Normalizar addedAt para formato YYYY-MM-DD
    const originalDate = link.addedAt;
    const normalizedDate = normalizeDate(originalDate);
    if (originalDate !== normalizedDate) {
      link.addedAt = normalizedDate;
      fixedDateCount++;
      needsSave = true;
    }
    
    // Gerar id para links que não têm
    const currentId = String(link.id || "").trim();
    if (!currentId) {
      if (link.url && link.title) {
        link.id = makeId(link.url, link.title, normalizedDate, existingIds);
        existingIds.add(link.id);
        fixedIdCount++;
        needsSave = true;
      } else {
        linksWithoutUrlOrTitle++;
      }
      linksWithoutId++;
    }
  }
  
  if (needsSave) {
    writeJSON(JSON_FILE, data);
    if (fixedIdCount > 0) console.log(`[fix-ids] Generated ${fixedIdCount} missing id(s) for links`);
    if (fixedDateCount > 0) console.log(`[fix-dates] Normalized ${fixedDateCount} date(s) to YYYY-MM-DD format`);
    if (fixedIdCount > 0 || fixedDateCount > 0) console.log("");
  }
  
  // Validação final: verificar se ainda há links sem id
  let stillWithoutId = 0;
  for (const link of data) {
    if (link && !String(link.id || "").trim() && link.url && link.title) {
      stillWithoutId++;
    }
  }
  
  if (stillWithoutId > 0) {
    console.log(`[WARN] Ainda existem ${stillWithoutId} link(s) sem id após correção`);
  }
  
  if (linksWithoutUrlOrTitle > 0) {
    console.log(`[WARN] ${linksWithoutUrlOrTitle} link(s) sem url ou title (não podem receber id)`);
  }
  
  // Log de resumo
  const totalLinks = data.length;
  const linksWithId = totalLinks - linksWithoutId;
  console.log(`[fix-ids] Status: ${linksWithId}/${totalLinks} links têm id`);
  if (linksWithId === totalLinks && fixedIdCount === 0 && fixedDateCount === 0) {
    console.log("[fix-ids] Todos os links já estão corretos\n");
  }
}

function archiveAndClear(mode, txtPath, originalText) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const processedDir = path.join(HOME, "processed");
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }
  const out = path.join(processedDir, `${mode}-${stamp}.txt`);
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
  const reloadNginx = argv.includes("--reload-nginx");
  const noCheck = argv.includes("--no-check");

  // 1. Processar filas (dir.txt e links.txt)
  const dirTxtPath = path.join(HOME, "dir.txt");
  const linksTxtPath = path.join(HOME, "links.txt");

  if (!fs.existsSync(dirTxtPath)) fs.writeFileSync(dirTxtPath, "", "utf8");
  if (!fs.existsSync(linksTxtPath)) fs.writeFileSync(linksTxtPath, "", "utf8");

  const dirTxt = fs.readFileSync(dirTxtPath, "utf8");
  const linksTxt = fs.readFileSync(linksTxtPath, "utf8");

  // 0. Garantir que todos os links tenham id (necessário para aparecer no directory)
  ensureAllLinksHaveId();

  // 0. Deduplicar links existentes antes de processar filas
  // DESABILITADO TEMPORARIAMENTE - Apenas remove duplicados (mesma URL), nunca links únicos
  // if (fs.existsSync(JSON_FILE)) {
  //   const data = readJSON(JSON_FILE);
  //   const beforeCount = data.length;
  //   const deduplicated = deduplicateLinks(data);
  //   
  //   // Validação: garantir que não perdemos URLs únicas
  //   const beforeUniqueUrls = new Set(data.map(l => String(l?.url || "").trim().toLowerCase()).filter(Boolean));
  //   const afterUniqueUrls = new Set(deduplicated.map(l => String(l?.url || "").trim().toLowerCase()).filter(Boolean));
  //   
  //   if (beforeUniqueUrls.size !== afterUniqueUrls.size) {
  //     throw new Error(`[SECURITY] Deduplicação perdeu URLs únicas! Antes: ${beforeUniqueUrls.size}, Depois: ${afterUniqueUrls.size}`);
  //   }
  //   
  //   if (deduplicated.length !== beforeCount) {
  //     writeJSON(JSON_FILE, deduplicated);
  //     console.log(`[deduplicate] Cleaned ${beforeCount} -> ${deduplicated.length} links (removed duplicates only, preserved ${afterUniqueUrls.size} unique URLs)\n`);
  //   }
  // }

  ensureRobotsAndSitemapsAndFeeds();

  // Verificar estado inicial do JSON
  const initialData = fs.existsSync(JSON_FILE) ? readJSON(JSON_FILE) : [];
  const initialCount = initialData.length;
  console.log(`[INFO] Starting with ${initialCount} links in JSON\n`);

  // Processar dir.txt
  const hasDirWork = dirTxt.trim().length > 0;
  if (hasDirWork) {
    const dirQueue = parseQueueFile(dirTxt);
    const dirStats = updateJsonFromQueue("dir", dirQueue);
    console.log(`\n[OK] Directory JSON updated. added=${dirStats.added} updated=${dirStats.updated} total=${dirStats.total}\n`);
  } else {
    console.log(`\n[OK] dir.txt is empty. Skipping directory JSON update (all ${initialCount} links preserved).\n`);
  }

  // Processar links.txt
  const hasLinksWork = linksTxt.trim().length > 0;
  if (hasLinksWork) {
    const linksQueue = parseQueueFile(linksTxt);
    const linksStats = updateJsonFromQueue("links", linksQueue);
    console.log(`\n[OK] Links JSON updated. added=${linksStats.added} updated=${linksStats.updated} total=${linksStats.total}\n`);
  } else {
    console.log(`\n[OK] links.txt is empty. Skipping links JSON update (all ${initialCount} links preserved).\n`);
  }

  // Validação final: garantir que não perdemos links
  const finalData = readJSON(JSON_FILE);
  const finalCount = finalData.length;
  if (finalCount < initialCount) {
    throw new Error(`[SECURITY] Perda de links detectada! Início: ${initialCount}, Fim: ${finalCount}`);
  }
  console.log(`[INFO] All ${finalCount} links preserved after processing queues\n`);

  // 2. Build de todos os sites
  console.log("[RUN] build directory...");
  run("npx", ["@11ty/eleventy", "--config=sites/directory/eleventy.config.cjs"], { cwd: SRC });

  console.log("[RUN] build links...");
  run("npx", ["@11ty/eleventy", "--config=sites/links/eleventy.config.cjs"], { cwd: SRC });

  console.log("[RUN] build home...");
  run("node", ["sites/home/build.mjs"], { cwd: SRC });

  // 3. Deploy via rsync
  console.log("[RUN] deploy home (rsync)...");
  ensureDeployDir(DEPLOY_HOME);
  run("rsync", ["-a", "--delete", "--exclude", ".well-known", `${DIST_HOME}/`, `${DEPLOY_HOME}/`]);

  console.log("[RUN] deploy directory (rsync)...");
  ensureDeployDir(DEPLOY_DIR);
  run("rsync", ["-a", "--delete", "--exclude", ".well-known", `${DIST_DIR}/`, `${DEPLOY_DIR}/`]);

  console.log("[RUN] deploy links (rsync)...");
  ensureDeployDir(DEPLOY_LINKS);
  run("rsync", ["-a", "--delete", "--exclude", ".well-known", `${DIST_LINKS}/`, `${DEPLOY_LINKS}/`]);

  // 4. Reload nginx (se flag)
  if (reloadNginx) {
    console.log("[RUN] nginx -t && reload...");
    run("nginx", ["-t"]);
    run("systemctl", ["reload", "nginx"]);
  }

  // 5. Health checks (se não --no-check)
  if (!noCheck) {
    console.log("[RUN] health checks (expect 200)...");
    check200(`${URL_DIR}/sitemap.xml`);
    check200(`${URL_DIR}/robots.txt`);

    check200(`${URL_LINKS}/sitemap.xml`);
    check200(`${URL_LINKS}/robots.txt`);
    check200(`${URL_LINKS}/rss.xml`);
    check200(`${URL_LINKS}/atom.xml`);

    check200(`${URL_HOME}/`);
    check200(`${URL_HOME}/robots.txt`);
  }

  // 6. Limpar filas processadas
  if (hasDirWork) {
    archiveAndClear("dir", dirTxtPath, dirTxt);
    console.log(`[OK] consumed + archived dir.txt\n`);
  }

  if (hasLinksWork) {
    archiveAndClear("links", linksTxtPath, linksTxt);
    console.log(`[OK] consumed + archived links.txt\n`);
  }

  console.log("[OK] Deploy completo!\n");
}

try {
  main();
} catch (e) {
  console.error(`\n[FAIL] ${e?.message || e}\n`);
  process.exit(1);
}
