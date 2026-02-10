import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import { generateOG, upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const AUTHOR_NAME = "Justin Gerald";
const AUTHOR_PATH = `${SITE_URL}/author/index.html`;

const CTA = `${SITE_URL}/og-cta-tested.jpg`;
const DEFAULT = `${SITE_URL}/og-default.jpg`;

/* CLEAN BUILD */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});
fs.rmSync("author",{recursive:true,force:true});
fs.rmSync("topics",{recursive:true,force:true});
fs.rmSync("comparisons",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("author",{recursive:true});
fs.mkdirSync("topics",{recursive:true});
fs.mkdirSync("comparisons",{recursive:true});

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data?.feed?.entry || [];
if(!Array.isArray(entries)) entries=[entries];

/* YOUTUBE */

async function getYouTubeImages(html,slug){

const match = html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
if(!match) return null;

const id = match[1];

const candidates = [
`https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
`https://img.youtube.com/vi/${id}/sddefault.jpg`,
`https://img.youtube.com/vi/${id}/hqdefault.jpg`
];

const valid=[];

for(const img of candidates){
try{
const res = await fetch(img,{method:"HEAD"});
if(res.ok) valid.push(img);
}catch{}
}

if(valid.length===0){
const upscaled = await upscaleToOG(
`https://img.youtube.com/vi/${id}/hqdefault.jpg`,
slug
);
if(upscaled) return [`${SITE_URL}/og-images/${slug}.jpg`];
return null;
}

return valid;
}

/* CATEGORY */

function extractCategories(text){
const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
const freq={};
words.forEach(w=>freq[w]=(freq[w]||0)+1);

return Object.entries(freq)
.sort((a,b)=>b[1]-a[1])
.slice(0,3)
.map(e=>e[0]);
}

/* INTERNAL LINKS */

function injectInternalLinks(html, posts, currentSlug){

const candidates = posts
.filter(p=>p.slug!==currentSlug)
.slice(0,5);

let enriched = html;

candidates.forEach(p=>{
const keyword = p.title.split(" ")[0];
const regex = new RegExp(`\\b(${keyword})\\b`,"i");

if(regex.test(enriched)){
enriched = enriched.replace(regex,
`<a href="${p.url}" style="font-weight:600;">$1</a>`
);
}
});

return enriched;
}

const posts=[];

/* BUILD DATA */

for(const entry of entries){

const rawHtml = entry?.content?.["#text"];
if(!rawHtml) continue;

const title = entry.title["#text"];

const slug = title
.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-|-$/g,"");

const url = `${SITE_URL}/posts/${slug}/`;

const description = rawHtml
.replace(/<[^>]+>/g," ")
.replace(/\s+/g," ")
.trim()
.slice(0,155);

let ogImages = await getYouTubeImages(rawHtml,slug);
if(!ogImages || ogImages.length===0) ogImages=[CTA || DEFAULT];

const primaryOG = ogImages[0];
const thumb = ogImages.find(img=>img.includes("hqdefault")) || primaryOG;

const textOnly = rawHtml.replace(/<[^>]+>/g,"");

const readTime = Math.max(1,
Math.ceil(textOnly.split(/\s+/).length / 200)
);

const categories = extractCategories(textOnly);
const primaryCategory = categories[0] || "reviews";

/* SCHEMAS */

const reviewSchema = {
"@context":"https://schema.org",
"@type":"Review",
"itemReviewed":{
"@type":"Product",
"name":title,
"image":primaryOG
},
"author":{
"@type":"Person",
"name":AUTHOR_NAME,
"url":AUTHOR_PATH
},
"reviewRating":{
"@type":"Rating",
"ratingValue":"4.7",
"bestRating":"5"
},
"publisher":{
"@type":"Organization",
"name":"ReviewLab"
}
};

const articleSchema = {
"@context":"https://schema.org",
"@type":"Article",
"headline":title,
"image":ogImages,
"datePublished":entry.published,
"dateModified": new Date().toISOString(),
"author":{
"@type":"Person",
"name":AUTHOR_NAME,
"url":AUTHOR_PATH
},
"publisher":{
"@type":"Organization",
"name":"ReviewLab",
"logo":{
"@type":"ImageObject",
"url":CTA
}
},
"description":description,
"keywords":categories.join(", "),
"mainEntityOfPage":{
"@type":"WebPage",
"@id":url
}
};

const breadcrumbSchema = {
"@context":"https://schema.org",
"@type":"BreadcrumbList",
"itemListElement":[
{
"@type":"ListItem",
"position":1,
"name":"Home",
"item":SITE_URL
},
{
"@type":"ListItem",
"position":2,
"name":primaryCategory,
"item":`${SITE_URL}/topics/${primaryCategory}.html`
},
{
"@type":"ListItem",
"position":3,
"name":title,
"item":url
}
]
};

posts.push({
title,
slug,
html:rawHtml,
url,
description,
og:primaryOG,
thumb,
readTime,
date:entry.published,
category:primaryCategory,
schemas:JSON.stringify([
articleSchema,
breadcrumbSchema,
reviewSchema
])
});
}

/* APPLY INTERNAL LINKS */

posts.forEach(p=>{
p.html = injectInternalLinks(p.html,posts,p.slug);
});

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* BUILD AUTHOR PAGE — FIXES 404 */

const authorHTML = `
<!doctype html>
<html>
<head>
<title>${AUTHOR_NAME}</title>
<link rel="canonical" href="${AUTHOR_PATH}">
<meta name="robots" content="index,follow">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>${AUTHOR_NAME}</h1>
<p>Founder of ReviewLab. Publishing data-driven product reviews and comparisons.</p>

<h2>Latest Reviews</h2>
<ul>
${posts.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`).join("")}
</ul>

</body>
</html>
`;

fs.writeFileSync("author/index.html",authorHTML);

/* BUILD POSTS */

for(const post of posts){

fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${post.title}</title>
<link rel="canonical" href="${post.url}">
<meta name="description" content="${post.description}">

<script type="application/ld+json">
${post.schemas}
</script>

</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<h1>${post.title}</h1>

<p style="opacity:.7;font-size:14px;">
By <a href="${AUTHOR_PATH}">${AUTHOR_NAME}</a> • ${post.readTime} min read
</p>

${post.html}

</body>
</html>`;

fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* SAVE JSON */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

/* SITEMAP */

const urls = [
SITE_URL,
AUTHOR_PATH,
...posts.map(p=>p.url)
].map(u=>`
<url>
<loc>${u}</loc>
<lastmod>${new Date().toISOString()}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`).join("");

fs.writeFileSync("sitemap.xml",`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);

console.log("✅ BUILD COMPLETE — AUTHOR + SCHEMA 404 FIXED");
