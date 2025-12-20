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

fs.rmSync("posts", { recursive: true, force: true });
fs.mkdirSync("posts", { recursive: true });

entries.forEach((entry, i) => {
  const rawHtml = entry.content?.["#text"];
  if (!rawHtml) return;

  const title =
    entry.title?.["#text"]?.split("|")[0]?.trim() ||
    `Review ${i + 1}`;

  const date = entry.published || entry.updated;

  const imageMatch = rawHtml.match(/<img[^>]+src="([^">]+)"/i);
  const ogImage = imageMatch ? imageMatch[1] : "";

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const page = `---
title: "${title}"
date: ${date}
description: "${title} – Honest Product Review Lab"
ogImage: "${ogImage}"
---

${rawHtml}
`;

  fs.writeFileSync(`${dir}/index.html`, page);
});
