import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG, upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const CTA = `${SITE_URL}/og-cta-tested.jpg`;
const DEFAULT = `${SITE_URL}/og-default.jpg`;

/* CLEAN BUILD */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});
fs.rmSync("author",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("author",{recursive:true});

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

/* YOUTUBE THUMB */

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

/* CATEGORY EXTRACTION */

function extractCategories(text){
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = {};
  words.forEach(w=>freq[w]=(freq[w]||0)+1);
  return Object.entries(freq)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)
    .map(e=>e[0]);
}

const posts=[];

/* BUILD POST DATA */

for(const entry of entries){

  const html = entry.content?.["#text"];
  if(!html) continue;

  const title = entry.title["#text"];

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-|-$/g,"");

  const url = `${SITE_URL}/posts/${slug}/`;

  const description = html.replace(/<[^>]+>/g," ").slice(0,155);

  let ogImages = await getYouTubeImages(html,slug);
  if(!ogImages) ogImages=[CTA];
  if(!ogImages) ogImages=[DEFAULT];

  const primaryOG = ogImages[0];
  const thumb = ogImages.find(img=>img.includes("hqdefault")) || primaryOG;

  const textOnly = html.replace(/<[^>]+>/g,"");

  const readTime = Math.max(1,
    Math.ceil(textOnly.split(/\s+/).length / 200)
  );

  const categories = extractCategories(textOnly);

/* REVIEW SCHEMA */

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
      "name":"Justin Gerald"
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

/* ARTICLE + BREADCRUMB */

  const articleSchema = {
    "@context":"https://schema.org",
    "@type":"Article",
    "headline":title,
    "image":ogImages,
    "datePublished":entry.published,
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
      {
        "@type":"ListItem",
        "position":1,
        "name":"Home",
        "item":SITE_URL
      },
      {
        "@type":"ListItem",
        "position":2,
        "name":title,
        "item":url
      }
    ]
  };

  posts.push({
    title,
    slug,
    html,
    url,
    description,
    og:primaryOG,
    thumb,
    readTime,
    date:entry.published,
    schemas:JSON.stringify([
      articleSchema,
      breadcrumbSchema,
      reviewSchema
    ]),
    categories
  });
}

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* BUILD POSTS */

for(const post of posts){

  fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

  const related = posts
    .filter(p=>p.slug!==post.slug)
    .slice(0,4)
    .map(p=>`
<li style="margin-bottom:16px;">
<a href="${p.url}" style="display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;">
<img src="${p.thumb}" width="110" style="border-radius:10px;flex-shrink:0;">
<span style="font-weight:600;">${p.title} (~${p.readTime} min)</span>
</a>
</li>`).join("");

  const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${post.title}</title>

<meta name="description" content="${post.description}">

<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.description}">
<meta property="og:type" content="article">
<meta property="og:image" content="${post.og}">

<script type="application/ld+json">
${post.schemas}
</script>

</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<nav style="font-size:14px;margin-bottom:20px;">
<a href="${SITE_URL}">Home</a> › ${post.title}
</nav>

<h1>${post.title}</h1>

<p style="opacity:.7;font-size:14px;">
By <a href="${SITE_URL}/author/">Justin Gerald</a> • ${post.readTime} min read
</p>

${post.html}

<hr>

<h3>Related Reviews</h3>

<ul style="list-style:none;padding:0;">
${related}
</ul>

</body>
</html>`;

  fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* SAVE JSON */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

/* AUTHOR PAGE */

const authorPage = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>About Justin Gerald</title>
</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.8;">

<h1>Justin Gerald</h1>

<p>
Justin Gerald is an independent product reviewer and digital publishing specialist focused on evaluating emerging online tools, AI software, and consumer platforms.
</p>

<p>
Every review published on ReviewLab is based on structured analysis, feature evaluation, usability testing, and market comparison.
</p>

<h2>Editorial Integrity</h2>

<p>
ReviewLab maintains strict editorial independence.  
Some articles may contain affiliate links, which help support the publication at no additional cost to readers.
</p>

<p>
Products are never ranked based on compensation.
Recommendations are driven by research, usefulness, and overall value.
</p>

</body>
</html>
`;

fs.writeFileSync("author/index.html",authorPage);

/* EDITORIAL POLICY */

const editorial = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Editorial Policy</title>
</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.8;">

<h1>Editorial Policy</h1>

<p>
ReviewLab is committed to accuracy, transparency, and reader-first publishing.
</p>

<ul>
<li>Content is researched before publication</li>
<li>Updates are made when products change</li>
<li>No sponsored rankings</li>
<li>Clear affiliate disclosure</li>
</ul>

<p>
Our mission is simple: help readers make smarter purchasing decisions.
</p>

</body>
</html>
`;

fs.writeFileSync("editorial.html",editorial);

console.log("✅ PHASE 24 COMPLETE — AUTHORITY STACK ACTIVATED");
