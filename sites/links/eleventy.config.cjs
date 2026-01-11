function xmlEscape(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDateFromYMD(ymd) {
  // ymd: "YYYY-MM-DD"
  // cria data UTC 00:00:00
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 0, 0, 0));
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "public": "." });

  // XML escape seguro (RSS/Atom)
  eleventyConfig.addFilter("xml", (value) => xmlEscape(value));

  // RFC 822 (RSS pubDate/lastBuildDate)
  eleventyConfig.addFilter("rfc822", (ymd) => {
    const dt = toDateFromYMD(ymd);
    if (!dt) return "";
    return dt.toUTCString(); // "Sun, 11 Jan 2026 00:00:00 GMT"
  });

  // RFC3339 (Atom updated/published)
  eleventyConfig.addFilter("rfc3339", (ymd) => {
    const dt = toDateFromYMD(ymd);
    if (!dt) return "";
    return dt.toISOString().replace(".000Z", "Z"); // "2026-01-11T00:00:00Z"
  });

  return {
    dir: {
      input: "sites/links/src",
      includes: "_includes",
      data: "_data",
      output: "dist/links"
    },
    templateFormats: ["njk", "html", "md"]
  };
};

