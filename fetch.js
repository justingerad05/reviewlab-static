import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import path from "path";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

// Fetch feed
const res = await fetch(FEED_URL);
const xml = await res.text();

// Parse XML
const parser = new XMLParser({
  ignoreAttributes: false,
});
const data = parser.parse(xml);

// Normalize entries
let entries = data?.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

// Ensure folders
fs.mkdirSync("posts", { recursive: true });
fs.mkdirSync("data", { recursive: true });

const postsIndex = [];

entries.forEach((entry) => {
  const title = entry.title?.["#text"] || "Untitled Post";
  const html = entry.content?.["#text"];
  if (!html) return;

  const published =
    entry.published || entry.updated || new Date().toISOString();

  const linkObj = Array.isArray(entry.link)
    ? entry.link.find((l) => l["@_rel"] === "alternate")
    : entry.link;

  const originalUrl = linkObj?.["@_href"] || "";
  if (!originalUrl) return;

  const slug = originalUrl
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(".html", "");

  const dir = path.join("posts", slug);
  fs.mkdirSync(dir, { recursive: true });

  const description = title;

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>

  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <link rel="canonical" href="https://justingerad05.github.io/reviewlab-static/posts/${slug}/">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="https://justingerad05.github.io/reviewlab-static/posts/${slug}/">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
</head>
<body>

<article>
  <h1>${title}</h1>
  <time datetime="${published}">${new Date(published).toDateString()}</time>
  ${html}
</article>

</body>
</html>`;

  fs.writeFileSync(path.join(dir, "index.html"), page);

  postsIndex.push({
    title,
    slug,
    url: `/posts/${slug}/`,
    published,
  });
});

// Write data for homepage + sitemap
fs.writeFileSync(
  "data/posts.json",
  JSON.stringify(postsIndex, null, 2)
);

console.log(`Imported ${postsIndex.length} posts`);
