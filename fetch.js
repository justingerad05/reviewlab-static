import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const CTA_FALLBACK =
`${SITE_URL}/og-cta-tested.jpg`;

const DEFAULT_FALLBACK =
`${SITE_URL}/og-default.jpg`;

/* CLEAN */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});

/* FETCH FEED */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

const posts=[];


/* ---------- YOUTUBE DETECTOR ---------- */

function extractYouTubeID(html){

 const match =
 html.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

 return match ? match[1] : null;
}


/* ---------- THUMBNAIL VALIDATOR ---------- */

async function validateImage(url){

 try{

   const res = await fetch(url,{method:"HEAD"});

   const type = res.headers.get("content-type");

   return res.ok && type && type.startsWith("image");

 }catch{
   return false;
 }
}


/* BUILD LOOP */

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

 let ogImage = null;


/* ================================
   PRIORITY 1 — YOUTUBE THUMBNAIL
================================ */

 const videoID = extractYouTubeID(html);

 if(videoID){

   const candidates = [

     `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
     `https://img.youtube.com/vi/${videoID}/sddefault.jpg`,
     `https://img.youtube.com/vi/${videoID}/hqdefault.jpg`

   ];

   for(const img of candidates){

     if(await validateImage(img)){
       ogImage = img;
       break;
     }
   }
 }


/* ================================
   PRIORITY 2 — CTA IMAGE
================================ */

 if(!ogImage){

   if(await validateImage(CTA_FALLBACK)){
     ogImage = CTA_FALLBACK;
   }
 }


/* ================================
   PRIORITY 3 — DEFAULT
================================ */

 if(!ogImage){

   ogImage = DEFAULT_FALLBACK;
 }


/* ================================
   PRIORITY 4 — GENERATED (LAST)
================================ */

 if(!ogImage){

   await generateOG(slug,title);

   ogImage =
   `${SITE_URL}/og-images/${slug}.jpg`;
 }


 const description =
 html.replace(/<[^>]+>/g," ")
     .replace(/\s+/g," ")
     .slice(0,155);


 fs.mkdirSync(`posts/${slug}`,{recursive:true});


/* RELATED POSTS */

function relatedPosts(currentSlug){

 return posts
  .filter(p => p.slug !== currentSlug)
  .sort((a,b)=> new Date(b.date)-new Date(a.date))
  .slice(0,4)
  .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
  .join("");
}


/* SCHEMA */

 const schema = {
 "@context":"https://schema.org",
 "@type":"Review",
 itemReviewed:{
   "@type":"SoftwareApplication",
   name:title
 },
 author:{
   "@type":"Organization",
   name:"ReviewLab"
 },
 reviewRating:{
   "@type":"Rating",
   ratingValue:"4.8",
   bestRating:"5"
 }
 };


 const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>${title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:secure_url" content="${ogImage}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

</head>
<body>

<a href="${SITE_URL}"
style="display:inline-block;margin-bottom:40px;font-weight:600;">
← Back to Homepage
</a>

<h1>${title}</h1>

${html}

<hr>
<h3>Related Reviews</h3>
<ul>
${relatedPosts(slug)}
</ul>

</body>
</html>`;

 fs.writeFileSync(`posts/${slug}/index.html`,page);

 posts.push({
   slug,
   title,
   url,
   date:entry.published
 });
}


/* ELEVENTY DATA */

fs.writeFileSync(
"_data/posts.json",
JSON.stringify(posts,null,2)
);

console.log("✅ AUTHORITY STACK PHASE 2 LIVE");
