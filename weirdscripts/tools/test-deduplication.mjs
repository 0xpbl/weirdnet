import fs from "fs";
import path from "path";

// Detectar se estamos no Windows ou Linux
const isWindows = process.platform === "win32";
const ROOT = process.cwd();

// Paths locais (ajustar conforme necessário)
const JSON_FILE = path.join(ROOT, "data", "links.json");
const HOME = path.join(ROOT, "weirdscripts");

function normalizeDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  try {
    const d = new Date(str);
    if (Number.isFinite(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  } catch {}
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`links.json is not an array: ${file}`);
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
    console.log(`[backup] Created backup: ${backupFile}`);
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function deduplicateLinks(data) {
  const byUrl = new Map();
  
  for (const link of data) {
    if (!link || !link.url) continue;
    const urlKey = String(link.url).trim().toLowerCase();
    
    if (!byUrl.has(urlKey)) {
      byUrl.set(urlKey, []);
    }
    byUrl.get(urlKey).push(link);
  }
  
  const deduplicated = [];
  let removedCount = 0;
  let datesNormalized = 0;
  let metadataMerged = 0;
  const uniqueUrls = new Set();
  
  for (const [urlKey, links] of byUrl.entries()) {
    if (links.length === 1) {
      const link = { ...links[0] };
      const originalDate = link.addedAt;
      const normalizedDate = normalizeDate(originalDate);
      if (originalDate !== normalizedDate) {
        link.addedAt = normalizedDate;
        datesNormalized++;
      }
      deduplicated.push(link);
      uniqueUrls.add(urlKey);
    } else {
      links.sort((a, b) => {
        const dateA = normalizeDate(a.addedAt || "");
        const dateB = normalizeDate(b.addedAt || "");
        return dateA.localeCompare(dateB);
      });
      
      const kept = { ...links[0] };
      const originalDate = kept.addedAt;
      const normalizedDate = normalizeDate(kept.addedAt);
      if (originalDate !== normalizedDate) {
        kept.addedAt = normalizedDate;
        datesNormalized++;
      }
      
      let hadChanges = false;
      
      if (links.some(l => l.isDirectory === true)) {
        if (kept.isDirectory !== true) hadChanges = true;
        kept.isDirectory = true;
      }
      
      if (!kept.category) {
        for (const l of links) {
          if (l.category) {
            kept.category = l.category;
            hadChanges = true;
            break;
          }
        }
      }
      
      const allTags = new Set();
      for (const l of links) {
        if (Array.isArray(l.tags)) {
          for (const tag of l.tags) {
            allTags.add(String(tag).trim());
          }
        }
      }
      const originalTagsCount = Array.isArray(kept.tags) ? kept.tags.length : 0;
      if (allTags.size > 0) {
        kept.tags = Array.from(allTags).filter(Boolean);
        if (kept.tags.length !== originalTagsCount) {
          hadChanges = true;
          metadataMerged++;
        }
      }
      
      if (!kept.id) {
        for (const l of links) {
          if (l.id) {
            kept.id = l.id;
            hadChanges = true;
            break;
          }
        }
      }
      
      if (hadChanges) metadataMerged++;
      
      deduplicated.push(kept);
      uniqueUrls.add(urlKey);
      removedCount += links.length - 1;
    }
  }
  
  const beforeUniqueUrls = new Set(
    data.map(l => String(l?.url || "").trim().toLowerCase()).filter(Boolean)
  );
  const afterUniqueUrls = new Set(
    deduplicated.map(l => String(l?.url || "").trim().toLowerCase()).filter(Boolean)
  );
  
  if (beforeUniqueUrls.size !== afterUniqueUrls.size) {
    throw new Error(`[SECURITY] Perda de URLs únicas! Antes: ${beforeUniqueUrls.size}, Depois: ${afterUniqueUrls.size}`);
  }
  
  return {
    data: deduplicated,
    removedCount,
    datesNormalized,
    metadataMerged,
    hadChanges: removedCount > 0 || datesNormalized > 0 || metadataMerged > 0
  };
}

function main() {
  console.log("[TEST] Testando deduplicação localmente...\n");
  
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`[FAIL] links.json não encontrado: ${JSON_FILE}`);
    process.exit(1);
  }
  
  const data = readJSON(JSON_FILE);
  const beforeCount = data.length;
  const beforeUniqueUrls = new Set(
    data.map(l => String(l?.url || "").trim().toLowerCase()).filter(Boolean)
  );
  
  console.log(`[INFO] Antes: ${beforeCount} links, ${beforeUniqueUrls.size} URLs únicas`);
  
  const result = deduplicateLinks(data);
  const deduplicated = result.data;
  const afterUniqueUrls = new Set(
    deduplicated.map(l => String(l?.url || "").trim().toLowerCase()).filter(Boolean)
  );
  
  console.log(`[INFO] Depois: ${deduplicated.length} links, ${afterUniqueUrls.size} URLs únicas\n`);
  
  if (result.hadChanges) {
    const logs = [];
    if (result.removedCount > 0) {
      logs.push(`removidos ${result.removedCount} duplicado(s)`);
    }
    if (result.datesNormalized > 0) {
      logs.push(`normalizadas ${result.datesNormalized} data(s)`);
    }
    if (result.metadataMerged > 0) {
      logs.push(`mesclados metadados de ${result.metadataMerged} link(s)`);
    }
    console.log(`[deduplicate] Mudanças: ${logs.join(", ")}`);
    console.log(`[deduplicate] ${beforeCount} -> ${deduplicated.length} links (preservadas ${afterUniqueUrls.size} URLs únicas)\n`);
    
    // Perguntar se quer salvar
    console.log("[TEST] Para aplicar as mudanças, execute:");
    console.log(`  node weirdscripts/tools/publish.mjs dir --no-check`);
    console.log(`  node weirdscripts/tools/publish.mjs links --no-check\n`);
  } else {
    console.log(`[deduplicate] Nenhum duplicado encontrado, ${beforeCount} links já estão limpos\n`);
  }
  
  // Mostrar alguns exemplos de duplicados se houver
  if (result.removedCount > 0) {
    console.log("[INFO] Exemplos de URLs que tinham duplicados:");
    const byUrl = new Map();
    for (const link of data) {
      if (!link || !link.url) continue;
      const urlKey = String(link.url).trim().toLowerCase();
      if (!byUrl.has(urlKey)) {
        byUrl.set(urlKey, []);
      }
      byUrl.get(urlKey).push(link);
    }
    
    let shown = 0;
    for (const [urlKey, links] of byUrl.entries()) {
      if (links.length > 1 && shown < 5) {
        console.log(`  - ${urlKey} (${links.length} cópias)`);
        shown++;
      }
    }
    if (result.removedCount > 5) {
      console.log(`  ... e mais ${result.removedCount - 5} duplicado(s)\n`);
    } else {
      console.log("");
    }
  }
}

main();
