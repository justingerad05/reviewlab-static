import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const res = await fetch(FEED_URL);
const xml = await res.text();

const parser = new XMLParser({ ignoreAttributes: false });
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if (!Array.isArray(entries)) entries = [entries];

fs.mkdirSync("posts", { recursive: true });

entries.forEach((entry, i) => {
  const html = entry.content?.["#text"];
  if (!html) return;

  const rawTitle = entry.title?.["#text"] || "Review";
  const title = rawTitle.split("🔥")[0].trim();

  const imageMatch = html.match(/<img[^>]+src="([^">]+)"/);
  const ogImage = imageMatch
    ? imageMatch[1]
    : "https://justingerad05.github.io/reviewlab-static/og-default.jpg";

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${title}">
  <link rel="canonical" href="https://justingerad05.github.io/reviewlab-static/posts/${slug}/">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${title}">
  <meta property="og:url" content="https://justingerad05.github.io/reviewlab-static/posts/${slug}/">
  <meta property="og:image" content="${ogImage}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${title}">
  <meta name="twitter:image" content="${ogImage}">

  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>

${html}

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
});
