/* Convert public-domain XBM bitmap/mask pairs to lossless pixel rectangles. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spriteNames, characters } = require("../lib/neko-engine.js");
const root = path.join(__dirname, "..");
const read = (name, mask, character) => {
  // Upstream Tora is the striped cat bitmap with the ordinary cat's masks.
  const sourceCharacter = character === "tora" && mask ? "cat" : character;
  const folder = sourceCharacter === "cat" ? "." : sourceCharacter;
  const suffix = sourceCharacter === "cat" ? "" : `_${sourceCharacter}`;
  const source = fs.readFileSync(path.join(root, "assets/source", folder, mask ? "bitmasks" : "bitmaps", `${name}${suffix}${mask ? "_mask" : ""}.xbm`), "utf8");
  const bytes = [...source.matchAll(/0x([0-9a-f]{2})/gi)].map((match) => parseInt(match[1], 16));
  if (bytes.length !== 128) throw new Error(`Unexpected XBM dimensions: ${name}`);
  return (x, y) => (bytes[y * 4 + Math.floor(x / 8)] >> (x % 8)) & 1;
};
for (const [character, output] of Object.entries(characters)) {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${spriteNames.length * 32}" height="32" viewBox="0 0 ${spriteNames.length * 32} 32" shape-rendering="crispEdges">`;
  const paths = [[], []];
  spriteNames.forEach((name, frame) => {
    const bitmap = read(name, false, character), mask = read(name, true, character);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (!mask(x, y)) continue;
      const color = bitmap(x, y), start = x;
      while (x + 1 < 32 && mask(x + 1, y) && bitmap(x + 1, y) === color) x++;
      const width = x - start + 1;
      paths[color].push(`M${frame * 32 + start} ${y}h${width}v1h-${width}z`);
    }
  });
  paths.forEach((commands, color) => { svg += `<path fill="${color ? "#000" : "#fff"}" d="${commands.join("")}"/>`; });
  fs.writeFileSync(path.join(root, output), `${svg}</svg>\n`);
}
