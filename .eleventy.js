module.exports = function(eleventyConfig) {

  /* PASS EVERYTHING THROUGH */
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("og-default.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-analysis.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-features.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-tested.jpg");
  eleventyConfig.addPassthroughCopy("og-cta-verdict.jpg");

  /* 🔥 BUILD POSTS COLLECTION */
  eleventyConfig.addCollection("posts", function(collectionApi) {

    return collectionApi
      .getFilteredByGlob("posts/**/index.html")
      .sort((a, b) => {
        return new Date(b.data.date) - new Date(a.data.date);
      });

  });

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
