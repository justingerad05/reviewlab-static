const htmlmin = require("@11ty/eleventy-plugin-htmlmin");

module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("*.jpg");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

  eleventyConfig.addWatchTarget("./og-images/");
  eleventyConfig.addWatchTarget("./topics/");
  eleventyConfig.addWatchTarget("./author/");

  eleventyConfig.addPlugin(htmlmin,{
    collapseWhitespace:true,
    removeComments:true,
    useShortDoctype:true
  });

  eleventyConfig.addCollection("aiWriting", function(collectionApi) {
  return collectionApi.getFilteredByGlob("./posts/**/*writer*/index.html");
  });

  return {
    dir:{
      input:".",
      output:"_site"
    }
  };
};
