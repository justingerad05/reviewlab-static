const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "posts");
const outputFile = path.join(__dirname, "posts.xml");

function formatDate(date) {
  return new Date(date).toUTCString();
}

const posts = fs.readdirSync(postsDir)
  .filter(f => fs.statSync(path.join(postsDir, f)).isDirectory())
  .map(f => {
    const postPath = path.join(postsDir, f, "index.html");
    if (!fs.existsSync(postPath)) return null;

    const title = f.replace(/-/g, " ");
    const link = `https://justingerad05.github.io/reviewlab-static/posts/${f}/`;
    const description = `Full review of ${title}`;
    const pubDate = formatDate(fs.statSync(postPath).mtime);

    return { title, link, description, pubDate };
  })
  .filter(Boolean);

const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Honest Product Review Lab</title>
  <link>https://justingerad05.github.io/reviewlab-static/</link>
  <description>Latest product reviews</description>
  ${posts.map(p => `
  <item>
    <title>${p.title}</title>
    <link>${p.link}</link>
    <description>${p.description}</description>
    <pubDate>${p.pubDate}</pubDate>
    <guid>${p.link}</guid>
  </item>`).join("\n")}
</channel>
</rss>`;

fs.writeFileSync(outputFile, rss, "utf8");
console.log("RSS feed generated:", outputFile);
