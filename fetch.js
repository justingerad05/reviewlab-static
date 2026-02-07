import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

/*
IMPORTANT:
Use JPG fallback — not PNG.
GitHub serves JPG more reliably.
*/
const FALLBACK_IMAGE =
`${SITE_URL}/og-default.jpg`;

/* ================= CLEAN BUILD ================= */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

/* ================= FETCH ================= */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

/* ================= ELITE IMAGE EXTRACTOR ================= */

function extractBestImage(html){

 // ✅ YouTube = highest authority
 const yt = html.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);

 if(yt){
   return `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg`;
 }

 // ✅ Blogger image
 const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);

 if(!img) return FALLBACK_IMAGE;

 let url = img[1];

 /*
 CRITICAL FIX:
 Convert resized blogger images → FULL SIZE
 This prevents Facebook partial-content errors.
 */
 url = url.replace(/\/s\d+\//,"/s1600/");

 return url;
}

/* ================= BUILD POSTS ================= */

const posts = [];

for(const entry of entries){

 const html = entry.content?.["#text"] || "";
 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 const ogImage = extractBestImage(html);

 posts.push({
   title,
   slug,
   html,
   date:entry.published,
   url:`${SITE_URL}/posts/${slug}/`,
   og:ogImage
 });
}

/* ================= CREATE AUTHORITY POSTS ================= */

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
<body style="max-width:900px;margin:auto;font-family:Arial;padding:40px;line-height:1.7">

<a href="${SITE_URL}" 
style="display:inline-block;margin-bottom:40px;
font-weight:bold;text-decoration:none;font-size:18px;">
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

/* ================= AUTHORITY HOMEPAGE ================= */

const homepagePosts = posts
.sort((a,b)=> new Date(b.date) - new Date(a.date))
.map(p=>`
<article style="margin-bottom:50px">
<a href="${p.url}" style="text-decoration:none;color:black">
<img src="${p.og}" 
style="width:100%;border-radius:12px;margin-bottom:15px">

<h2>${p.title}</h2>
</a>
</article>
`).join("");

const homepage = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>ReviewLab — Honest AI Tool Reviews</title>

<meta name="description" 
content="Real AI tool reviews. No hype. No fluff. Just tested results.">

<meta property="og:image" content="${FALLBACK_IMAGE}">
<meta name="twitter:card" content="summary_large_image">

</head>
<body style="max-width:1000px;margin:auto;font-family:Arial;padding:40px">

<h1 style="font-size:42px">ReviewLab</h1>
<p style="font-size:20px;margin-bottom:60px">
Honest reviews. Real tests. Trusted verdicts.
</p>

${homepagePosts}

</body>
</html>`;

fs.writeFileSync("index.html",homepage);

/* ================= DATA ================= */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ AUTHORITY SITE ENGINE DEPLOYED");
