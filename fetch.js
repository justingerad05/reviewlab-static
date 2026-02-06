import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const SITE_NAME = "ReviewLab";
const AUTHOR_NAME = "ReviewLab Editorial";

const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

/* ================= INIT ================= */

fs.rmSync("posts", { recursive: true, force: true });
fs.rmSync("tags", { recursive: true, force: true });
fs.rmSync("_data", { recursive: true, force: true });

fs.mkdirSync("posts", { recursive: true });
fs.mkdirSync("tags", { recursive: true });
fs.mkdirSync("og-images", { recursive: true });
fs.mkdirSync("_data", { recursive: true });

/* ================= FETCH ================= */

const parser = new XMLParser({ ignoreAttributes: false });
const res = await fetch(FEED_URL);
const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

const posts = [];
const tagMap = {};

/* ================= UTILITIES ================= */

const strip = html =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const slugify = str =>
  str.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

const readingTime = text =>
  Math.max(1, Math.ceil(strip(text).split(" ").length / 200));

/* ================= PASS 1 ================= */

for (const entry of entries) {

  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = entry.title?.["#text"]?.trim() || "Untitled Review";
  const slug = slugify(title);
  const url = `${SITE_URL}/posts/${slug}/`;

  const tags = ["ai tools"];

  tags.forEach(tag => {
    const t = slugify(tag);
    if (!tagMap[t]) tagMap[t] = [];
    tagMap[t].push({ title, url });
  });

  posts.push({
    title,
    slug,
    url,
    html,
    tags,
    date: entry.published || new Date().toISOString(),
    read: readingTime(html)
  });
}

/* ================= RELATED (RELEVANCE BOOST) ================= */

const related = slug =>
  posts
    .filter(p => p.slug !== slug)
    .sort(() => 0.5 - Math.random())
    .slice(0, 4)
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

/* ================= BUILD POSTS ================= */

for (const post of posts) {

  const { title, slug, html, url, date, read } = post;

  const description = strip(html).slice(0, 155);

  try {
    await generateOG(slug, title);
  } catch {
    // fallback so OG NEVER breaks again
    fs.copyFileSync("og-default.jpg", `og-images/${slug}.png`);
  }

  const ogImage = `${SITE_URL}/og-images/${slug}.png`;

  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    image: [ogImage],
    author: { "@type": "Organization", name: AUTHOR_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: DEFAULT_IMAGE }
    },
    datePublished: date,
    mainEntityOfPage: url
  };

  const breadcrumb = {
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    itemListElement:[
      { "@type":"ListItem", position:1, name:"Home", item:SITE_URL },
      { "@type":"ListItem", position:2, name:title, item:url }
    ]
  };

  const page = `<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<title>${title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

<script type="application/ld+json">
${JSON.stringify(breadcrumb)}
</script>

</head>
<body>

<h1>${title}</h1>
<p><strong>${read} min read</strong></p>

${html}

<section>
<h2>Related Reviews</h2>
<ul>${related(slug)}</ul>
</section>

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
}

/* ================= TAGS ================= */

for (const tag in tagMap) {

  const list = tagMap[tag]
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

  fs.mkdirSync(`tags/${tag}`, { recursive: true });

  fs.writeFileSync(`tags/${tag}/index.html`, `
<!DOCTYPE html>
<html>
<head>
<title>${tag} | ${SITE_NAME}</title>
<link rel="canonical" href="${SITE_URL}/tags/${tag}/">
</head>
<body>

<h1>${tag}</h1>
<ul>${list}</ul>

</body>
</html>`);
}

/* ================= ELEVENTY DATA ================= */

fs.writeFileSync(
  "_data/posts.json",
  JSON.stringify(
    posts.map(p => ({
      title: p.title,
      url: p.url,
      date: p.date
    })),
    null,
    2
  )
);

console.log("✅ AUTHORITY ENGINE v20 DEPLOYED — STABLE");
