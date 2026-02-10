import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import { generateOG, upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

/* CLEAN BUILD */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});
fs.rmSync("author",{recursive:true,force:true});
fs.rmSync("topics",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("author",{recursive:true});
fs.mkdirSync("topics",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("comparisons",{recursive:true});

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

function extractCategories(text){
const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
const freq={};
words.forEach(w=>freq[w]=(freq[w]||0)+1);

return Object.entries(freq)
.sort((a,b)=>b[1]-a[1])
.slice(0,3)
.map(e=>e[0]);
}

const posts=[];

/* BUILD POSTS DATA */

for(const entry of entries){

const rawHtml = entry.content?.["#text"];
if(!rawHtml) continue;

const title = entry.title["#text"];

const slug = title
.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-|-$/g,"");

const url = `${SITE_URL}/posts/${slug}/`;

const textOnly = rawHtml.replace(/<[^>]+>/g,"");

const readTime = Math.max(1,
Math.ceil(textOnly.split(/\s+/).length / 200)
);

const categories = extractCategories(textOnly);
const primaryCategory = categories[0] || "review";

posts.push({
title,
slug,
html:rawHtml,
url,
readTime,
date:entry.published,
category:primaryCategory
});
}

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* WRITE POSTS */

for(const post of posts){

fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

const page = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${post.title}</title>
<link rel="canonical" href="${post.url}">
</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<nav>
<a href="${SITE_URL}">Home</a> →
<a href="${SITE_URL}/topics/${post.category}.html">${post.category}</a>
</nav>

<h1>${post.title}</h1>

<p style="opacity:.7;">
By <a href="${SITE_URL}/author/">Justin Gerald</a> • ${post.readTime} min read
</p>

${post.html}

</body>
</html>
`;

fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* =============================
GENERATE TOPIC PAGES (FIX 404)
============================= */

const topicMap = {};

posts.forEach(post=>{
if(!topicMap[post.category]) topicMap[post.category]=[];
topicMap[post.category].push(post);
});

for(const topic in topicMap){

const topicPosts = topicMap[topic]
.map(p=>`
<li style="margin-bottom:18px;">
<a href="${p.url}" style="font-weight:600;font-size:18px;">
${p.title}
</a>
<div style="opacity:.6;font-size:14px;">
${p.readTime} min read
</div>
</li>
`).join("");

const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${topic} Reviews | ReviewLab</title>
<link rel="canonical" href="${SITE_URL}/topics/${topic}.html">
</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">

<h1 style="font-size:42px;margin-bottom:10px;">
${topic.charAt(0).toUpperCase()+topic.slice(1)} Reviews
</h1>

<p style="opacity:.7;margin-bottom:40px;">
Expert analysis, comparisons, and deep research on the best ${topic} tools.
</p>

<ul style="list-style:none;padding:0;">
${topicPosts}
</ul>

</body>
</html>
`;

fs.writeFileSync(`topics/${topic}.html`,html);
}

/* =============================
AUTHOR PAGE (UPGRADED)
============================= */

const authorPosts = posts.map(p=>`
<li style="margin-bottom:20px;">
<a href="${p.url}" style="font-size:20px;font-weight:600;">
${p.title}
</a>
<div style="opacity:.6;">
${p.readTime} min read
</div>
</li>
`).join("");

const authorHTML = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Justin Gerald — Product Research Analyst</title>
<link rel="canonical" href="${SITE_URL}/author/">
</head>

<body style="max-width:820px;margin:auto;font-family:system-ui;padding:40px;line-height:1.8;">

<h1 style="font-size:46px;margin-bottom:0;">
Justin Gerald
</h1>

<p style="font-size:20px;opacity:.7;margin-top:6px;">
Senior Product Research Analyst • ReviewLab
</p>

<hr style="margin:30px 0;">

<p>
Justin Gerald specializes in deep product analysis, software testing,
and unbiased buyer guidance. Every review published on ReviewLab follows
strict research methodology focused on real-world performance,
feature validation, and long-term value.
</p>

<p>
His work helps readers avoid poor products and confidently invest in
tools that deliver measurable results.
</p>

<h2 style="margin-top:50px;">
Published Reviews
</h2>

<ul style="list-style:none;padding:0;">
${authorPosts}
</ul>

</body>
</html>
`;

fs.writeFileSync("author/index.html",authorHTML);

/* SAVE JSON */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ BUILD COMPLETE — TOPICS + AUTHOR FIXED");
