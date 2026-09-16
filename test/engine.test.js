"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Cat, defaults, regions, validateConfig, notification, spriteNames } = require("../lib/neko-engine.js");
const advance = (cat, seconds) => { for (let i = 0; i < seconds * 20; i++) cat.step(0.05); };

test("configuration defaults, ranges, enums, unknown keys and invalid pairs", () => {
  for (const input of [undefined, null, [], "x"]) assert.deepEqual(validateConfig(input).config, defaults);
  const bad = { mode: "x", scale: 1.5, speed: NaN, idleMin: -1, idleMax: Infinity,
    sleepAfter: 0, sleepDuration: "20", startPosition: { x: 2, y: 0 }, inset: -1, reducedMotion: false, unknown: 1 };
  assert.deepEqual(validateConfig(bad).config, defaults);
  assert.equal(validateConfig(bad).invalid.length, 11);
  assert.equal(validateConfig({ idleMin: 20, idleMax: 10 }).config.idleMin, 4);
  const valid = { mode: "touch", scale: 4, speed: 200, idleMin: 1, idleMax: 300,
    sleepAfter: 5, sleepDuration: 3600, startPosition: { x: 0, y: 1 }, inset: 500, reducedMotion: "never" };
  assert.deepEqual(validateConfig(valid).config, valid);
  assert.deepEqual(validateConfig(valid).invalid, []);
});

test("default cat autonomously idles, scratches, walks, sleeps and wakes without input", () => {
  const cat = new Cat({}, () => 0.25); cat.resize(1024, 600);
  const start = { x: cat.x, y: cat.y }, seen = new Set();
  for (let i = 0; i < 2400; i++) { cat.step(0.05); seen.add(cat.state); assert.ok(spriteNames.includes(cat.frame())); }
  assert.deepEqual([...seen].sort(), ["groom", "idle", "sleep", "walk"]);
  assert.notDeepEqual({ x: cat.x, y: cat.y }, start);
  assert.notEqual(cat.state, "sleep");
});

test("timing and speed use seconds, never overshoot, and clamp stalled ticks", () => {
  const cat = new Cat({ mode: "mouse", speed: 40 }); cat.resize(800, 600);
  const x = cat.x; cat.point(x + 116, cat.y + 16, "mouse");
  advance(cat, 1); assert.ok(Math.abs(cat.x - x - 40) < 0.001);
  const before = cat.x; cat.step(100); assert.ok(cat.x - before <= 10.001);
  advance(cat, 3); assert.equal(cat.x, x + 100);
  for (const dt of [NaN, Infinity, -1, undefined]) cat.step(dt);
  assert.ok(Number.isFinite(cat.x));
});

test("viewport bounds include sprite and inset, including tiny and zero viewports", () => {
  const cat = new Cat({ scale: 4, inset: 500, mode: "touch" });
  for (const [w, h] of [[1920, 1080], [1024, 600], [100, 50], [1, 1], [0, 0], [800, 600]]) {
    cat.resize(w, h); cat.point(9999, -9999, "touch"); advance(cat, 10);
    assert.ok(cat.x >= 0 && cat.y >= 0);
    assert.ok(cat.x + cat.size <= w && cat.y + cat.size <= h);
  }
});

test("mouse and touch targets are opt-in; modes clear old targets", () => {
  const cat = new Cat({}); cat.resize(800, 600);
  assert.equal(cat.point(50, 50, "mouse"), false);
  assert.equal(cat.setMode("mouse"), true);
  assert.equal(cat.point(50, 50, "touch"), false);
  assert.equal(cat.point(NaN, 50, "mouse"), false);
  assert.equal(cat.point(50, 50, "mouse"), true);
  assert.equal(cat.state, "walk");
  cat.setMode("touch"); assert.equal(cat.target, null);
  assert.equal(cat.point(700, 500, "touch"), true);
  assert.equal(cat.setMode("invalid"), false); assert.equal(cat.mode, "touch");
});

test("sleep duration and deliberate input wake-up", () => {
  const cat = new Cat({ mode: "touch", sleepAfter: 5, sleepDuration: 2 }); cat.resize(800, 600);
  advance(cat, 5.1); assert.equal(cat.state, "sleep");
  advance(cat, 2.1); assert.equal(cat.state, "idle");
  advance(cat, 5.1); assert.equal(cat.state, "sleep");
  cat.point(0, 0, "touch"); assert.equal(cat.state, "walk");
  assert.equal(cat.frame(true), "sleep1");
});

test("continuous pointer updates preserve the walking animation clock", () => {
  const cat = new Cat({ mode: "mouse" }); cat.resize(800, 600);
  for (let i = 0; i < 10; i++) { cat.point(50 + i, 50, "mouse"); cat.step(0.05); }
  assert.ok(cat.stateTime > 0.4);
});

test("strict semantic notification payload validation", () => {
  for (const name of ["NEKO_SHOW", "NEKO_HIDE", "NEKO_PAUSE", "NEKO_RESUME"]) {
    assert.ok(notification(name)); assert.ok(notification(name, null));
    for (const bad of [false, 0, "", {}, [], { mode: "mouse" }]) assert.equal(notification(name, bad), null);
  }
  for (const mode of ["wander", "mouse", "touch"]) assert.deepEqual(notification("NEKO_SET_MODE", { mode }), { action: "mode", mode });
  for (const bad of [null, undefined, "mouse", {}, { mode: "x" }, { mode: "mouse", extra: 1 }]) assert.equal(notification("NEKO_SET_MODE", bad), null);
  assert.equal(notification("unrelated", {}), null);
});

test("region commands validate every standard name and reject malformed payloads", () => {
  for (const region of Object.keys(regions)) {
    assert.deepEqual(notification("NEKO_GO_TO_REGION", { region }), { action: "region", region });
    const cat = new Cat({}); cat.resize(800, 600); assert.equal(cat.goToRegion(region), true);
    assert.ok(cat.target.x >= cat.minX && cat.target.x <= cat.maxX);
    assert.ok(cat.target.y >= cat.minY && cat.target.y <= cat.maxY);
  }
  for (const payload of [null, undefined, [], "top_left", {}, { region: "invalid" }, { region: "constructor" },
    { region: "top_left", extra: true }, { region: ["top_left"] }, { region: ".region.top" }]) {
    assert.equal(notification("NEKO_GO_TO_REGION", payload), null);
  }
});

test("region trips wake Neko, take priority until arrival, then restore autonomous behavior", () => {
  const cat = new Cat({ mode: "mouse", speed: 200, sleepAfter: 5, idleMin: 1, idleMax: 1 });
  cat.resize(1920, 1080); cat.enter("sleep");
  assert.equal(cat.goToRegion("top_right"), true); const target = { ...cat.target };
  assert.equal(cat.mode, "mouse"); assert.equal(cat.point(0, 0, "mouse"), false);
  advance(cat, 5.1); assert.equal(cat.state, "walk");
  for (let i = 0; i < 1000 && cat.region; i++) cat.step(0.05);
  assert.equal(cat.region, null); assert.equal(cat.state, "idle");
  assert.deepEqual({ x: cat.x, y: cat.y }, target);
  advance(cat, 1.1); assert.equal(cat.state, "groom");
  cat.goToRegion("bottom_left"); cat.goToRegion("middle_center"); assert.equal(cat.region, "middle_center");
  cat.setMode("touch"); assert.equal(cat.region, null); assert.equal(cat.target, null);
});

test("region rectangle targets clamp to the viewport and empty regions use anchors", () => {
  const cat = new Cat({}); cat.resize(800, 600);
  cat.goToRegion("top_left", { left: 60, top: 60, width: 200, height: 100 });
  assert.deepEqual(cat.target, { x: 144, y: 94 });
  cat.goToRegion("top_left", { left: -100, top: -100, width: 10, height: 10 });
  assert.deepEqual(cat.target, { x: 16, y: 16 });
  cat.goToRegion("bottom_right", { left: 0, top: 0, width: 0, height: 0 });
  assert.deepEqual(cat.target, { x: 752, y: 552 });
  const target = { ...cat.target }; assert.equal(cat.goToRegion("invalid"), false); assert.deepEqual(cat.target, target);
});
