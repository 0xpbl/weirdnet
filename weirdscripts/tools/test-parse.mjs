import fs from "fs";
import path from "path";

// Simular o mesmo ambiente
// WEIRDNET_HOME deve ser o diretório weirdscripts (onde estão dir.txt e links.txt)
const HOME = process.env.WEIRDNET_HOME || path.join(process.cwd(), "..");
const txtPath = path.join(HOME, "dir.txt");

// Se não encontrar, tenta no diretório atual (weirdscripts)
const altPath = path.join(process.cwd(), "dir.txt");

let finalPath = txtPath;
if (!fs.existsSync(txtPath)) {
  if (fs.existsSync(altPath)) {
    finalPath = altPath;
    console.log(`[INFO] Usando caminho alternativo: ${altPath}`);
  } else {
    console.log(`[FAIL] Arquivo não existe em nenhum dos caminhos:`);
    console.log(`  - ${txtPath}`);
    console.log(`  - ${altPath}`);
    process.exit(1);
  }
}

console.log(`[TEST] Lendo arquivo: ${finalPath}`);
console.log(`[TEST] WEIRDNET_HOME: ${HOME}\n`);

const txt = fs.readFileSync(finalPath, "utf8");
console.log(`[INFO] Tamanho do arquivo: ${txt.length} caracteres`);
console.log(`[INFO] Número de linhas: ${txt.split(/\r?\n/).length}\n`);

if (txt.trim().length === 0) {
  console.log("[WARN] Arquivo está vazio!");
  process.exit(0);
}

console.log("[INFO] Conteúdo do arquivo:");
console.log("---");
console.log(txt);
console.log("---\n");

// Testar parsing
function parseCategoryLine(line) {
  const match = line.match(/^([^:]+):\s*(.+)$/);
  if (!match) return null;
  const category = match[1].trim();
  const tagsStr = match[2].trim();
  const tags = tagsStr ? tagsStr.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean) : [];
  return { category, tags };
}

function splitLinkLine(line) {
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

function parseQueueFile(text) {
  const lines = text.split(/\r?\n/);
  
  let current = null;
  const out = [];
  
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    
    if (!line.startsWith("http://") && !line.startsWith("https://")) {
      const cat = parseCategoryLine(line);
      if (!cat) {
        console.log(`[ERROR] Linha de categoria inválida: "${line}"`);
        continue;
      }
      current = cat;
      console.log(`[OK] Categoria: ${cat.category}, Tags: ${cat.tags.join(", ")}`);
      continue;
    }
    
    if (!current) {
      console.log(`[ERROR] Link antes de categoria: "${line}"`);
      continue;
    }
    
    const item = splitLinkLine(line);
    if (!item) {
      console.log(`[ERROR] Linha de link inválida: "${line}"`);
      continue;
    }
    
    console.log(`[OK] Link: ${item.url}`);
    console.log(`     Título: ${item.title}`);
    console.log(`     Descrição: ${item.desc.substring(0, 50)}...`);
    
    out.push({
      ...item,
      category: current.category,
      tags: current.tags,
    });
  }
  
  return out;
}

console.log("[TEST] Testando parsing...\n");
const queue = parseQueueFile(txt);

console.log(`\n[RESULT] Total de links parseados: ${queue.length}`);

if (queue.length === 0) {
  console.log("\n[FAIL] Nenhum link foi parseado! Verifique o formato do arquivo.");
  process.exit(1);
}

console.log("\n[SUCCESS] Parsing funcionou corretamente!");