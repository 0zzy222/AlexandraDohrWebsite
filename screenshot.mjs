import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawUrl = process.argv[2] || "http://localhost:3000";
const url = rawUrl + (rawUrl.includes("?") ? "&" : "?") + "noanim=1";
const label = process.argv[3] || "";
const width = Number(process.argv[4]) || 1440;
const height = Number(process.argv[5]) || 900;

const dir = path.join(__dirname, "temporary screenshots");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const existing = fs
  .readdirSync(dir)
  .map((f) => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const n = existing.length ? Math.max(...existing) + 1 : 1;
const filename = `screenshot-${n}${label ? "-" + label : ""}.png`;
const outPath = path.join(dir, filename);

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.goto(url, { waitUntil: "networkidle0" });

// wait for webfonts and images so layout/height is final before scrolling
await page.evaluate(async () => {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const imgs = Array.from(document.images).filter((img) => !img.complete);
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })
    )
  );
});

await new Promise((r) => setTimeout(r, 200));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved: ${outPath}`);
