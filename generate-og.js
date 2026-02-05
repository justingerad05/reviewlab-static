import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/* ENSURE FOLDER EXISTS */
if (!fs.existsSync("./og-images")) {
  fs.mkdirSync("./og-images");
}

/* CLEAN TITLE */

function cleanTitle(title) {
  return title
    .replace(/\|.*$/, "")
    .replace(/Review/gi, "Review")
    .slice(0, 90);
}

/* GENERATOR */

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
          background: "linear-gradient(135deg,#020617,#0f172a)",
          padding: "60px",
          color: "#ffffff"
        },

        children: [

          /* TOP STRIP */
          {
            type: "div",
            props: {
              style: {
                fontSize: 42,
                fontWeight: 700,
                color: "#38bdf8"
              },
              children: "HONEST AI TOOL REVIEW"
            }
          },

          /* TITLE */
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
                    children: "FEATURES • PROS • CONS • VERDICT"
                  }
                },

                {
                  type: "div",
                  props: {
                    style: {
                      background: "#22c55e",
                      color: "#020617",
                      padding: "14px 28px",
                      borderRadius: 12,
                      fontSize: 30,
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
      height
    }
  );

  const resvg = new Resvg(svg);
  const png = resvg.render();

  fs.writeFileSync(`./og-images/${slug}.png`, png.asPng());
}
