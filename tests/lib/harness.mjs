// Shared test harness: finds Playwright and serves the tool's folder over HTTP. The tool loads nothing
// from a third party and reaches only api.anthropic.com, so every external request in a test is either
// answered by a stand-in or blocked.
// Adapted from the Data Quality Agent 2.2.0: the paths, PESTEL_TEST_OUT, and --no-sandbox when the tests
// run as root (a container), since Chromium refuses its sandbox there.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

/** The tool's folder: the parent of tests/. */
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Words given on the command line without "--": a suite may run only the parts they name. */
export const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("--"));

/** Console noise that blocked external requests cause in every test. */
export const NETWORK_NOISE = /Failed to load resource|net::ERR_|ERR_BLOCKED_BY_CLIENT|ERR_FAILED/;

export const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8",
};

/**
 * Vici's own checks must run: --require-vici, or any run on GitHub Actions. Without it a suite that needs a
 * ViciDesign checkout and finds none says so and skips that part.
 */
export const REQUIRE_VICI = process.argv.includes("--require-vici") || process.env.GITHUB_ACTIONS === "true";

/** A ViciDesign checkout: the folder in VICI_DIR, or ../ViciDesign next to this repository. */
export function viciDir() {
  return [process.env.VICI_DIR, path.resolve(APP_ROOT, "..", "ViciDesign"), path.resolve(APP_ROOT, "..", "vicidesign")]
    .filter(Boolean).find((d) => existsSync(path.join(d, "scripts", "lib", "guide.mjs"))) || null;
}

/** Where screenshots and result files go (outside the tool's folder by default). */
export async function outDir(suite) {
  const dir = path.join(process.env.PESTEL_TEST_OUT || path.join(os.tmpdir(), "pestel-challenger-tests"), suite);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Playwright is not part of the tool. Install it once, globally or in any folder:
 *   npm install -g playwright && npx playwright install chromium
 * and run with NODE_PATH="$(npm root -g)", or point PLAYWRIGHT_MODULE at its folder.
 */
export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch { /* try the next one */ }
  }
  try {
    const root = execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15000 }).trim();
    for (const name of ["playwright", "playwright-core"]) {
      try { return require(path.join(root, name)); } catch { /* try the next one */ }
    }
  } catch { /* npm not on the path */ }
  console.error("Playwright was not found. Install it with `npm install -g playwright` and `npx playwright install chromium`,\nthen run the tests with NODE_PATH=\"$(npm root -g)\" (or set PLAYWRIGHT_MODULE to the playwright folder).");
  process.exit(2);
}

/** Chromium from Playwright, or the browser at PESTEL_CHROME. */
export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const options = {};
  if (process.env.PESTEL_CHROME) options.executablePath = process.env.PESTEL_CHROME;
  if (typeof process.getuid === "function" && process.getuid() === 0) options.args = ["--no-sandbox"];
  return chromium.launch(options);
}

/** Serves `root` on 127.0.0.1 at a free port. Returns { base, close }. */
export async function serveStatic(root = APP_ROOT) {
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, path.normalize(p));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404); res.end("not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { base: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) };
}

/** Opens the tool in a fresh context and waits until main.js has booted. */
export async function openTool(browser, { query = "", width = 1280, height = 720, locale = "en-GB", init = null, base }) {
  const context = await browser.newContext({ viewport: { width, height }, locale });
  if (init) await context.addInitScript(init.fn, init.arg);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${base}${query}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 15000 });
  return { context, page, errors };
}

/** Prints the results of a suite and exits: PASS or FAIL per check, then the success marker. */
export function report(results, marker) {
  for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  const failed = results.filter(([ok]) => !ok).length;
  if (failed || !results.length) {
    console.error(`\n${failed} of ${results.length} check(s) failed.`);
    process.exit(1);
  }
  console.log(`\n${results.length} checks passed.`);
  console.log(marker);
}
