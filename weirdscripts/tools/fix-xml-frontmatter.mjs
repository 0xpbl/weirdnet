#!/usr/bin/env node
import fs from "fs";
import path from "path";

const TARGETS = [
  "/home/weirdnet/_src/sites/directory/src/sitemap.njk",
  "/home/weirdnet/_src/sites/links/src/sitemap.njk",
  "/home/weirdnet/_src/sites/links/src/rss.njk",
  "/home/weirdnet/_src/sites/links/src/atom.njk",

  // se quiser também corrigir os gerados (opcional, mas útil pra “consertar agora”):
  "/home/weirdnet/_src/dist/directory/sitemap.xml",
  "/home/weirdnet/_src/dist/links/sitemap.xml",
  "/home/weirdnet/_src/dist/links/rss.xml",
  "/home/weirdnet/_src/dist/links/atom.xml",
];

function stripBom(s) {
  // BOM UTF-8: \uFEFF
  return s.startsWith("\uFEFF") ? s.slice(1) : s;
}

function fixFrontMatterXmlSpacing(input) {
  let s = stripBom(input);

  // 1) Se houver front matter Nunjucks/YAML no topo, garante que nada (nem \n nem espaços)
  // fique entre o fechamento do front matter e o XML declaration.
  //
  // Forma:
  // ---\n ... \n---\n[whitespace]\n<?xml
  // vira:
  // ---\n ... \n---\n<?xml
  //
  // Suporta \r\n também.
  s = s.replace(
    /^(---\r?\n[\s\S]*?\r?\n---)(\r?\n[ \t\r\n]*)(<\?xml\b)/,
    (_m, fm, _ws, xml) => `${fm}\n${xml}`
  );

  // 2) Caso não tenha front matter, mas tenha whitespace antes de <?xml no começo do arquivo,
  // remove para garantir que <?xml seja o primeiro token.
  s = s.replace(/^\s+(<\?xml\b)/, "$1");

  return s;
}

function fixFile(file) {
  if (!fs.existsSync(file)) return { file, changed: false, reason: "missing" };

  const before = fs.readFileSync(file, "utf8");
  const after = fixFrontMatterXmlSpacing(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    return { file, changed: true };
  }
  return { file, changed: false };
}

function main() {
  let changedCount = 0;

  for (const f of TARGETS) {
    const res = fixFile(f);
    if (res.reason === "missing") {
      console.log(`[SKIP] missing: ${res.file}`);
      continue;
    }
    if (res.changed) {
      changedCount++;
      console.log(`[FIX]  ${res.file}`);
    } else {
      console.log(`[OK]   ${res.file}`);
    }
  }

  console.log(`\nDone. Changed ${changedCount} file(s).\n`);
}

main();
