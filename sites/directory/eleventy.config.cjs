module.exports = function (eleventyConfig) {
  // copia /public -> raiz do output (/css, /js, etc.)
  eleventyConfig.addPassthroughCopy({ "public": "." });

  return {
    dir: {
      input: "sites/directory/src",
      includes: "_includes",
      data: "_data",
      output: "dist/directory"
    },
    templateFormats: ["njk", "html", "md"]
  };
};
