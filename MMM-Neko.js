/* global Module, NekoEngine, NekoController */
/* Copyright (c) 2026 Brian Wente. MIT license. */
Module.register("MMM-Neko", {
  requiresVersion: "2.25.0",
  defaults: {
    character: "cat", mode: "wander", scale: 1, speed: 32, idleMin: 4, idleMax: 10,
    sleepAfter: 60, sleepDuration: 30, startPosition: { x: 0.5, y: 0.7 },
    inset: 16, reducedMotion: "auto"
  },
  getScripts() { return [this.file("lib/neko-engine.js"), this.file("lib/neko-controller.js")]; },
  getStyles() { return [this.file("MMM-Neko.css")]; },
  start() {
    if (this.neko) this.neko.destroy();
    // Invalid settings fall back individually. No user-facing text is rendered.
    this.config = NekoEngine.validateConfig(this.config).config;
    this.neko = new NekoController(this.config, this.file(NekoEngine.characters[this.config.character]));
  },
  getDom() { return this.neko.element; },
  notificationReceived(name, payload) { if (this.neko) this.neko.receive(name, payload); },
  suspend() { if (this.neko) this.neko.suspend(); },
  resume() { if (this.neko) this.neko.resume(); },
  stop() { if (this.neko) this.neko.destroy(); }
});
