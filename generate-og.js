import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/* LOAD FONT */
const fontData = fs.readFileSync("./fonts/Inter-Regular.ttf");

/* ENSURE DIR */
if (!fs.existsSync("./og-images")) {
  fs.mkdirSync("./og-images");
}

function cleanTitle(title) {
  return title.replace(/\|.*$/, "").slice(0, 90);
}

export async function generateOG(slug, title) {

  const width = 1200;
  const height = 630;

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
          background: "#020617",
          padding: "60px",
          color: "#ffffff"
        },

        children: [

          {
            type: "div",
            props: {
              style: {
                fontSize: 46,
                fontWeight: 700,
                color: "#38bdf8"
              },
              children: "HONEST AI TOOL REVIEW"
            }
          },

          {
            type: "div",
            props: {
              style: {
                fontSize: 72,
                fontWeight: 800,
                lineHeight: 1.1
              },
              children: cleanTitle(title)
            }
          },

          {
            type: "div",
            props: {
              style: {
                fontSize: 32,
                fontWeight: 600,
                color: "#22c55e"
              },
              children: "Features • Pros • Cons • Verdict"
            }
          }

        ]
      }
    },

    {
      width,
      height,

      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 400,
          style: "normal"
        }
      ]
    }
  );

  const resvg = new Resvg(svg);
  const png = resvg.render();

  fs.writeFileSync(`./og-images/${slug}.png`, png.asPng());
}
