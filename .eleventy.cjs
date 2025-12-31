module.exports = function (eleventyConfig) {
  eleventyConfig.setTemplateFormats([
    "html",
    "njk",
    "xml"
  ]);

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};
