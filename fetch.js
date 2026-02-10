import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import { generateOG, upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const CTA = `${SITE_URL}/og-cta-tested.jpg`;
const DEFAULT = `${SITE_URL}/og-default.jpg`;

/* CLEAN BUILD */

["posts","_data","author","topics","comparisons"]
.forEach(dir=>fs.rmSync(dir,{recursive:true,force:true}));

["posts","_data","og-images","author","topics","comparisons"]
.forEach(dir=>fs.mkdirSync(dir,{recursive:true}));

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
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

for(const img of candidates){
try{
const res = await fetch(img,{method:"HEAD"});
if(res.ok) return [img];
}catch{}
}

const upscaled = await upscaleToOG(
`https://img.youtube.com/vi/${id}/hqdefault.jpg`,
slug
);

if(upscaled) return [`${SITE_URL}/og-images/${slug}.jpg`];

return [DEFAULT];
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

const candidates = posts.filter(p=>p.slug!==currentSlug).slice(0,5);
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

const rawHtml = entry.content?.["#text"];
if(!rawHtml) continue;

const title = entry.title["#text"];

const slug = title
.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-|-$/g,"");

const hash = crypto.createHash("md5").update(slug).digest("hex").slice(0,8);

const url = `${SITE_URL}/posts/${slug}/`;

const description = rawHtml.replace(/<[^>]+>/g," ").slice(0,155);

let ogImages = await getYouTubeImages(rawHtml,slug);

const primaryOG = ogImages[0];
const thumb = primaryOG;

const textOnly = rawHtml.replace(/<[^>]+>/g,"");

const readTime = Math.max(1,
Math.ceil(textOnly.split(/\s+/).length / 200)
);

const categories = extractCategories(textOnly);
const primaryCategory = categories[0] || "reviews";

/* SCHEMA */

const schemas = JSON.stringify([{
"@context":"https://schema.org",
"@type":"Article",
"headline":title,
"image":ogImages,
"datePublished":entry.published,
"dateModified":new Date().toISOString(),
"author":{
"@type":"Person",
"name":"Justin Gerald",
"url":`${SITE_URL}/author/`
},
"description":description
}]);

posts.push({
title,
slug,
hash,
html:rawHtml,
url,
description,
og:primaryOG,
thumb,
readTime,
date:entry.published,
category:primaryCategory,
schemas
});
}

/* SAFE LINK PASS */

posts.forEach(p=>{
p.html = injectInternalLinks(p.html,posts,p.slug);
});

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* BUILD POSTS */

for(const post of posts){

fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

const related = posts
.filter(p=>p.slug!==post.slug)
.slice(0,4)
.map(p=>`
<li>
<a href="${p.url}" style="text-decoration:none;color:inherit;">
<img src="${p.thumb}" width="110" style="border-radius:10px;">
<span style="font-weight:600;">${p.title}</span>
</a>
</li>`).join("");

const page = `<!doctype html>
<html lang="en">
<head>

<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${post.title}</title>

<link rel="canonical" href="${post.url}">
<meta name="description" content="${post.description}">
<meta property="og:image" content="${post.og}">

<script type="application/ld+json">
${post.schemas}
</script>

</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<nav style="font-size:14px;margin-bottom:20px;">
<a href="${SITE_URL}">Home</a> › 
<a href="${SITE_URL}/topics/${post.category}.html">${post.category}</a>
</nav>

<h1>${post.title}</h1>

<p style="opacity:.7;font-size:14px;">
By <a href="${SITE_URL}/author/">Justin Gerald</a> • ${post.readTime} min read
</p>

${post.html}

<hr>

<h3>Related Reviews</h3>
<ul style="list-style:none;padding:0;">
${related}
</ul>

</body>
</html>`;

fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* AUTHOR PAGE — FIXES 404 */

const authorHTML = `
<!doctype html>
<html>
<head>
<title>About the Author</title>
<link rel="canonical" href="${SITE_URL}/author/">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>Justin Gerald</h1>
<p>Founder of ReviewLab. Publishes data-driven product reviews and comparisons to help buyers make confident decisions.</p>
</body>
</html>
`;

fs.writeFileSync("author/index.html",authorHTML);

/* TOPIC PAGES — FIXES BREADCRUMB 404 */

const topics = {};

posts.forEach(p=>{
if(!topics[p.category]) topics[p.category]=[];
topics[p.category].push(p);
});

Object.entries(topics).forEach(([topic,list])=>{

const html = `
<!doctype html>
<html>
<head>
<title>${topic} Reviews</title>
<link rel="canonical" href="${SITE_URL}/topics/${topic}.html">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>${topic} Reviews</h1>

<ul>
${list.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`).join("")}
</ul>

</body>
</html>
`;

fs.writeFileSync(`topics/${topic}.html`,html);
});

/* COMPARISONS */

const comparisonUrls=[];

for(let i=0;i<posts.length;i++){
for(let j=i+1;j<posts.length;j++){

const A=posts[i];
const B=posts[j];

const slug=`${A.slug}-vs-${B.slug}`;
const url=`${SITE_URL}/comparisons/${slug}.html`;

const html=`
<!doctype html>
<html>
<head>
<title>${A.title} vs ${B.title}</title>
<link rel="canonical" href="${url}">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>${A.title} vs ${B.title}</h1>

<p><a href="${A.url}">${A.title}</a> compared with 
<a href="${B.url}">${B.title}</a>.</p>

</body>
</html>
`;

fs.writeFileSync(`comparisons/${slug}.html`,html);
comparisonUrls.push(url);

}
}

/* SAVE JSON — prevents homepage blank */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

/* SITEMAP */

const urls = [
...posts.map(p=>p.url),
...comparisonUrls
].map(u=>`
<url>
<loc>${u}</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</url>`).join("");

fs.writeFileSync("sitemap.xml",`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>${SITE_URL}</loc>
</url>
${urls}
</urlset>`);

console.log("✅ MASTER BUILD STABLE — ALL 404s ELIMINATED");
