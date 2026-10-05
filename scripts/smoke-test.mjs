// Smoke test: levanta un servidor estático, abre la app en Chromium headless
// y falla si hay errores de consola o recursos 404.
// Requiere: npm i -D puppeteer  (y un Chromium descargado por puppeteer)
import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    const data = await readFile(join(root, p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("404");
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const puppeteer = await import("puppeteer").catch(() => null);
if (!puppeteer) {
  console.error("Instala puppeteer: npm i -D puppeteer");
  server.close();
  process.exit(2);
}

const browser = await puppeteer.default.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));
await browser.close();
server.close();

if (errors.length) {
  console.error("SMOKE TEST FALLO:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("SMOKE TEST OK: sin errores de consola ni recursos 404");
