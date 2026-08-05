import satori from "satori";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const index = await readFile(new URL("public/index.html", root), "utf8");
const start = index.indexOf('<div class="brand-lockup">');
const end = index.indexOf("</h1>", start);
if (start < 0 || end < 0) throw new Error("brand-lockup not found in public/index.html");

const lockupHtml = index.slice(start, end + 5);
const letters = [...lockupHtml.matchAll(/<span class="l(\d)">([^<])<\/span>/g)].map(
  ([, color, letter]) => ({ color: Number(color), letter }),
);
const blockCount = [...lockupHtml.matchAll(/<i><\/i>/g)].length;
const ctaLabel = index.match(/<a class="cta"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/)?.[1];
if (letters.map(({ letter }) => letter).join("") !== "SWIPETRIS" || blockCount !== 4 || !ctaLabel) {
  throw new Error("Unexpected landing-page brand markup");
}

const font = await readFile(
  new URL("node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff", root),
);

const colors = ["#22d3ee", "#facc15", "#a855f7", "#4ade80", "#f87171", "#3b82f6", "#fb923c"];
const shadows = [
  "rgba(34,211,238,.55)",
  "rgba(250,204,21,.5)",
  "rgba(168,85,247,.55)",
  "rgba(74,222,128,.5)",
  "rgba(248,113,113,.5)",
  "rgba(59,130,246,.55)",
  "rgba(251,146,60,.5)",
];
const block = (key: string) => ({
  type: "div",
  key,
  props: {
    style: {
      width: 42,
      height: 42,
      borderRadius: 7,
      background: "linear-gradient(135deg, #71f39e 0%, #4ade80 46%, #25b85d 100%)",
      boxShadow: "inset 3px 3px 0 rgba(255,255,255,.38), inset -4px -4px 0 rgba(0,0,0,.25), 0 6px 16px rgba(74,222,128,.18)",
    },
  },
});

const svg = await satori(
  {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1115",
      },
      children: {
        type: "div",
        props: {
          className: "brand-lockup",
          style: { display: "flex", flexDirection: "column", alignItems: "center" },
          children: [
            {
              type: "div",
              props: {
                className: "brand-block",
                style: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 30 },
                children: [
                  {
                    type: "div",
                    props: {
                      style: { display: "flex", gap: 4, marginLeft: 46 },
                      children: [block("top-left"), block("top-right")],
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: { display: "flex", gap: 4, marginRight: 46 },
                      children: [block("bottom-left"), block("bottom-right")],
                    },
                  },
                ],
              },
            },
            {
              type: "div",
              props: {
                className: "logo",
                "aria-label": "swipetris",
                style: {
                  display: "flex",
                  fontFamily: "Press Start 2P",
                  fontSize: 58,
                  lineHeight: 1.3,
                  letterSpacing: ".04em",
                },
                children: letters.map(({ color, letter }, index) => ({
                  type: "span",
                  key: `${letter}-${index}`,
                  props: {
                    style: {
                      color: colors[color - 1],
                      textShadow: `0 0 24px ${shadows[color - 1]}`,
                    },
                    children: letter,
                  },
                })),
              },
            },
          ],
        },
      },
    },
  },
  {
    width: 1200,
    height: 360,
    fonts: [{ name: "Press Start 2P", data: font, weight: 400, style: "normal" }],
  },
);

const playButton = await satori(
  {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      children: {
        type: "div",
        props: {
          style: {
            width: 320,
            height: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            borderRadius: 12,
            color: "#0c0d10",
            background: "linear-gradient(180deg, #82eaa0 0%, #4ade80 45%, #3aad64 100%)",
            boxShadow: "inset 0 3px 0 rgba(255,255,255,.4), inset 0 -5px 0 rgba(0,0,0,.28), 0 6px 16px rgba(0,0,0,.35)",
            fontFamily: "Press Start 2P",
            fontSize: 18,
          },
          children: [
            {
              type: "svg",
              props: {
                width: 24,
                height: 24,
                viewBox: "0 0 24 24",
                children: { type: "path", props: { d: "m8 5 11 7-11 7V5Z", fill: "currentColor" } },
              },
            },
            ctaLabel,
          ],
        },
      },
    },
  },
  {
    width: 340,
    height: 96,
    fonts: [{ name: "Press Start 2P", data: font, weight: 400, style: "normal" }],
  },
);

await Promise.all([
  writeFile(new URL("public/brand.svg", root), `${svg}\n`),
  writeFile(new URL("public/play-button.svg", root), `${playButton}\n`),
]);
console.log("generated public/brand.svg and public/play-button.svg from public/index.html");
