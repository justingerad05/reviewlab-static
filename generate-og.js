// generate-og.js
import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/* ===== CONFIG ===== */
const OG_FOLDER = "./og-images";
const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

/* ===== ENSURE FOLDER ===== */
if (!fs.existsSync(OG_FOLDER)) {
  fs.mkdirSync(OG_FOLDER, { recursive: true });
}

/* ===== SAFE FONT LOAD ===== */
let fontData;
try {
  fontData = fs.readFileSync("./fonts/Inter-Regular.ttf");
} catch {
  console.log("⚠️ Font missing — OG fallback activated");
}

/* ===== CLEAN TITLE ===== */
function cleanTitle(title) {
  return title.replace(/\|.*$/,"").slice(0,85);
}

/* ===== ELITE OG GENERATOR ===== */
export async function generateOG(slug, title, thumbnail = null) {
  try {
    const width = 1200;
    const height = 630;

    // Decide which image to use: thumbnail or fallback
    const bgImage = thumbnail || FALLBACK_IMAGE;

    // Create SVG content with Satori
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
            background: `url(${bgImage}) center/cover no-repeat`,
            padding: "70px",
            color: "#ffffff",
            fontFamily: "Inter, sans-serif"
          },
          children: [
            {
              type: "div",
              props: {
                style: {
                  fontSize: 44,
                  fontWeight: 700,
                  color: "#38bdf8"
                },
                children: "REVIEWLAB VERIFIED"
              }
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: 68,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: "#ffffff"
                },
                children: cleanTitle(title)
              }
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: 30,
                  color: "#22c55e"
                },
                children: "Real Test • Real Verdict • No Hype"
              }
            },
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  gap: "20px"
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#facc15"
                      },
                      children: "★★★★★"
                    }
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: 24,
                        color: "#ffffff"
                      },
                      children: "Elite OG Review"
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        width,
        height,
        fonts: fontData
          ? [
              {
                name: "Inter",
                data: fontData,
                weight: 400,
                style: "normal"
              }
            ]
          : []
      }
    );

    // Render SVG to PNG using Resvg
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
    const pngBuffer = resvg.render().asPng();

    // Write OG image into /og-images
    const ogPath = `${OG_FOLDER}/${slug}.png`;
    fs.writeFileSync(ogPath, pngBuffer);

    console.log("✅ ELITE OG CREATED:", slug);
    return `${SITE_URL}/og-images/${slug}.png`;
  } catch (err) {
    console.error("❌ ELITE OG FAILED:", slug, err);
    return FALLBACK_IMAGE;
  }
}
