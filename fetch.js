import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const res = await fetch(FEED_URL);
const xml = await res.text();

const parser = new XMLParser({
  ignoreAttributes: false
});

const data = parser.parse(xml);

// Always normalize to array
let entries = data.feed.entry || [];
if (!Array.isArray(entries)) {
  entries = [entries];
}

// Ensure Eleventy global data directory
fs.mkdirSync("_data", { recursive: true });

// Ensure posts directory
fs.mkdirSync("posts", { recursive: true });

const posts = [];

entries.forEach((entry, i) => {
  const html = entry.content?.["#text"];
  if (!html) return;

  const title = entry.title?.["#text"] || `Post ${i + 1}`;
  const published = entry.published || new Date().toISOString();

  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `post-${i + 1}`;

  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>

${html}

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);

  posts.push({
    title,
    slug,
    url: `/reviewlab-static/posts/${slug}/`,
    published
  });
});

// 🔑 THIS IS WHAT ELEVENTY NEEDS
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
