const fs = require("fs");
const path = require("path");

module.exports = () => {
  const jsonPath = path.resolve(__dirname, "../../../../data/links.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
};
