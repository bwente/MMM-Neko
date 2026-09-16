"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const Engine = require("../lib/neko-engine.js");
const Controller = require("../lib/neko-controller.js");

function environment() {
  const records = new Set();
  class Target {
    addEventListener(name, fn, options) { records.add({ target: this, name, fn, options }); }
    removeEventListener(name, fn) { for (const r of records) if (r.target === this && r.name === name && r.fn === fn) records.delete(r); }
    emit(name, event = {}) { for (const r of [...records]) if (r.target === this && r.name === name) r.fn(event); }
  }
  const env = new Target(), doc = new Target(), media = new Target(), timers = new Map();
  let time = 0, next = 0;
  doc.querySelector = () => null;
  doc.createElement = () => ({ style: {}, attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); }, remove() { this.removed = true; } });
  Object.assign(env, { document: doc, innerWidth: 1024, innerHeight: 600, performance: { now: () => time },
    matchMedia: () => media, setTimeout: (fn) => { timers.set(++next, fn); return next; }, clearTimeout: (id) => timers.delete(id) });
  const tick = (ms = 50) => { time += ms; const pending = [...timers.values()]; timers.clear(); pending.forEach((fn) => fn()); };
  return { env, doc, media, timers, records, tick };
}

test("pause gates compose and every resume has exactly one timer", () => {
  const e = environment(), c = new Controller({}, "cat.svg", e.env);
  assert.equal(e.timers.size, 1); e.tick(); const age = c.cat.age;
  c.receive("NEKO_PAUSE"); assert.equal(e.timers.size, 0);
  c.suspend(); c.receive("NEKO_RESUME"); assert.equal(e.timers.size, 0);
  c.resume(); c.resume(); assert.equal(e.timers.size, 1);
  c.receive("NEKO_HIDE"); assert.equal(c.element.style.display, "none");
  c.receive("NEKO_PAUSE"); c.receive("NEKO_SHOW"); assert.equal(e.timers.size, 0);
  c.receive("NEKO_RESUME"); e.doc.hidden = true; e.doc.emit("visibilitychange");
  e.tick(100000); assert.equal(c.cat.age, age);
  e.doc.hidden = false; e.doc.emit("visibilitychange"); e.tick();
  assert.ok(c.cat.age - age < 0.1); assert.equal(e.timers.size, 1);
  c.destroy(); assert.equal(e.timers.size, 0); assert.equal(e.records.size, 0);
});

test("reduced motion responds live; always and never override preferences", () => {
  for (const setting of ["auto", "always", "never"]) {
    const e = environment(); e.media.matches = true;
    const c = new Controller({ reducedMotion: setting }, "cat.svg", e.env);
    assert.equal(e.timers.size, setting === "never" ? 1 : 0);
    const age = c.cat.age; e.media.matches = false; e.media.emit("change");
    assert.equal(e.timers.size, setting === "always" ? 0 : 1);
    assert.equal(c.cat.age, age); c.destroy();
  }
});

test("passive input, resize while paused, removal, and no resurrection after destroy", () => {
  const e = environment(), c = new Controller({ mode: "mouse" }, "cat.svg", e.env);
  assert.equal(c.element.attrs["aria-hidden"], "true");
  for (const record of e.records) assert.deepEqual(record.options, { passive: true, capture: true });
  e.doc.emit("pointermove", { pointerType: "mouse", clientX: 0, clientY: 0 }); assert.ok(c.cat.target);
  c.receive("NEKO_SET_MODE", { mode: "touch" });
  e.doc.emit("pointerdown", { pointerType: "touch", clientX: 900, clientY: 500 }); assert.ok(c.cat.target);
  c.suspend(); e.env.innerWidth = 20; e.env.innerHeight = 10; e.env.emit("resize");
  assert.ok(c.cat.x + c.cat.size <= 20); assert.ok(c.cat.y + c.cat.size <= 10);
  e.env.emit("beforeunload"); c.destroy(); c.resume();
  assert.equal(e.records.size, 0); assert.equal(e.timers.size, 0); assert.ok(c.element.removed);
  assert.equal(c.receive("NEKO_SHOW"), false);
});

test("module defaults stay in sync; repeated starts dispose old controller", () => {
  let definition;
  const e = environment();
  vm.runInNewContext(fs.readFileSync(require.resolve("../MMM-Neko.js"), "utf8"), {
    Module: { register: (name, value) => { assert.equal(name, "MMM-Neko"); definition = value; } },
    NekoEngine: Engine, NekoController: class extends Controller { constructor(config, url) { super(config, url, e.env); } }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(definition.defaults)), Engine.defaults);
  const m = { ...definition, config: {}, file: (file) => file };
  m.start(); const previous = m.neko; m.start();
  assert.ok(previous.destroyed); assert.equal(e.timers.size, 1);
  assert.equal(m.getDom(), m.getDom());
  m.notificationReceived("NEKO_PAUSE"); assert.equal(e.timers.size, 0);
  m.suspend(); m.resume(); assert.equal(e.timers.size, 0);
  m.stop(); assert.equal(e.records.size, 0);
  for (const [character, sheet] of [["cat", "neko"], ["dog", "dog"], ["tora", "tora"], ["invalid", "neko"]]) {
    m.config = { character }; m.start();
    assert.equal(m.neko.sprite.style.backgroundImage, `url("assets/${sheet}.svg")`);
    assert.equal(e.timers.size, 1); m.stop(); assert.equal(e.records.size, 0);
  }
});

test("region commands resolve DOM bounds and remain queued behind lifecycle gates", () => {
  const e = environment(), c = new Controller({}, "cat.svg", e.env);
  let selector;
  e.doc.querySelector = (value) => { selector = value; return { getBoundingClientRect: () => ({ left: 700, top: 20, width: 200, height: 100 }) }; };
  c.receive("NEKO_PAUSE"); const before = [c.cat.x, c.cat.y];
  assert.equal(c.receive("NEKO_GO_TO_REGION", { region: "top_right" }), true);
  assert.equal(selector, ".region.top.right");
  assert.deepEqual(c.cat.target, { x: 784, y: 54 });
  assert.deepEqual([c.cat.x, c.cat.y], before); assert.equal(e.timers.size, 0);
  e.doc.querySelector = () => null;
  e.env.innerWidth = 200; e.env.innerHeight = 100; e.env.emit("resize");
  assert.deepEqual(c.cat.target, { x: 152, y: 16 });
  e.media.matches = true; c.receive("NEKO_RESUME"); assert.equal(e.timers.size, 0);
  c.receive("NEKO_HIDE"); e.media.matches = false; e.media.emit("change"); assert.equal(e.timers.size, 0);
  c.receive("NEKO_SHOW"); c.suspend(); assert.equal(e.timers.size, 0);
  c.resume(); assert.equal(e.timers.size, 1);
  const target = { ...c.cat.target };
  assert.equal(c.receive("NEKO_GO_TO_REGION", { region: "body" }), false);
  assert.deepEqual(c.cat.target, target);
  c.destroy(); assert.equal(e.records.size, 0);
});
