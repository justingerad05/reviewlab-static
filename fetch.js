import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

/* CONFIG */
const FEED_URL = "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";
const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const POSTS_DIR = "posts";

/* SAFE BUILD DIR */
if (fs.existsSync(POSTS_DIR)) fs.rmSync(POSTS_DIR, { recursive: true, force: true });
fs.mkdirSync(POSTS_DIR, { recursive: true });

/* FETCH FEED */
const parser = new XMLParser({ ignoreAttributes: false });
const res = await fetch(FEED_URL);
const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

const strip = html => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const slugify = str => str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

/* BUILD POSTS */
for (const entry of entries) {
  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = entry.title?.["#text"] || "Untitled Review";
  const slug = slugify(title);
  const date = entry.published || new Date().toISOString();
  const description = strip(html).slice(0, 155);

  // Generate OG image
  await generateOG(slug, title);
  const ogImage = `${SITE_URL}/og-images/${slug}.png`;

  const dir = `${POSTS_DIR}/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  // Write markdown with frontmatter
  const content = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${date}"
layout: null
---

<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:image" content="${ogImage}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${SITE_URL}/posts/${slug}/">
<meta name="twitter:card" content="summary_large_image">
</head>
<body>

<h1>${title}</h1>
${html}

</body>
</html>
`;

  fs.writeFileSync(`${dir}/index.md`, content);
}

console.log("✅ POSTS GENERATED — ELEVENTY WILL SEE THEM");
