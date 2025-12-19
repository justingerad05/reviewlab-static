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

// Normalize entries
let entries = data.feed.entry || [];
if (!Array.isArray(entries)) entries = [entries];

// Required directories
fs.mkdirSync("_data", { recursive: true });
fs.mkdirSync("posts", { recursive: true });

const posts = [];

entries.forEach(entry => {
  const html = entry.content?.["#text"];
  if (!html) return;

  const title = entry.title?.["#text"] || "Untitled Post";
  const published = entry.published || new Date().toISOString();

  // 🔐 Blogger-stable ID (never changes)
  const rawId = entry.id;
  const id = rawId.split("post-").pop();

  const slug = `blogger-${id}`;
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

// Global Eleventy data
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
