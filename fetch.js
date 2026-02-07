import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const DEFAULT_IMAGE =
`${SITE_URL}/og-default.jpg`;

/* CLEAN */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

const posts=[];

/* BUILD */

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

 /* GENERATE OG */

 try{
   await generateOG(slug,title);
 }catch{
   fs.copyFileSync(
     "og-default.jpg",
     `og-images/${slug}.jpg`
   );
 }

const og = `${SITE_URL}/og-images/${slug}.jpg`;

 const description =
 html.replace(/<[^>]+>/g," ")
     .slice(0,155);

 fs.mkdirSync(`posts/${slug}`,{recursive:true});

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

function relatedPosts(currentSlug){

  return posts
    .filter(p => p.slug !== currentSlug)
    .sort((a,b)=> new Date(b.date) - new Date(a.date))
    .slice(0,4)
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

}
 
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
<meta property="og:image" content="${og}">
<meta property="og:image:secure_url" content="${og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="ReviewLab">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${og}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

</head>
<body>

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

console.log("✅ v21 AUTHORITY ENGINE LIVE");
