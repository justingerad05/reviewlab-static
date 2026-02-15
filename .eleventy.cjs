const htmlmin = require("@11ty/eleventy-plugin-htmlmin");

module.exports = function(eleventyConfig) {

  eleventyConfig.setTemplateFormats(["html"]);

  // Static assets
  eleventyConfig.addPassthroughCopy("og-images");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("*.jpg");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

  // Watch targets (GOOD — keep these)
  eleventyConfig.addWatchTarget("./og-images/");
  eleventyConfig.addWatchTarget("./ai-tools/");
  eleventyConfig.addWatchTarget("./author/");

  // HTML minification
  eleventyConfig.addPlugin(htmlmin,{
    collapseWhitespace:true,
    removeComments:true,
    useShortDoctype:true
  });

  eleventyConfig.addCollection("aiToolsCategories", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./ai-tools/*/index.*");
  });

    // Collection
  eleventyConfig.addCollection("aiWriting", function(collectionApi) {
  return collectionApi.getFilteredByGlob("./posts/**/*writer*/index.html");
});

  // AI IMAGE TOOLS
eleventyConfig.addCollection("aiImages", function(collectionApi) {
  return collectionApi.getFilteredByGlob("./posts/**/*image*/index.html");
});

// AUTOMATION TOOLS
eleventyConfig.addCollection("automation", function(collectionApi) {
  return collectionApi.getFilteredByGlob("./posts/**/*automation*/index.html");
});

  return {
    dir:{
      input: ".",
      includes: "_includes", // ← ADD THIS (important clarity)
      output:"_site"
    }
  };
};
