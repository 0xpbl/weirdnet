const getLinks = require("./links");

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

module.exports = function () {
  const links = getLinks();

  const now = new Date();
  const today = ymdSaoPaulo(now);
  const thisMonth = today.slice(0, 7); // YYYY-MM

  const todayCount = links.filter((l) => {
    const linkDate = String(l.addedAt || "").trim();
    return linkDate === today;
  }).length;
  
  const thisMonthCount = links.filter((l) => {
    const linkDate = String(l.addedAt || "").trim();
    return linkDate.startsWith(thisMonth);
  }).length;

  return {
    today,
    thisMonth,
    todayCount,
    thisMonthCount,
    latestDate: links.length ? (links[0].addedAt || "") : "",
    total: links.length,
  };
};
