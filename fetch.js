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

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});
fs.rmSync("author",{recursive:true,force:true});

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

const rawHtml = entry.content?.["#text"];
if(!rawHtml) continue;

const title = entry.title["#text"];

const slug = title
.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-|-$/g,"");

const url = `${SITE_URL}/posts/${slug}/`;

const description = rawHtml.replace(/<[^>]+>/g," ").slice(0,155);

let ogImages = await getYouTubeImages(rawHtml,slug);
if(!ogImages) ogImages=[CTA];
if(!ogImages) ogImages=[DEFAULT];

const primaryOG = ogImages[0];
const thumb = ogImages.find(img=>img.includes("hqdefault")) || primaryOG;

const textOnly = rawHtml.replace(/<[^>]+>/g,"");

const readTime = Math.max(1,
Math.ceil(textOnly.split(/\s+/).length / 200)
);

const categories = extractCategories(textOnly);
const primaryCategory = categories[0] || "reviews";

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
category:primaryCategory
});
}

/* APPLY INTERNAL LINKS */

posts.forEach(p=>{
p.html = injectInternalLinks(p.html,posts,p.slug);
});

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* BUILD POSTS */

for(const post of posts){

fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

const page = `
<!doctype html>
<html>
<head>
<title>${post.title}</title>
<link rel="canonical" href="${post.url}">
</head>
<body>
<nav>
<a href="${SITE_URL}">Home</a> › 
<a href="${SITE_URL}/topics/${post.category}.html">${post.category}</a>
</nav>

<h1>${post.title}</h1>

<p>
By <a href="${SITE_URL}/author/">Justin Gerald</a>
</p>

${post.html}

</body>
</html>`;

fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* =========================
FIX #1 — BUILD TOPIC PAGES
========================= */

const topicMap={};

for(const post of posts){
if(!topicMap[post.category]){
topicMap[post.category]=[];
}
topicMap[post.category].push(post);
}

for(const topic in topicMap){

const list = topicMap[topic]
.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
.join("");

const html = `
<!doctype html>
<html>
<head>
<title>${topic}</title>
<link rel="canonical" href="${SITE_URL}/topics/${topic}.html">
</head>
<body>

<h1>${topic}</h1>

<ul>
${list}
</ul>

</body>
</html>
`;

fs.writeFileSync(`topics/${topic}.html`,html);
}

/* =========================
FIX #2 — BUILD AUTHOR PAGE
========================= */

const authorPosts = posts
.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
.join("");

const authorHTML = `
<!doctype html>
<html>
<head>
<title>Justin Gerald</title>
<link rel="canonical" href="${SITE_URL}/author/">
</head>
<body>

<h1>Justin Gerald</h1>

<p>Product reviews and comparisons.</p>

<ul>
${authorPosts}
</ul>

</body>
</html>
`;

fs.writeFileSync("author/index.html",authorHTML);

/* SAVE JSON */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ DEPLOY SAFE — TOPICS + AUTHOR GENERATED");
