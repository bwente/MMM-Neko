/* Copyright (c) 2026 Brian Wente. MIT license. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./neko-engine.js"));
  else root.NekoController = factory(root.NekoEngine);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Engine) {
  "use strict";
  return class Controller {
    constructor(config, assetUrl, env = window) {
      this.env = env; this.doc = env.document;
      this.cat = new Engine.Cat(config);
      this.config = this.cat.config;
      this.timer = null; this.disposers = []; this.destroyed = false;
      this.paused = false; this.suspended = false; this.hidden = false;
      this.element = this.doc.createElement("div");
      this.element.className = "mmm-neko-overlay";
      this.element.setAttribute("aria-hidden", "true");
      this.sprite = this.doc.createElement("div");
      this.sprite.className = "mmm-neko-cat";
      this.sprite.style.backgroundImage = `url("${assetUrl}")`;
      this.element.appendChild(this.sprite);
      this.media = env.matchMedia("(prefers-reduced-motion: reduce)");
      this.listen(env, "resize", () => this.resize());
      this.listen(this.doc, "visibilitychange", () => this.sync());
      this.listen(env, "pagehide", () => this.stop());
      this.listen(env, "pageshow", () => this.sync());
      this.listen(env, "beforeunload", () => this.destroy());
      this.listen(this.media, "change", () => this.sync());
      // Passive capture observes events even when a module stops bubbling.
      this.listen(this.doc, "pointermove", (event) => {
        if (event.pointerType === "mouse") this.point(event, "mouse");
      });
      this.listen(this.doc, "pointerdown", (event) => {
        if (event.pointerType === "touch" && event.isPrimary !== false) this.point(event, "touch");
      });
      this.resize(); this.sync();
    }
    listen(target, event, callback) {
      const options = { passive: true, capture: true };
      target.addEventListener(event, callback, options);
      this.disposers.push(() => target.removeEventListener(event, callback, options));
    }
    reduced() { return this.config.reducedMotion === "always" || (this.config.reducedMotion === "auto" && this.media.matches); }
    active() { return !this.destroyed && !this.paused && !this.suspended && !this.hidden && !this.doc.hidden && !this.reduced(); }
    point(event, kind) {
      if (this.active()) this.cat.point(event.clientX, event.clientY, kind);
    }
    goToRegion(region) {
      // Only validated built-in names reach the selector.
      const element = this.doc.querySelector(`.region.${region.replaceAll("_", ".")}`);
      this.cat.goToRegion(region, element ? element.getBoundingClientRect() : null);
    }
    resize() {
      this.cat.resize(this.env.innerWidth, this.env.innerHeight);
      if (this.cat.region) this.goToRegion(this.cat.region);
      this.render();
    }
    render() {
      const size = this.cat.size;
      const index = Engine.spriteNames.indexOf(this.cat.frame(this.reduced()));
      this.sprite.style.width = `${size}px`; this.sprite.style.height = `${size}px`;
      this.sprite.style.transform = `translate(${Math.round(this.cat.x)}px, ${Math.round(this.cat.y)}px)`;
      this.sprite.style.backgroundSize = `${size * Engine.spriteNames.length}px ${size}px`;
      this.sprite.style.backgroundPosition = `${-index * size}px 0px`;
      this.element.style.display = this.hidden ? "none" : "block";
    }
    stop() {
      if (this.timer !== null) this.env.clearTimeout(this.timer);
      this.timer = null;
    }
    sync() {
      this.stop();
      if (this.destroyed) return;
      this.render();
      if (!this.active()) return;
      this.lastTime = this.env.performance.now();
      const tick = () => {
        this.timer = null;
        if (!this.active()) return;
        const now = this.env.performance.now();
        this.cat.step((now - this.lastTime) / 1000); this.lastTime = now;
        this.render();
        this.timer = this.env.setTimeout(tick, 50);
      };
      this.timer = this.env.setTimeout(tick, 50);
    }
    suspend() { this.suspended = true; this.sync(); }
    resume() { this.suspended = false; this.sync(); }
    receive(name, payload) {
      if (this.destroyed) return false;
      const command = Engine.notification(name, payload);
      if (!command) return false;
      switch (command.action) {
        case "show": this.hidden = false; break;
        case "hide": this.hidden = true; break;
        case "pause": this.paused = true; break;
        case "resume": this.paused = false; break;
        case "mode": this.cat.setMode(command.mode); break;
        case "region": this.goToRegion(command.region); break;
      }
      this.sync(); return true;
    }
    destroy() {
      this.stop(); this.disposers.splice(0).forEach((dispose) => dispose());
      this.element.remove(); this.destroyed = true;
    }
  };
});
