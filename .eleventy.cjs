module.exports = function(eleventyConfig) {

  /* PASS THROUGH ASSETS */
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("og-default.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-analysis.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-features.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-tested.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-verdict.jpg");

  /* ✅ BULLETPROOF POSTS COLLECTION */
  eleventyConfig.addCollection("posts", function(collectionApi) {

    return collectionApi
      .getFilteredByGlob("posts/**/*.md") // ONLY grab generated markdown
      .sort((a, b) => b.date - a.date);

  });

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
