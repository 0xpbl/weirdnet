import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TXT_SOURCE = path.join(ROOT, "txt");
const CONTENT_DIR = path.join(ROOT, "sites", "letters", "content");
const OUT_DIR = path.join(ROOT, "dist", "letters");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyTxtFiles() {
  if (!fs.existsSync(TXT_SOURCE)) {
    console.log("[letters] txt/ directory not found, skipping copy");
    return;
  }

  ensureDir(CONTENT_DIR);

  // Limpar diretório de conteúdo antes de copiar
  if (fs.existsSync(CONTENT_DIR)) {
    const files = fs.readdirSync(CONTENT_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(CONTENT_DIR, file));
    }
  }

  // Copiar todos os arquivos .txt recursivamente, mantendo estrutura plana
  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      if (entry.isDirectory()) {
        copyRecursive(srcPath, dest);
      } else if (entry.isFile() && entry.name.endsWith(".txt")) {
        const destPath = path.join(dest, entry.name);
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyRecursive(TXT_SOURCE, CONTENT_DIR);
  console.log("[letters] Copied txt files to content directory");
}

function parseLetter(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  // Título é a primeira linha não vazia
  let title = "";
  let titleLineIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      title = lines[i].trim();
      titleLineIdx = i;
      break;
    }
  }

  // Extrair metadados
  let date = "";
  let from = "";
  let to = "";
  let subject = "";
  let bodyStartIdx = -1;

  for (let i = titleLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith("Data:")) {
      date = line.replace(/^Data:\s*/, "").trim();
    } else if (line.startsWith("De:")) {
      from = line.replace(/^De:\s*/, "").trim();
    } else if (line.startsWith("Para:")) {
      to = line.replace(/^Para:\s*/, "").trim();
    } else if (line.startsWith("Assunto:")) {
      subject = line.replace(/^Assunto:\s*/, "").trim();
    } else if (line.trim() === "---") {
      bodyStartIdx = i + 1;
      break;
    }
  }

  // Se não encontrou "---", corpo começa após os metadados
  if (bodyStartIdx === -1) {
    for (let i = titleLineIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() && !lines[i].includes(":") && !lines[i].match(/^\d{2}\/\d{2}\/\d{4}/)) {
        bodyStartIdx = i;
        break;
      }
    }
  }

  // Extrair corpo
  const body = bodyStartIdx >= 0 
    ? lines.slice(bodyStartIdx).join("\n").trim()
    : "";

  // Gerar slug do nome do arquivo
  const filename = path.basename(filePath, ".txt");
  // Formato: YYYY-MM-DD_titulo -> YYYY-MM-DD-titulo
  const slug = filename.replace(/_/g, "-");

  // Parsear data para ordenação (DD/MM/YYYY HH:MM -> Date)
  let dateObj = null;
  if (date) {
    const dateMatch = date.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (dateMatch) {
      const [, day, month, year, hour, minute] = dateMatch;
      dateObj = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    }
  }

  return {
    title,
    date,
    dateObj,
    from,
    to,
    subject,
    body,
    slug,
    filename
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  // DD/MM/YYYY HH:MM -> formato mais legível
  return dateStr;
}

function renderList(letters) {
  const items = letters.map(letter => {
    const dateDisplay = letter.date ? formatDate(letter.date) : letter.filename.split("_")[0];
    return `<li>
    <a href="/letters/${letter.slug}/">${dateDisplay}: ${escapeHtml(letter.title)}</a>
    ${letter.from ? `<br><span class="small">De: ${escapeHtml(letter.from)}</span>` : ""}
  </li>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Letters — weirdnet.org</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/letters.css">
</head>
<body>
  <div class="wrap">
    <table width="100%" cellspacing="0" cellpadding="8" class="box">
      <tr>
        <td valign="top">
          <h1>Letters</h1>
          <p class="small"><i>...crazy letters.</i></p>
          <p class="small">
            <a href="/">&laquo; back to home</a>
          </p>
          <hr>
          <ul class="letters-list">
${items}
          </ul>
          <hr>
          <div class="footer">
            Made by <a href="https://pablo.space" rel="noreferrer"><b>Pablo Murad</b></a>, since 1987 — no rights reserved.
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

function renderLetter(letter) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(letter.title)} — Letters — weirdnet.org</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/letters.css">
</head>
<body>
  <div class="wrap">
    <table width="100%" cellspacing="0" cellpadding="8" class="box">
      <tr>
        <td valign="top">
          <h1>${escapeHtml(letter.title)}</h1>
          <p class="small">
            <a href="/letters/">&laquo; back to letters</a>
          </p>
          <hr>
          <div class="letter-meta">
            ${letter.date ? `<p class="small"><b>Data:</b> ${escapeHtml(letter.date)}</p>` : ""}
            ${letter.from ? `<p class="small"><b>De:</b> ${escapeHtml(letter.from)}</p>` : ""}
            ${letter.to ? `<p class="small"><b>Para:</b> ${escapeHtml(letter.to)}</p>` : ""}
            ${letter.subject ? `<p class="small"><b>Assunto:</b> ${escapeHtml(letter.subject)}</p>` : ""}
          </div>
          <hr>
          <div class="letter-body">
            <pre>${escapeHtml(letter.body)}</pre>
          </div>
          <hr>
          <div class="footer">
            Made by <a href="https://pablo.space" rel="noreferrer"><b>Pablo Murad</b></a>, since 1987 — no rights reserved.
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

function main() {
  // 1. Copiar arquivos txt
  copyTxtFiles();

  // 2. Ler e parsear todas as cartas
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log("[letters] Content directory not found, skipping build");
    return;
  }

  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith(".txt"))
    .map(f => path.join(CONTENT_DIR, f));

  const letters = files.map(filePath => parseLetter(filePath));

  // 3. Ordenar cronologicamente (mais recente primeiro)
  letters.sort((a, b) => {
    if (a.dateObj && b.dateObj) {
      return b.dateObj - a.dateObj;
    }
    // Se não tem data, ordena por nome do arquivo (mais recente primeiro)
    return b.filename.localeCompare(a.filename);
  });

  console.log(`[letters] Parsed ${letters.length} letters`);

  // 4. Gerar páginas
  ensureDir(OUT_DIR);

  // Lista principal
  const listHtml = renderList(letters);
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), listHtml, "utf8");

  // Páginas individuais
  for (const letter of letters) {
    const letterDir = path.join(OUT_DIR, letter.slug);
    ensureDir(letterDir);
    const letterHtml = renderLetter(letter);
    fs.writeFileSync(path.join(letterDir, "index.html"), letterHtml, "utf8");
  }

  // 5. Copiar assets CSS
  const cssSource = path.join(ROOT, "public", "css");
  const cssDest = path.join(OUT_DIR, "css");
  if (fs.existsSync(cssSource)) {
    ensureDir(cssDest);
    const cssFiles = fs.readdirSync(cssSource);
    for (const file of cssFiles) {
      if (file.endsWith(".css")) {
        fs.copyFileSync(
          path.join(cssSource, file),
          path.join(cssDest, file)
        );
      }
    }
  }

  console.log(`[letters] Built ${letters.length + 1} pages in ${OUT_DIR}`);
}

main();
