import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

/* ================= CONFIG ================= */

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

/* ================= CLEAN BUILD ================= */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

/* ================= FETCH BLOGGER ================= */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

/* ================= IMAGE EXTRACTOR (ELITE VERSION) ================= */

function extractBestImage(html){

 // YouTube thumbnail wins instantly
 const yt = html.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
 if(yt){
   return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
 }

 // Grab blogger image
 const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);

 if(!img) return null;

 let url = img[1];

 /**
  CRITICAL FIX:
  Convert blogger resized images → FULL resolution
  Example:
  /s320/  -> /s1600/
 */
 url = url.replace(/\/s\d+\//,"/s1600/");

 return url;
}

/* ================= BUILD MASTER LIST ================= */

const posts = [];

for(const entry of entries){

 const html = entry.content?.["#text"] || "";
 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 let ogImage = extractBestImage(html);

 /**
  If NO thumbnail exists →
  generate elite OG automatically
 */
 if(!ogImage){

   ogImage = await generateOG(slug,title);

   // Safety fallback
   if(!ogImage){
     ogImage = FALLBACK_IMAGE;
   }
 }

 posts.push({
   title,
   slug,
   html,
   date:entry.published,
   url:`${SITE_URL}/posts/${slug}/`,
   og:ogImage
 });
}

/* ================= CREATE AUTHORITY PAGES ================= */

for(const post of posts){

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

 const related = posts
   .filter(p=>p.slug!==post.slug)
   .slice(0,4)
   .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
   .join("");

 const description =
 post.html.replace(/<[^>]+>/g," ").slice(0,155);

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
<meta property="og:url" content="${post.url}">
<meta property="og:site_name" content="ReviewLab">

<meta name="twitter:card" content="summary_large_image">
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

/* ================= DATA ================= */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ ELITE AUTHORITY ENGINE ACTIVE");
