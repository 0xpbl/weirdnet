const getLinks = require("./links");

function ymdSaoPaulo(date) {
  // en-CA => YYYY-MM-DD
  // Usar a mesma lógica do uni.mjs
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
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
