module.exports = function (eleventyConfig) {
  // Force static assets to be copied as-is
  eleventyConfig.addPassthroughCopy({ "assets": "assets" });

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
