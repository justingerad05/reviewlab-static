module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("topics");     // ✅ FIX 404
  eleventyConfig.addPassthroughCopy("author");     // ✅ ensure deploy
  eleventyConfig.addPassthroughCopy("*.jpg");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

  eleventyConfig.addWatchTarget("./og-images/");
  eleventyConfig.addWatchTarget("./topics/");
  eleventyConfig.addWatchTarget("./author/");

  const htmlmin = require("@11ty/eleventy-plugin-htmlmin");

  eleventyConfig.addPlugin(htmlmin,{
  collapseWhitespace:true,
  removeComments:true,
  useShortDoctype:true
});

  return {
    dir:{
      input:".",
      output:"_site"
    }
  };
};
