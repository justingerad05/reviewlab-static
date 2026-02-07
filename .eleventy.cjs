module.exports = function(eleventyConfig) {

  /* STATIC ASSETS — CRITICAL */
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("fonts");
  eleventyConfig.addWatchTarget("./og-images/");

  /* POSTS COLLECTION */
  eleventyConfig.addCollection("posts", function(collectionApi) {

    return collectionApi
      .getFilteredByGlob("./posts/**/*.html")
      .sort((a,b)=> b.date - a.date);

  });

  return {
    dir:{
      input:".",
      output:"_site"
    }
  };
};
