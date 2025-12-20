module.exports = function (eleventyConfig) {

  eleventyConfig.addCollection("posts", collection =>
    collection.getFilteredByGlob("posts/**/index.html")
  );

  eleventyConfig.addTransform("seo", function (content) {
    if (!this.page || !this.page.outputPath?.endsWith(".html")) return content;

    const title = this.page.data.title || "Honest Product Review Lab";
    const description =
      this.page.data.description ||
      "Honest reviews of AI tools, software, and digital products.";
    const ogImage = this.page.data.ogImage || "";
    const fullUrl = `https://justingerad05.github.io${this.page.url}`;

    return content.replace(
      "</head>",
      `
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${fullUrl}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${fullUrl}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ""}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ""}

</head>`
    );
  });

};
