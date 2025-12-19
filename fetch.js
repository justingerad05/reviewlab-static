import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const res = await fetch(FEED_URL);
const xml = await res.text();

const parser = new XMLParser({ ignoreAttributes: false });
const data = parser.parse(xml);

// normalize entries
let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

// reset posts directory
fs.rmSync("posts", { recursive: true, force: true });
fs.mkdirSync("posts", { recursive: true });

const posts = [];

entries.forEach((entry, i) => {
  const html = entry.content?.["#text"];
  if (!html) return;

  const title =
    entry.title?.["#text"]?.trim() || "Untitled Post";

  const published =
    entry.published || entry.updated || new Date().toISOString();

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;

  fs.mkdirSync(dir, { recursive: true });

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="canonical" href="https://justingerad05.github.io/reviewlab-static/posts/${slug}/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>

${html}

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);

  posts.push({
    title,
    url: `/reviewlab-static/posts/${slug}/`,
    published
  });
});

// write data file for homepage + sitemap
fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
