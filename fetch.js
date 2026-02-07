import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG, upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const CTA =
`${SITE_URL}/og-cta-tested.jpg`;

const DEFAULT =
`${SITE_URL}/og-default.jpg`;


/* CLEAN */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});


/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];


/* ===================================================
   PHASE 10 — ELITE YOUTUBE THUMBNAIL ENGINE
   (ZERO ARCHITECTURE CHANGE)
=================================================== */

async function urlWorks(url){
 try{
   const res = await fetch(url,{method:"HEAD"});
   return res.ok;
 }catch{
   return false;
 }
}

async function getYouTubeImage(html,slug){

 const match =
 html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

 if(!match) return null;

 const id = match[1];

 /* ALL FOUR — ORDER MATTERS */

 const candidates = [

   {
     url:`https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
     large:true
   },

   {
     url:`https://img.youtube.com/vi/${id}/sddefault.jpg`,
     large:true
   },

   {
     url:`https://img.youtube.com/vi/${id}/hqdefault.jpg`,
     large:false
   },

   {
     url:`https://img.youtube.com/vi/${id}/mqdefault.jpg`,
     large:false
   }

 ];


 for(const img of candidates){

   if(await urlWorks(img.url)){

     /* LARGE → use immediately */

     if(img.large){
       return img.url;
     }

     /* SMALL → upscale to 1200×630 */

     const upscaled =
     await upscaleToOG(img.url,slug);

     if(upscaled){
       return `${SITE_URL}/og-images/${slug}.jpg`;
     }
   }
 }

 return null;
}


/* BUILD */

const posts=[];

for(const entry of entries){

 const html = entry.content?.["#text"];
 if(!html) continue;

 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 const url =
 `${SITE_URL}/posts/${slug}/`;

 const description =
 html.replace(/<[^>]+>/g," ").slice(0,155);


/* =========================
   IMAGE PRIORITY (LOCKED)
========================= */

 let og = await getYouTubeImage(html,slug);

/* NEVER skip YouTube */

 if(!og) og = CTA;
 if(!og) og = DEFAULT;

 if(!og){

   await generateOG(slug,title);

   og = `${SITE_URL}/og-images/${slug}.jpg`;
 }


 posts.push({
   title,
   slug,
   html,
   url,
   description,
   og,
   date:entry.published
 });
}


/* SORT */

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));


/* BUILD PAGES — UNTOUCHED */

for(const post of posts){

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

 const related = posts
   .filter(p=>p.slug!==post.slug)
   .slice(0,4)
   .map(p=>`<li><a href="${post.url}">${p.title}</a></li>`)
   .join("");

 const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>${post.title}</title>

<meta name="description" content="${post.description}">
<link rel="canonical" href="${post.url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.description}">
<meta property="og:image" content="${post.og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${post.og}">

</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<a href="${SITE_URL}">← Home</a>

<h1>${post.title}</h1>

${post.html}

<hr>

<h3>Related Reviews</h3>
<ul>${related}</ul>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}


fs.writeFileSync(
"_data/posts.json",
JSON.stringify(posts,null,2)
);

console.log("✅ AUTHORITY STACK PHASE 10 LIVE");
