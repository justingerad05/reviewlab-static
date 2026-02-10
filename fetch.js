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

/* FORCE GITHUB STATIC ROUTING */
fs.writeFileSync(".nojekyll","");

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

/* INTERNAL LINK GRAPH */

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

/* SCHEMAS — UNTOUCHED */

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
"name":"Justin Gerald",
"url":`${SITE_URL}/author/`
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
"name":"Justin Gerald",
"url":`${SITE_URL}/author/`
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
{"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},
{"@type":"ListItem","position":2,"name":primaryCategory,"item":`${SITE_URL}/topics/${primaryCategory}.html`},
{"@type":"ListItem","position":3,"name":title,"item":url}
]
};

const organizationSchema = {
"@context":"https://schema.org",
"@type":"Organization",
"name":"ReviewLab",
"url":SITE_URL,
"logo":CTA
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
reviewSchema,
organizationSchema
])
});
}

/* APPLY INTERNAL LINKS */

posts.forEach(p=>{
p.html = injectInternalLinks(p.html,posts,p.slug);
});

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* 🔥 SURGICAL FIX — BUILD TOPIC PAGES */

const topicMap={};

posts.forEach(p=>{
if(!topicMap[p.category]) topicMap[p.category]=[];
topicMap[p.category].push(p);
});

for(const topic in topicMap){

const list = topicMap[topic].map(p=>`
<li>
<a href="${p.url}" style="font-weight:600;">${p.title}</a>
</li>
`).join("");

fs.writeFileSync(`topics/${topic}.html`,`
<!doctype html>
<html>
<head>
<title>${topic} Reviews | ReviewLab</title>
<link rel="canonical" href="${SITE_URL}/topics/${topic}.html">
<meta name="robots" content="index,follow">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>${topic} Reviews</h1>
<ul>${list}</ul>
</body>
</html>
`);
}

/* AUTHOR PAGE — EXISTS NOW */

fs.writeFileSync("author/index.html",`
<!doctype html>
<html>
<head>
<title>Justin Gerald</title>
<link rel="canonical" href="${SITE_URL}/author/">
<meta name="robots" content="index,follow">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>Justin Gerald</h1>
<p>Independent product reviewer specializing in AI tools and digital platforms.</p>
</body>
</html>
`);

/* REST OF YOUR SCRIPT CONTINUES UNCHANGED */
