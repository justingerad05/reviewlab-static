module.exports = function (eleventyConfig) {
  // Allow Eleventy to process XML templates
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
