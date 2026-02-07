export default function (eleventyConfig) {

  // Publish OG images
  eleventyConfig.addPassthroughCopy("og-images");

  // Publish any root images like og-default.jpg
  eleventyConfig.addPassthroughCopy({
    "og-default.jpg": "og-default.jpg"
  });

  // Optional but recommended
  eleventyConfig.addWatchTarget("./og-images/");

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
}
