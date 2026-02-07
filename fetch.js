import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

/* ALWAYS RELATIVE — NEVER ABSOLUTE */
const CTA_FALLBACK = "/og-cta-tested.jpg";
const DEFAULT_FALLBACK = "/og-default.jpg";


/* CLEAN BUILD */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});
fs.rmSync("og-images",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});


/* FETCH FEED */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];


/* ================================
   UTILITIES
================================ */

function slugify(title){
 return title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");
}

function strip(html){
 return html
   .replace(/<[^>]+>/g," ")
   .replace(/\s+/g," ")
   .trim();
}


/* ---------- YOUTUBE DETECTOR ---------- */

function extractYouTubeID(html){

 const match =
 html.match(/(?:youtube\.com\/embed\/|youtu\.be\/|watch\?v=)([a-zA-Z0-9_-]{11})/);

 return match ? match[1] : null;
}


/* =====================================================
   BUILD POST DATABASE
===================================================== */

const posts=[];

for(const entry of entries){

 const html = entry.content?.["#text"];
 if(!html) continue;

 const title = entry.title["#text"];
 const slug = slugify(title);

 const postURL =
 `${SITE_URL}/posts/${slug}/`;

 const description = strip(html).slice(0,155);

 let ogImage=null;


/* ================================
   PRIORITY 1 — YOUTUBE (NO HQ!)
================================ */

 const videoID = extractYouTubeID(html);

 if(videoID){

   /* NEVER USE HQ — it causes the preview bug */
   const candidates=[

     `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
     `https://img.youtube.com/vi/${videoID}/sddefault.jpg`

   ];

   for(const img of candidates){

     try{
       const res = await fetch(img,{method:"HEAD"});
       if(res.ok){
         ogImage=img;
         break;
       }
     }catch{}
   }
 }


/* ================================
   PRIORITY 2 — GENERATED OG
   (THIS FIXES YOUR TEXT POSTS)
================================ */

 if(!ogImage){

   await generateOG(slug,title);

   ogImage =
   `${SITE_URL}/og-images/${slug}.jpg`;
 }


/* ================================
   PRIORITY 3 — CTA
================================ */

 if(!ogImage){
   ogImage = `${SITE_URL}${CTA_FALLBACK}`;
 }


/* ================================
   PRIORITY 4 — DEFAULT
================================ */

 if(!ogImage){
   ogImage = `${SITE_URL}${DEFAULT_FALLBACK}`;
 }


 posts.push({
   title,
   slug,
   html,
   url:postURL,
   description,
   og:ogImage,
   date:entry.published
 });
}


/* SORT NEWEST FIRST */

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));


/* =====================================================
   BUILD PAGES WITH INTERNAL GRAPH
===================================================== */

for(let i=0;i<posts.length;i++){

 const post = posts[i];

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});


/* SMART RELATED — NEVER EMPTY */

 const related = posts
   .filter(p=>p.slug!==post.slug)
   .slice(0,4);

 let relatedHTML="";

 if(related.length){

   relatedHTML =
   related
   .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
   .join("");

 }else{

   relatedHTML =
   `<li><a href="${SITE_URL}">See all reviews →</a></li>`;
 }


 const schema = {
 "@context":"https://schema.org",
 "@type":"Review",
 itemReviewed:{
   "@type":"SoftwareApplication",
   name:post.title
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
<title>${post.title}</title>

<meta name="description" content="${post.description}">
<link rel="canonical" href="${post.url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.description}">
<meta property="og:image" content="${post.og}">
<meta property="og:image:secure_url" content="${post.og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${post.og}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<a href="${SITE_URL}"
style="display:inline-block;margin-bottom:40px;font-weight:600;">
← Back to Homepage
</a>

<h1>${post.title}</h1>

${post.html}

<hr>

<h3>Related Reviews</h3>
<ul>
${relatedHTML}
</ul>

</body>
</html>`;

 fs.writeFileSync(
   `posts/${post.slug}/index.html`,
   page
 );
}



/* ELEVENTY DATA */

fs.writeFileSync(
"_data/posts.json",
JSON.stringify(posts,null,2)
);

console.log("✅ AUTHORITY STACK PHASE 4 — STABLE BUILD");
