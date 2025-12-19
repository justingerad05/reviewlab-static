import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL = "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const res = await fetch(FEED_URL);
const xml = await res.text();

const parser = new XMLParser({
  ignoreAttributes: false
});

const data = parser.parse(xml);
const entries = data.feed.entry || [];

fs.mkdirSync("posts", { recursive: true });

entries.forEach((entry, index) => {
  const html = entry.content?.["#text"] || "";
  if (!html) return;

  const slug = `post-${index + 1}`;
  const dir = `posts/${slug}`;

  fs.mkdirSync(dir, { recursive: true });

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ReviewLab Post ${index + 1}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>

${html}

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
});
