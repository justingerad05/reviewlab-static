import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG, upscaleToOG } from "./generate-og.js";

const FEED_URL = "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";
const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

const CTA = `${SITE_URL}/og-cta-tested.jpg`;
const DEFAULT = `${SITE_URL}/og-default.jpg`;

/* CLEAN PREVIOUS BUILDS */
fs.rmSync("posts", { recursive: true, force: true });
fs.rmSync("_data", { recursive: true, force: true });

fs.mkdirSync("posts", { recursive: true });
fs.mkdirSync("_data", { recursive: true });
fs.mkdirSync("og-images", { recursive: true });

/* FETCH POSTS */
const parser = new XMLParser({ ignoreAttributes: false });
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if (!Array.isArray(entries)) entries = [entries];

/* GET YOUTUBE THUMBNAILS */
async function getYouTubeImages(html, slug) {
  const match = html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return null;

  const id = match[1];
  const candidates = [
    `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${id}/sddefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  ];

  const valid = [];
  for (const img of candidates) {
    try {
      const res = await fetch(img, { method: "HEAD" });
      if (res.ok) valid.push(img);
    } catch {}
  }

  if (valid.length === 0) {
    const upscaled = await upscaleToOG(`https://img.youtube.com/vi/${id}/hqdefault.jpg`, slug);
    if (upscaled) return [`${SITE_URL}/og-images/${slug}.jpg`];
    return null;
  }
  return valid;
}

/* EXTRACT KEYWORDS FOR SCHEMA */
function extractCategories(text) {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0]);
}

/* BUILD POSTS ARRAY */
const posts = [];

for (const entry of entries) {
  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = entry.title["#text"];
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const url = `${SITE_URL}/posts/${slug}/`;
  const description = html.replace(/<[^>]+>/g, " ").slice(0, 155);

  let ogImages = await getYouTubeImages(html, slug);
  if (!ogImages) ogImages = [CTA];
  if (!ogImages) ogImages = [DEFAULT];

  const primaryOG = ogImages[0];
  const thumb = ogImages.find(img => img.includes("hqdefault")) || primaryOG;

  const textOnly = html.replace(/<[^>]+>/g, "");
  const readTime = Math.max(1, Math.ceil(textOnly.split(/\s+/).length / 200));
  const categories = extractCategories(textOnly);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "image": ogImages,
    "datePublished": entry.published,
    "author": { "@type": "Person", "name": "Justin Gerald" },
    "publisher": { "@type": "Organization", "name": "ReviewLab", "logo": { "@type": "ImageObject", "url": CTA } },
    "description": description,
    "keywords": categories.join(", "),
    "mainEntityOfPage": { "@type": "WebPage", "@id": url }
  };

  posts.push({ title, slug, html, url, description, og: primaryOG, thumb, readTime, date: entry.published, schema: JSON.stringify(schema), categories });
}

/* SORT POSTS BY DATE */
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

/* BUILD POST PAGES */
for (const post of posts) {
  fs.mkdirSync(`posts/${post.slug}`, { recursive: true });

  const related = posts
    .filter(p => p.slug !== post.slug)
    .slice(0, 4)
    .map(p => `
<li style="margin-bottom:14px;">
<a href="${p.url}" style="display:flex;align-items:center;gap:10px;text-decoration:none;" class="related-link">
<img src="${p.thumb}" data-src="${p.thumb}" width="110" alt="${p.title}" class="related-thumb" style="border-radius:8px;opacity:0;transition:opacity .3s;" />
<span>${p.title} (~${p.readTime} min)</span>
</a>
</li>`).join("");

  const page = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${post.title}</title>
<meta name="description" content="${post.description}">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.description}">
<meta property="og:type" content="article">
<meta property="og:image" content="${post.og}">
<script type="application/ld+json">${post.schema}</script>
<style>
.hover-preview{position:absolute;display:none;max-width:260px;border:2px solid #ccc;z-index:9999;pointer-events:none;transition:opacity .2s;}
.related-thumb.loaded{opacity:1;}
</style>
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">
<a href="${SITE_URL}">← Home</a>
<h1>${post.title}</h1>
${post.html}
<hr>
<h3>Related Reviews</h3>
<ul style="list-style:none;padding:0;">${related}</ul>
<img id="hoverPreview" class="hover-preview"/>
<script>
const hover=document.getElementById("hoverPreview");

// Lazy-load related thumbnails
document.querySelectorAll(".related-thumb").forEach(img=>{
  img.onload=()=>img.classList.add("loaded");
  if(img.complete) img.classList.add("loaded");
});

// Hover & mobile support
document.querySelectorAll(".related-link").forEach(link=>{
  const img = link.querySelector("img");
  if(!img) return;

  let touchTimer=null;

  link.addEventListener("mouseenter",e=>{
    hover.src = img.src;
    hover.style.display="block";
  });
  link.addEventListener("mousemove",e=>{
    hover.style.top=e.pageY+"px";
    hover.style.left=e.pageX+"px";
  });
  link.addEventListener("mouseleave",()=>{
    hover.style.display="none";
    clearTimeout(touchTimer);
  });

  link.addEventListener("touchstart",()=>{
    touchTimer=setTimeout(()=>{
      hover.src=img.src;
      hover.style.display="block";
    },300);
  });
  link.addEventListener("touchend",()=>{
    hover.style.display="none";
    clearTimeout(touchTimer);
    window.location.href = link.href;
  });
});
</script>
</body>
</html>`;

  fs.writeFileSync(`posts/${post.slug}/index.html`, page);
}

/* SAVE POSTS JSON */
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));

console.log("✅ PHASE 23 COMPLETE — RELATED THUMBNAILS, HOVER, MOBILE TAP & AUTHOR FIXED");
