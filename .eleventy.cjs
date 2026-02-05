module.exports = function (eleventyConfig) {

  /* PASS THROUGH STATIC FILES */
  eleventyConfig.addPassthroughCopy("og-default.jpg");
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("robots.txt");

  /* WATCH FOR OG CHANGES */
  eleventyConfig.addWatchTarget("./og-images/");

  eleventyConfig.setTemplateFormats([
    "html",
    "njk",
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
