import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node
    }
  },
  {
    files: ["MMM-Neko.js", "lib/*.js", "scripts/browser-check.js"],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ["scripts/browser-check.js"],
    languageOptions: { globals: { MM: "readonly" } }
  }
];
