// .eleventy.cjs
module.exports = function(eleventyConfig) {

  /* ===== PASSTHROUGH COPY ===== */
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("og-default.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-analysis.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-features.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-tested.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-verdict.jpg");

  /* ===== WATCH OG FOLDER ===== */
  eleventyConfig.addWatchTarget("./og-images/");

  /* ===== BULLETPROOF POSTS COLLECTION ===== */
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi
      .getFilteredByGlob("./posts/**/*.md")
      .filter(post => !post.data?.draft)
      .sort((a, b) => b.date - a.date);
  });

  /* ===== RETURN CONFIG ===== */
  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
