module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("*.jpg");

  eleventyConfig.addWatchTarget("./og-images/");

  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi
      .getFilteredByGlob("./posts/**/*.html")
      .sort((a, b) => b.date - a.date);
  });

  return {
    dir:{
      input:".",
      output:"_site"
    }
  };
};
