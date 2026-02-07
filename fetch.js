import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const CTA =
`${SITE_URL}/og-cta-tested.jpg`;

const DEFAULT =
`${SITE_URL}/og-default.jpg`;


/* CLEAN BUILD */

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


/* ===============================
UTILITIES
=============================== */

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

/* YOUTUBE — MANDATORY PRIORITY */

async function getYouTubeThumb(html){

 const match =
 html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

 if(!match) return null;

 const id = match[1];

 const candidates = [

   `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
   `https://img.youtube.com/vi/${id}/sddefault.jpg`,
   `https://img.youtube.com/vi/${id}/hqdefault.jpg`

 ];

 for(const img of candidates){

   try{
     const res = await fetch(img,{method:"HEAD"});
     if(res.ok) return img;
   }catch{}
 }

 return null;
}


/* FAQ ENGINE */

function buildFAQ(title){

 return [
   {
     q:`What is ${title}?`,
     a:`${title} is a software tool reviewed by ReviewLab using real testing methodology to determine whether it delivers measurable results.`
   },
   {
     q:`Is ${title} worth it?`,
     a:`If you value automation, efficiency, and scalable results, ${title} may be a strong candidate depending on your workflow needs.`
   },
   {
     q:`Who should use ${title}?`,
     a:`Marketers, creators, founders, and digital operators looking to increase productivity typically benefit the most.`
   }
 ];
}


/* BUILD DATABASE */

const posts=[];

for(const entry of entries){

 const html = entry.content?.["#text"];
 if(!html) continue;

 const title = entry.title["#text"];
 const slug = slugify(title);

 const url =
 `${SITE_URL}/posts/${slug}/`;

 const description = strip(html).slice(0,155);


/* IMAGE STACK */

 let og = await getYouTubeThumb(html);

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
   faq:buildFAQ(title),
   date:entry.published
 });
}


/* SORT — NEWEST FIRST */

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));



/* ===============================
BUILD AUTHORITY PAGES
=============================== */

for(const post of posts){

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});


/* SEMANTIC RELATED (keyword overlap) */

 const keywords = post.title.toLowerCase().split(" ");

 const related = posts
   .filter(p=>p.slug!==post.slug)
   .map(p=>{
     let score=0;
     keywords.forEach(k=>{
       if(p.title.toLowerCase().includes(k)) score++;
     });
     return {...p,score};
   })
   .sort((a,b)=>b.score-a.score)
   .slice(0,4)
   .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
   .join("");


/* FAQ SCHEMA */

const faqSchema = {
 "@context":"https://schema.org",
 "@type":"FAQPage",
 mainEntity: post.faq.map(f=>({
   "@type":"Question",
   name:f.q,
   acceptedAnswer:{
     "@type":"Answer",
     text:f.a
   }
 }))
};


/* BREADCRUMB */

const breadcrumb = {
 "@context":"https://schema.org",
 "@type":"BreadcrumbList",
 itemListElement:[
   {
     "@type":"ListItem",
     position:1,
     name:"Home",
     item:SITE_URL
   },
   {
     "@type":"ListItem",
     position:2,
     name:"Reviews",
     item:`${SITE_URL}/posts/`
   },
   {
     "@type":"ListItem",
     position:3,
     name:post.title,
     item:post.url
   }
 ]
};


/* AUTHOR + REVIEW */

const reviewSchema = {
 "@context":"https://schema.org",
 "@type":"Review",
 author:{
   "@type":"Organization",
   name:"ReviewLab"
 },
 reviewRating:{
   "@type":"Rating",
   ratingValue:"4.8",
   bestRating:"5"
 },
 itemReviewed:{
   "@type":"SoftwareApplication",
   name:post.title
 }
};



/* BUILD PAGE */

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

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${post.og}">

<script type="application/ld+json">
${JSON.stringify(reviewSchema)}
</script>

<script type="application/ld+json">
${JSON.stringify(faqSchema)}
</script>

<script type="application/ld+json">
${JSON.stringify(breadcrumb)}
</script>

</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<a href="${SITE_URL}" style="font-weight:600;">← Home</a>

<h1>${post.title}</h1>

${post.html}

<hr>

<h2>Frequently Asked Questions</h2>

${post.faq.map(f=>`<p><strong>${f.q}</strong><br>${f.a}</p>`).join("")}

<hr>

<h3>Related Reviews</h3>
<ul>
${related}
</ul>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}


/* DATA FILE */

fs.writeFileSync(
"_data/posts.json",
JSON.stringify(posts,null,2)
);

console.log("✅ AUTHORITY STACK PHASE 7 DEPLOYED");
