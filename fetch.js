import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

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

/* BUILD POST OBJECTS FIRST (critical for related posts) */

const posts = entries.map(entry => {

 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 return {
   title,
   slug,
   date:entry.published,
   url:`${SITE_URL}/posts/${slug}/`,
   html:entry.content?.["#text"] || ""
 };
});

/* GENERATE PAGES */

for(const post of posts){

 await generateOG(post.slug,post.title);

 const og = `${SITE_URL}/og-images/${post.slug}.png`;

 const description =
 post.html.replace(/<[^>]+>/g," ").slice(0,155);

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

 const related = posts
   .filter(p=>p.slug!==post.slug)
   .sort(()=>0.5-Math.random())
   .slice(0,4)
   .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
   .join("");

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

<meta name="description" content="${description}">
<link rel="canonical" href="${post.url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${og}">
<meta property="og:url" content="${post.url}">
<meta property="og:site_name" content="ReviewLab">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${og}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

</head>
<body>

<h1>${post.title}</h1>

${post.html}

<hr>

<h2>Related Reviews</h2>
<ul>
${related}
</ul>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* DATA */

fs.writeFileSync(
"_data/posts.json",
JSON.stringify(posts,null,2)
);

console.log("✅ AUTHORITY MODE ACTIVE");
