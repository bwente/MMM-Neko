/* Optional integration check against a running, ordinary MagicMirror server.
 * Install Playwright separately; it is not a module runtime dependency.
 */
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1024, height: 600 }, hasTouch: true, reducedMotion: "no-preference" });
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(process.env.MM_URL || "http://localhost:8097");
    await page.waitForSelector(".mmm-neko-cat");
    await page.waitForFunction(() => typeof MM !== "undefined" && MM.getModules().some((m) => m.name === "MMM-Neko"));
    const state = () => page.evaluate(() => {
      const m = MM.getModules().find((entry) => entry.name === "MMM-Neko");
      return { x: m.neko.cat.x, y: m.neko.cat.y, age: m.neko.cat.age, state: m.neko.cat.state, mode: m.neko.cat.mode, timer: m.neko.timer, size: m.neko.cat.size };
    });
    const send = (name, payload) => page.evaluate(({ name, payload }) => {
      MM.getModules().find((m) => m.name === "helloworld").sendNotification(name, payload);
    }, { name, payload });
    const initial = await state();
    await page.waitForFunction(({ x, y }) => {
      const c = MM.getModules().find((m) => m.name === "MMM-Neko").neko.cat;
      return Math.hypot(c.x - x, c.y - y) > 20;
    }, initial, { timeout: 20000 });
    assert.equal((await state()).mode, "wander");
    const screenshotPath = process.env.SCREENSHOT_PATH || path.join(__dirname, "../docs/screenshot.png");
    await page.screenshot({ path: screenshotPath });
    await send("NEKO_GO_TO_REGION", { region: "top_left" });
    const destination = await page.evaluate(() => {
      const cat = MM.getModules().find((m) => m.name === "MMM-Neko").neko.cat;
      const rect = document.querySelector(".region.top.left").getBoundingClientRect();
      return { actual: cat.target, expected: cat.bound(rect.left + rect.width / 2 - cat.size / 2, rect.top + rect.height / 2 - cat.size / 2) };
    });
    assert.deepEqual(destination.actual, destination.expected);
    await page.waitForFunction(() => MM.getModules().find((m) => m.name === "MMM-Neko").neko.cat.region === null, null, { timeout: 40000 });
    const arrived = await state(); assert.equal(arrived.x, destination.expected.x); assert.equal(arrived.y, destination.expected.y);
    await send("NEKO_GO_TO_REGION", { region: "top_right" });
    assert.equal(await page.evaluate(() => MM.getModules().find((m) => m.name === "MMM-Neko").neko.cat.target.x), 976);
    await send("NEKO_SET_MODE", { mode: "wander" });
    // Overlay hit testing: put a real button directly under the cat.
    await send("NEKO_PAUSE");
    const cat = await state();
    await page.evaluate(({ x, y }) => {
      const button = document.createElement("button");
      button.id = "neko-test-control"; button.textContent = "Underlying control";
      Object.assign(button.style, { position: "fixed", left: `${x}px`, top: `${y}px`, width: "100px", height: "40px" });
      button.addEventListener("click", () => { window.nekoTestClicks = (window.nekoTestClicks || 0) + 1; });
      document.querySelector(".module.helloworld .module-content").appendChild(button);
    }, cat);
    assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x + 16, y + 16).id, cat), "neko-test-control");
    await page.mouse.click(cat.x + 16, cat.y + 16);
    assert.equal(await page.evaluate(() => window.nekoTestClicks), 1);
    await page.focus("#neko-test-control"); await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.nekoTestClicks), 2);
    await send("NEKO_SET_MODE", { mode: "touch" }); await send("NEKO_RESUME");
    await page.touchscreen.tap(cat.x + 16, cat.y + 16);
    assert.equal(await page.evaluate(() => window.nekoTestClicks), 3);
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(300);
    assert.equal((await state()).state, "walk");
    await send("NEKO_SET_MODE", { mode: "mouse" });
    await page.mouse.move(850, 150); await page.waitForTimeout(300);
    assert.equal((await state()).state, "walk");
    const previous = (await state()).mode;
    await send("NEKO_SET_MODE", { mode: "bad" }); assert.equal((await state()).mode, previous);
    await send("NEKO_HIDE"); assert.equal(await page.locator(".mmm-neko-overlay").isVisible(), false);
    assert.equal((await state()).timer, null); await send("NEKO_SHOW");
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(100);
    assert.equal((await state()).timer, null);
    const reduced = await state(); await page.mouse.move(500, 500); await page.waitForTimeout(150);
    assert.equal((await state()).age, reduced.age);
    await page.emulateMedia({ reducedMotion: "no-preference" }); await page.waitForTimeout(100);
    assert.notEqual((await state()).timer, null);
    await page.evaluate(() => MM.getModules().find((m) => m.name === "MMM-Neko").hide(0));
    await page.waitForTimeout(100); assert.equal((await state()).timer, null);
    await page.evaluate(() => MM.getModules().find((m) => m.name === "MMM-Neko").show(0));
    await page.waitForTimeout(100); assert.notEqual((await state()).timer, null);
    await send("NEKO_PAUSE"); await page.setViewportSize({ width: 200, height: 100 });
    await page.waitForTimeout(100); const resized = await state();
    assert.ok(resized.x >= 0 && resized.x + resized.size <= 200 && resized.y >= 0 && resized.y + resized.size <= 100);
    assert.equal(await page.locator(".mmm-neko-overlay").getAttribute("aria-hidden"), "true");
    assert.equal(await page.locator(".mmm-neko-overlay [tabindex], .mmm-neko-overlay button").count(), 0);
    await page.evaluate(() => MM.getModules().find((m) => m.name === "MMM-Neko").stop());
    assert.equal(await page.locator(".mmm-neko-overlay").count(), 0);
    assert.deepEqual(errors, []);
    assert.ok(requests.filter((url) => url.includes("MMM-Neko")).every((url) => new URL(url).hostname === "localhost" || new URL(url).hostname === "127.0.0.1"));
    console.log("PASS: standard MagicMirror startup, autonomous movement, region travel and empty-region fallback, click-through mouse/touch/keyboard, notifications, reduced motion, hide/show, resize, teardown; no browser errors.");
    console.log(`Browser: ${browser.version()}; screenshot: ${screenshotPath}`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
