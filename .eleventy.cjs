module.exports = function(eleventyConfig) {

  /* PASS THROUGH ASSETS */
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("og-default.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-analysis.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-features.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-tested.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-verdict.jpg");

  /* WATCH OG FOLDER (prevents cache issues) */
  eleventyConfig.addWatchTarget("./og-images/");

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
