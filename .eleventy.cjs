module.exports = function (eleventyConfig) {

  eleventyConfig.addFilter("extractYoutubeThumbnail", function (content) {
    if (!content || typeof content !== "string") return "";

    const match = content.match(
      /(youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );

    if (!match) return "";

    return "https://img.youtube.com/vi/" + match[2] + "/maxresdefault.jpg";
  });

  return {
    dir: {
      input: ".",
      layouts: "_layouts"
    }
  };
};
