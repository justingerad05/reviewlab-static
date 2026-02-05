import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/* ---------- LOAD FONT ---------- */
/* Use any bold modern font */

/* ---------- CLEAN TITLE ---------- */

function cleanTitle(title) {
  return title
    .replace(/\|.*$/, "")
    .replace(/Review/gi, "Review")
    .slice(0, 90);
}

/* ---------- BUILD IMAGE ---------- */

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
          background:
            "linear-gradient(135deg, #0f172a, #020617)",
          padding: "60px",
          color: "white"
        },
        children: [

          /* TOP LABEL */

          {
            type: "div",
            props: {
              style: {
                fontSize: 38,
                color: "#38bdf8",
                fontWeight: 700
              },
              children: "HONEST PRODUCT REVIEW"
            }
          },

          /* TITLE */

          {
            type: "div",
            props: {
              style: {
                fontSize: 72,
                lineHeight: 1.1,
                fontWeight: 800
              },
              children: cleanTitle(title)
            }
          },

          /* CTA BAR */

          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              },
              children: [

                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 34,
                      color: "#22c55e",
                      fontWeight: 700
                    },
                    children: "SEE FEATURES • PROS • CONS • VERDICT"
                  }
                },

                {
                  type: "div",
                  props: {
                    style: {
                      background: "#22c55e",
                      padding: "14px 28px",
                      borderRadius: 14,
                      color: "#020617",
                      fontSize: 32,
                      fontWeight: 800
                    },
                    children: "READ NOW →"
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
      ]
    fonts: [
  {
    name: "Inter",
    data: fontData,
    weight: 700,
    style: "normal"
  }
]
}
  );

  const resvg = new Resvg(svg);
  const png = resvg.render();

  fs.writeFileSync(
    `./og-images/${slug}.png`,
    png.asPng()
  );
}
