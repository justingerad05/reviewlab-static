import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

/* CONFIG */

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL="https://justingerad05.github.io/reviewlab-static";

/* SAFE BUILD DIR */

const BUILD_DIR="posts";

if(fs.existsSync(BUILD_DIR)){
fs.rmSync(BUILD_DIR,{recursive:true,force:true});
}

fs.mkdirSync(BUILD_DIR,{recursive:true});

/* FETCH */

const parser=new XMLParser({ignoreAttributes:false});
const res=await fetch(FEED_URL);
const xml=await res.text();
const data=parser.parse(xml);

let entries=data.feed?.entry||[];
if(!Array.isArray(entries)) entries=[entries];

const strip=html=>html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

const slugify=str=>
str.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-+|-+$/g,"")
.slice(0,70);

for(const entry of entries){

const html=entry.content?.["#text"];
if(!html) continue;

const title=entry.title?.["#text"]||"Untitled Review";
const slug=slugify(title);
const url=`${SITE_URL}/posts/${slug}/`;

await generateOG(slug,title);

const ogImage=`${SITE_URL}/og-images/${slug}.png`;
const description=strip(html).slice(0,155);

const dir=`${BUILD_DIR}/${slug}`;
fs.mkdirSync(dir,{recursive:true});

const page = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${new Date(entry.published || Date.now()).toISOString()}"
layout: null
permalink: /posts/${slug}/index.html
---

<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">
<title>${title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:image" content="${ogImage}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">

<meta name="twitter:card" content="summary_large_image">

<style>

body{
max-width:760px;
margin:auto;
padding:40px 20px;
font-family:Inter,system-ui;
background:#020617;
color:#e5e7eb;
line-height:1.75;
}

.hero{
width:100%;
border-radius:14px;
margin-bottom:30px;
}

</style>

</head>
<body>

<img class="hero" src="${ogImage}" alt="${title}">

<h1>${title}</h1>

${html}

</body>
</html>`;

fs.writeFileSync(`${dir}/index.html`,page);
}

console.log("✅ POSTS GENERATED — ELEVENTY WILL SEE THEM");
