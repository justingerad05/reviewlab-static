import fs from "fs";
import { createCanvas } from "canvas";

/*
   AUTHORITY OG ENGINE v21
   Binary-safe.
   GitHub compatible.
   Social crawler safe.
*/

export async function generateOG(slug, title){

  const width = 1200;
  const height = 630;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* Background */
  ctx.fillStyle = "#020617";
  ctx.fillRect(0,0,width,height);

  /* Accent bar */
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(0,0,18,height);

  /* Title */
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px Sans";
  ctx.textBaseline = "top";

  const words = title.match(/.{1,28}(\s|$)/g) || [title];

  let y = 120;

  for(const line of words.slice(0,4)){
    ctx.fillText(line.trim(),80,y);
    y += 78;
  }

  /* CTA */
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 42px Sans";
  ctx.fillText("Read The Full Review →",80,520);

  /* Brand */
  ctx.fillStyle = "#94a3b8";
  ctx.font = "28px Sans";
  ctx.fillText("ReviewLab",80,40);

  const buffer = canvas.toBuffer("image/png");

  // 🚨 CRITICAL — write FULL buffer
  const path = `og-images/${slug}.png`;
  fs.writeFileSync(path, buffer);

  /* Safety check */
  const stats = fs.statSync(path);

  if(stats.size < 5000){
    console.log("OG too small — using fallback");

    fs.copyFileSync(
      "og-default.png",
      path
    );
  }
}
