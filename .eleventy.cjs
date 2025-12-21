module.exports = function (eleventyConfig) {
  // Explicitly copy static assets to _site
  eleventyConfig.addPassthroughCopy("assets");

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
