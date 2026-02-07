import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/* ===== CONFIG ===== */

const OG_FOLDER = "./og-images";
const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

/* ===== ENSURE OG FOLDER ===== */

if (!fs.existsSync(OG_FOLDER)) {
  fs.mkdirSync(OG_FOLDER, { recursive: true });
}

/* ===== FONT LOAD ===== */

let fontData;
try {
  fontData = fs.readFileSync("./fonts/Inter-Regular.ttf");
} catch {
  console.log("⚠️ Font missing — using system font");
}

/* ===== CLEAN TITLE ===== */

function cleanTitle(title) {
  return title
    .replace(/\|.*$/,"")
    .replace(/review/gi,"")
    .slice(0,60);
}

/* ===== ELITE OG GENERATOR (FACEBOOK SAFE) ===== */

export async function generateOG(slug, title) {

  try {

    const width = 1200;
    const height = 630;

    /* PURE SVG — NO EXTERNAL IMAGES
       External backgrounds are the #1 reason OG fails.
    */

    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            width,
            height,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "70px",
            background: "linear-gradient(135deg,#020617,#0f172a,#020617)",
            color: "#ffffff",
            fontFamily: "Inter"
          },
          children: [

            /* TOP STRIP */
            {
              type: "div",
              props: {
                style:{
                  fontSize:36,
                  fontWeight:700,
                  color:"#38bdf8"
                },
                children:"REVIEWLAB VERIFIED"
              }
            },

            /* HEADLINE */
            {
              type:"div",
              props:{
                style:{
                  fontSize:72,
                  fontWeight:800,
                  lineHeight:1.05
                },
                children:cleanTitle(title)
              }
            },

            /* CTA BOX */
            {
              type:"div",
              props:{
                style:{
                  background:"#22c55e",
                  color:"#020617",
                  padding:"18px 28px",
                  borderRadius:"14px",
                  fontSize:34,
                  fontWeight:800,
                  width:"fit-content"
                },
                children:"SEE FULL REVIEW →"
              }
            },

            /* TRUST STRIP */
            {
              type:"div",
              props:{
                style:{
                  fontSize:26,
                  color:"#cbd5e1"
                },
                children:"Real Testing • No Hype • Expert Verdict"
              }
            }

          ]
        }
      },
      {
        width,
        height,
        fonts: fontData
          ? [{ name:"Inter", data:fontData, weight:400, style:"normal"}]
          : []
      }
    );

    const resvg = new Resvg(svg, {
      fitTo:{ mode:"width", value:width }
    });

    const pngBuffer = resvg.render().asPng();

    const filePath = `${OG_FOLDER}/${slug}.png`;

    fs.writeFileSync(filePath, pngBuffer);

    console.log("✅ ELITE OG CREATED:", slug);

    return `${SITE_URL}/og-images/${slug}.png`;

  } catch(err) {

    console.error("❌ OG FAILED:", err);

    return `${SITE_URL}/og-default.jpg`;
  }
}
