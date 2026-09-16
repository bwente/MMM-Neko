/* Public, synthetic runtime test fixture; no household configuration. */
let config = {
  address: "localhost",
  port: 8097,
  ipWhitelist: ["127.0.0.1", "::1", "::ffff:127.0.0.1"],
  language: "en",
  timeFormat: 24,
  units: "metric",
  modules: [
    { module: "clock", position: "top_left" },
    { module: "helloworld", position: "bottom_left", config: { text: "MMM-Neko · standard MagicMirror² validation" } },
    { module: "MMM-Neko", position: "fullscreen_above", config: {} }
  ]
};
if (typeof module !== "undefined") module.exports = config;
