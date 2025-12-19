import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const res = await fetch(FEED_URL);
const xml = await res.text();

const parser = new XMLParser({ ignoreAttributes: false });
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

// reset posts
fs.rmSync("posts", { recursive: true, force: true });
fs.mkdirSync("posts", { recursive: true });

const posts = [];

function extractTitle(html) {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : null;
}

function extractDescription(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  return text.substring(0, 160);
}

entries.forEach((entry, i) => {
  const html = entry.content?.["#text"];
  if (!html) return;

  let title =
    entry.title?.["#text"]?.trim() ||
    extractTitle(html) ||
    "Untitled Review";

  const published =
    entry.published || entry.updated || new Date().toISOString();

  const description = extractDescription(html);

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="https://justingerad05.github.io/reviewlab-static/posts/${slug}/">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "datePublished": "${published}",
    "author": {
      "@type": "Organization",
      "name": "ReviewLab"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://justingerad05.github.io/reviewlab-static/posts/${slug}/"
    }
  }
  </script>
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

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
