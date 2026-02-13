const htmlmin = require("@11ty/eleventy-plugin-htmlmin");

module.exports = function(eleventyConfig) {

  // Static assets
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("*.jpg");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

  // Watch targets (GOOD — keep these)
  eleventyConfig.addWatchTarget("./og-images/");
  eleventyConfig.addWatchTarget("./topics/");
  eleventyConfig.addWatchTarget("./author/");

  // HTML minification
  eleventyConfig.addPlugin(htmlmin,{
    collapseWhitespace:true,
    removeComments:true,
    useShortDoctype:true
  });

  return {
    dir:{
      input: ".",
      includes: "_includes", // ← ADD THIS (important clarity)
      output:"_site"
    }
  };
};
