module.exports = function (eleventyConfig) {

  /* ================= PASSTHROUGH ASSETS ================= */

  eleventyConfig.addPassthroughCopy("og-default.jpg");
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("robots.txt");

  eleventyConfig.addWatchTarget("./og-images/");

  /* ================= TEMPLATE SUPPORT ================= */

  eleventyConfig.setTemplateFormats([
    "html",
    "liquid",
    "xml"
  ]);

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
