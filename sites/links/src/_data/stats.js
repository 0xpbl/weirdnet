const getLinks = require("./links");

function ymdSaoPaulo(date) {
  // en-CA => YYYY-MM-DD
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

module.exports = function () {
  const links = getLinks();

  const today = ymdSaoPaulo(new Date());
  const thisMonth = today.slice(0, 7); // YYYY-MM

  const todayCount = links.filter((l) => l.addedAt === today).length;
  const thisMonthCount = links.filter((l) => (l.addedAt || "").startsWith(thisMonth)).length;

  return {
    today,
    thisMonth,
    todayCount,
    thisMonthCount,
    latestDate: links.length ? links[0].addedAt : "",
    total: links.length,
  };
};
