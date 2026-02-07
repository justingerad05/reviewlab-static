import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

/* CLEAN BUILD */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});
fs.rmSync("og-images",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

const posts = [];

/* BUILD POSTS */

for(const entry of entries){

 const html = entry.content?.["#text"] || "";
 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 /* FORCE LOCAL OG IMAGE */
 const ogImage = await generateOG(slug,title);

 posts.push({
   title,
   slug,
   html,
   date:entry.published,
   url:`${SITE_URL}/posts/${slug}/`,
   og:ogImage
 });
}

/* CREATE PAGES */

for(const post of posts){

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

 const related = posts
   .filter(p=>p.slug!==post.slug)
   .slice(0,4)
   .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
   .join("");

 const description =
 post.html
   .replace(/<[^>]+>/g," ")
   .replace(/\s+/g," ")
   .trim()
   .slice(0,155);

 const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>${post.title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${post.url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${post.og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${post.url}">
<meta property="og:site_name" content="ReviewLab">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${post.title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${post.og}">

</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<a href="${SITE_URL}" style="text-decoration:none;font-weight:700;">
← Back To Homepage
</a>

<h1>${post.title}</h1>

${post.html}

<hr>

<h2>Related Reviews</h2>
<ul>${related}</ul>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ STABLE BUILD COMPLETE — OG FIXED");
