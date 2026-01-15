// Script para testar o cálculo de estatísticas
import fs from "fs";
import path from "path";

const SRC = process.env.WEIRDNET_SRC || path.resolve(path.join(process.cwd(), "../.."));
const JSON_FILE = path.join(SRC, "data", "links.json");

function ymdSaoPaulo(date) {
  // Garantir formato YYYY-MM-DD usando timezone de São Paulo
  // Usar Intl.DateTimeFormat para garantir formato consistente
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;
  return `${year}-${month}-${day}`;
}

console.log("[TEST] Testando cálculo de estatísticas...\n");

// Ler links
const data = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
const links = data
  .filter((x) => x && typeof x === "object" && x.id && x.url && x.title)
  .sort((a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")));

console.log(`[INFO] Total de links: ${links.length}`);
console.log(`[INFO] Links mais recentes (primeiros 5):`);
links.slice(0, 5).forEach((l, i) => {
  console.log(`  ${i + 1}. ${l.title} - addedAt: "${l.addedAt}"`);
});

// Calcular estatísticas
const now = new Date();
const today = ymdSaoPaulo(now);
const thisMonth = today.slice(0, 7);

console.log(`\n[INFO] Data atual no servidor: ${now.toISOString()}`);
console.log(`[INFO] Data calculada como "today": "${today}"`);
console.log(`[INFO] Mês calculado como "thisMonth": "${thisMonth}"`);

const todayCount = links.filter((l) => {
  const linkDate = String(l.addedAt || "").trim();
  return linkDate === today;
}).length;

const thisMonthCount = links.filter((l) => {
  const linkDate = String(l.addedAt || "").trim();
  return linkDate.startsWith(thisMonth);
}).length;

console.log(`\n[RESULT] todayCount: ${todayCount}`);
console.log(`[RESULT] thisMonthCount: ${thisMonthCount}`);
console.log(`[RESULT] latestDate: ${links.length ? links[0].addedAt : "N/A"}`);

// Mostrar links que têm a data de hoje
if (todayCount > 0) {
  console.log(`\n[INFO] Links com data de hoje (${today}):`);
  links.filter((l) => String(l.addedAt || "").trim() === today).forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.title} - ${l.url}`);
  });
} else {
  console.log(`\n[WARN] Nenhum link encontrado com data de hoje (${today})`);
  console.log(`[INFO] Verificando datas dos links mais recentes:`);
  const uniqueDates = new Set(links.slice(0, 10).map(l => l.addedAt));
  console.log(`  Datas encontradas: ${Array.from(uniqueDates).join(", ")}`);
}
