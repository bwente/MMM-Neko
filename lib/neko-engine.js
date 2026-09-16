/* Copyright (c) 2026 Brian Wente. MIT license. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NekoEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const defaults = Object.freeze({
    character: "cat", mode: "wander", scale: 1, speed: 32, idleMin: 4, idleMax: 10,
    sleepAfter: 60, sleepDuration: 30, startPosition: Object.freeze({ x: 0.5, y: 0.7 }),
    inset: 16, reducedMotion: "auto"
  });
  const modes = ["wander", "mouse", "touch"];
  const characters = Object.freeze({ cat: "assets/neko.svg", dog: "assets/dog.svg" });
  const regions = Object.freeze({
    top_bar: [0.5, 0], top_left: [0, 0], top_center: [0.5, 0], top_right: [1, 0],
    upper_third: [0.5, 1 / 3], middle_center: [0.5, 0.5], lower_third: [0.5, 2 / 3],
    bottom_left: [0, 1], bottom_center: [0.5, 1], bottom_right: [1, 1], bottom_bar: [0.5, 1],
    fullscreen_above: [0.5, 0.5], fullscreen_below: [0.5, 0.5]
  });
  const finite = (n) => typeof n === "number" && Number.isFinite(n);
  const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  function validateConfig(input) {
    const source = object(input) ? input : {};
    const config = { ...defaults, startPosition: { ...defaults.startPosition } };
    const invalid = Object.keys(source).filter((key) => !Object.hasOwn(defaults, key));
    const rules = {
      character: (v) => typeof v === "string" && Object.hasOwn(characters, v),
      mode: (v) => modes.includes(v),
      scale: (v) => Number.isInteger(v) && v >= 1 && v <= 4,
      speed: (v) => finite(v) && v >= 1 && v <= 200,
      idleMin: (v) => finite(v) && v >= 1 && v <= 300,
      idleMax: (v) => finite(v) && v >= 1 && v <= 300,
      sleepAfter: (v) => finite(v) && v >= 5 && v <= 3600,
      sleepDuration: (v) => finite(v) && v >= 1 && v <= 3600,
      inset: (v) => finite(v) && v >= 0 && v <= 500,
      reducedMotion: (v) => ["auto", "always", "never"].includes(v),
      startPosition: (v) => object(v) && Object.keys(v).length === 2 &&
        [v.x, v.y].every((n) => finite(n) && n >= 0 && n <= 1)
    };
    for (const [key, rule] of Object.entries(rules)) {
      if (!Object.hasOwn(source, key)) continue;
      if (rule(source[key])) config[key] = key === "startPosition" ? { ...source[key] } : source[key];
      else invalid.push(key);
    }
    if (config.idleMax < config.idleMin) {
      config.idleMin = defaults.idleMin;
      config.idleMax = defaults.idleMax;
      invalid.push("idleMin/idleMax");
    }
    return { config, invalid };
  }
  const frames = {
    idle: ["mati2"], groom: ["kaki1", "kaki2"], sleep: ["sleep1", "sleep2"],
    E: ["right1", "right2"], SE: ["dwright1", "dwright2"], S: ["down1", "down2"],
    SW: ["dwleft1", "dwleft2"], W: ["left1", "left2"], NW: ["upleft1", "upleft2"],
    N: ["up1", "up2"], NE: ["upright1", "upright2"]
  };
  const spriteNames = Object.values(frames).flat();
  class Cat {
    constructor(config, random = Math.random) {
      this.config = validateConfig(config).config;
      this.random = random;
      this.mode = this.config.mode;
      this.x = 0; this.y = 0; this.age = 0; this.awake = 0;
      this.target = null;
      this.region = null;
      this.state = "idle"; this.direction = "E"; this.stateTime = 0;
      this.idleDuration = this.nextIdle();
      this.resize(0, 0);
    }
    nextIdle() { return this.config.idleMin + this.random() * (this.config.idleMax - this.config.idleMin); }
    resize(width, height) {
      this.width = finite(width) ? Math.max(0, width) : 0;
      this.height = finite(height) ? Math.max(0, height) : 0;
      this.size = Math.min(32 * this.config.scale, this.width, this.height);
      this.minX = Math.min(this.config.inset, (this.width - this.size) / 2);
      this.minY = Math.min(this.config.inset, (this.height - this.size) / 2);
      this.maxX = this.width - this.size - this.minX;
      this.maxY = this.height - this.size - this.minY;
      if (!this.positioned && this.width && this.height) {
        this.x = this.minX + (this.maxX - this.minX) * this.config.startPosition.x;
        this.y = this.minY + (this.maxY - this.minY) * this.config.startPosition.y;
        this.positioned = true;
      }
      this.x = clamp(this.x, this.minX, this.maxX);
      this.y = clamp(this.y, this.minY, this.maxY);
      if (this.target) this.target = this.bound(this.target.x, this.target.y);
    }
    bound(x, y) { return { x: clamp(x, this.minX, this.maxX), y: clamp(y, this.minY, this.maxY) }; }
    enter(state) { this.state = state; this.stateTime = 0; }
    setMode(mode) {
      if (!modes.includes(mode)) return false;
      this.mode = mode; this.target = null; this.region = null;
      this.enter("idle"); this.idleDuration = this.nextIdle();
      return true;
    }
    point(x, y, kind) {
      if (this.region || kind !== this.mode || !finite(x) || !finite(y)) return false;
      const target = this.bound(x - this.size / 2, y - this.size / 2);
      if (Math.hypot(target.x - this.x, target.y - this.y) < 8) return false;
      this.target = target; this.awake = 0;
      if (this.state !== "walk") this.enter("walk");
      return true;
    }
    goToRegion(region, rect) {
      if (!Object.hasOwn(regions, region)) return false;
      const [x, y] = regions[region];
      const hasRect = rect && [rect.left, rect.top, rect.width, rect.height].every(finite) && rect.width > 0 && rect.height > 0;
      this.target = hasRect
        ? this.bound(rect.left + rect.width / 2 - this.size / 2, rect.top + rect.height / 2 - this.size / 2)
        : { x: this.minX + x * (this.maxX - this.minX), y: this.minY + y * (this.maxY - this.minY) };
      this.region = region; this.awake = 0;
      if (this.state !== "walk") this.enter("walk");
      return true;
    }
    step(seconds) {
      if (!finite(seconds) || seconds <= 0) return;
      const dt = Math.min(seconds, 0.25); // Never jump after a stalled frame.
      this.age += dt; this.stateTime += dt;
      if (this.state !== "sleep") this.awake += dt;
      if (!this.region && this.state !== "sleep" && this.awake >= this.config.sleepAfter) {
        this.target = null; this.enter("sleep");
      }
      if (this.state === "sleep") {
        if (this.stateTime >= this.config.sleepDuration) {
          this.awake = 0; this.enter("idle"); this.idleDuration = this.nextIdle();
        }
      } else if (this.state === "walk" && this.target) {
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const distance = Math.hypot(dx, dy), step = this.config.speed * dt;
        this.direction = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]
          [(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
        if (distance <= step) {
          this.x = this.target.x; this.y = this.target.y; this.target = null;
          if (this.region) this.awake = 0;
          this.region = null;
          this.enter("idle"); this.idleDuration = this.nextIdle();
        } else { this.x += dx / distance * step; this.y += dy / distance * step; }
      } else if (this.state === "idle" && this.stateTime >= this.idleDuration) {
        this.enter("groom");
      } else if (this.state === "groom" && this.stateTime >= 2) {
        this.target = {
          x: this.minX + this.random() * (this.maxX - this.minX),
          y: this.minY + this.random() * (this.maxY - this.minY)
        };
        this.enter("walk");
      }
    }
    frame(reduced = false) {
      const list = frames[reduced ? "sleep" : this.state === "walk" ? this.direction : this.state];
      return list[reduced ? 0 : Math.floor(this.stateTime * (this.state === "sleep" ? 1 : 4)) % list.length];
    }
  }
  function notification(name, payload) {
    const actions = { NEKO_SHOW: "show", NEKO_HIDE: "hide", NEKO_PAUSE: "pause", NEKO_RESUME: "resume" };
    if (Object.hasOwn(actions, name)) return payload == null ? { action: actions[name] } : null;
    if (name === "NEKO_SET_MODE" && object(payload) && Object.keys(payload).length === 1 && modes.includes(payload.mode)) {
      return { action: "mode", mode: payload.mode };
    }
    if (name === "NEKO_GO_TO_REGION" && object(payload) && Object.keys(payload).length === 1 &&
        typeof payload.region === "string" && Object.hasOwn(regions, payload.region)) {
      return { action: "region", region: payload.region };
    }
    return null;
  }
  return { defaults, modes, characters, regions, validateConfig, Cat, notification, spriteNames };
});
