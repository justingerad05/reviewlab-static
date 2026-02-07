module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("*.jpg");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

  eleventyConfig.addWatchTarget("./og-images/");

  return {
    dir:{
      input:".",
      output:"_site"
    }
  };
};
