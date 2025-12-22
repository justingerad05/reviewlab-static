module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("posts");
  return {
    dir: {
      input: ".",
      includes: ".",
      output: "_site"
    }
  };
};
