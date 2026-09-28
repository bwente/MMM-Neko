# Custom sprite sheets

Use your own compatible PNG or SVG without forking MMM-Neko or editing its
JavaScript or CSS. The built-in characters continue to work as before.

## Installation

Create `sprites/` inside your installed `MMM-Neko` directory and copy your sheet
there, for example `sprites/my-pet.png`. This directory is ignored by Git so
ordinary module updates leave your artwork alone. Back it up separately: a
fresh clone does not include it, and deleting the module deletes local artwork.

```javascript
{
  module: "MMM-Neko",
  position: "fullscreen_above",
  config: {
    spriteSheet: "sprites/my-pet.png",
    scale: 2
  }
},
```

Restart MagicMirror after changing the configuration or artwork. `spriteSheet`
overrides `character` when set. Use an empty string (the default) to return to
built-in character selection. Paths are relative to this module, must start
with `sprites/`, and must end in lowercase `.png` or `.svg`. File and directory
names may contain letters, digits, underscores, and hyphens. Remote URLs,
absolute paths, traversal, spaces, query strings, and other formats are rejected.

The bundled cat displays while the custom sheet loads and remains visible if
loading fails or the decoded dimensions are not exactly 672 × 32. Invalid path
settings are ignored, leaving the configured built-in character selected.
There are no on-screen error messages. Check your browser's network tools if
an image is missing. Dimension validation cannot check whether the poses are
correct: artists must check every action visually.

No build step or PNG conversion is needed. The historical XBM asset builder
only rebuilds the bundled characters and does not touch `sprites/`.

## Sprite-sheet format

| Property | Required value |
| --- | --- |
| Frame size | 32 × 32 source pixels |
| Frame count | 21 |
| Arrangement | One horizontal row, left to right |
| Sheet size | 672 × 32 |
| Spacing | No margins, gutters, borders, or labels |
| Background | Transparent |
| SVG coordinate system | `viewBox="0 0 672 32"` |

The top-left corner of frame number `n` is at `x = n × 32`, `y = 0`.
Frame numbers below start at zero. Direction describes the character's travel
across the screen, with up toward the top of the display.

| Frames | Pose or movement | Existing source names, in order |
| --- | --- | --- |
| 0 | Idle | `mati2` |
| 1–2 | Grooming, scratching, or another small idle action | `kaki1`, `kaki2` |
| 3–4 | Sleeping or resting | `sleep1`, `sleep2` |
| 5–6 | Right | `right1`, `right2` |
| 7–8 | Down-right | `dwright1`, `dwright2` |
| 9–10 | Down | `down1`, `down2` |
| 11–12 | Down-left | `dwleft1`, `dwleft2` |
| 13–14 | Left | `left1`, `left2` |
| 15–16 | Up-left | `upleft1`, `upleft2` |
| 17–18 | Up | `up1`, `up2` |
| 19–20 | Up-right | `upright1`, `upright2` |

Paired poses alternate at four frames per second for walking and grooming, and
one frame per second for sleep. Idle uses its single frame. The module advances
the frames; the SVG itself should have no animation. With reduced motion active,
the first sleeping frame is displayed without animation.

All 21 cells must be present, but they need not be 21 unique drawings. Repeating
a drawing within a pair is acceptable for an intentionally still pose. It is
also possible to mirror suitable movement drawings when the character's design
allows it.

## Drawing guidance

Keep the character, tail, accessories, and effects inside each frame. The sheet
has no gaps to protect against artwork spilling into the adjacent frame.

Keep a consistent ground line and body position between paired poses. Deliberate
walking motion is fine; accidental shifts make the character appear to jump.
Preview diagonals as well as horizontal movement.

For classic pixel art, use integer coordinates and square-edged shapes. Avoid
blur, smoothing, and fractional positioning. Check the artwork against a black
background and over both light and dark module content.

The module scales the same sheet to these sprite-box sizes:

| Scale | Display size per frame |
| --- | --- |
| 1 | 32 × 32 CSS pixels |
| 2 | 64 × 64 CSS pixels |
| 3 | 96 × 96 CSS pixels |
| 4 | 128 × 128 CSS pixels |

Transparent padding reduces the visible character's size within the box.
Changing the artwork does not change its speed, viewport boundaries, behavior,
or notifications.

## Supplying an SVG directly

An artist familiar with SVG can draw directly in the required sheet layout.
Use a self-contained file with explicit dimensions and a transparent background:

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     width="672" height="32"
     viewBox="0 0 672 32"
     shape-rendering="crispEdges">
  <!-- Frame 0: artwork within x=0..32, y=0..32 -->
  <g id="idle" transform="translate(0 0)">
    <!-- Draw the idle pose here. -->
  </g>
  <!-- Frame 1 starts at x=32; frame 20 starts at x=640. -->
  <!-- Supply the remaining 20 frames in the documented order. -->
</svg>
```

This is an empty structural example, not a usable sprite sheet. Use paths or
rectangles for the actual artwork. Keep fonts, scripts, external stylesheets,
linked images, and network resources out of the asset.

SVG supports colored shapes, although the current XBM converter emits only
black, white, and transparency. A PNG embedded inside an SVG remains raster
art; it does not become editable vector shapes merely by changing its container.

## Sharing and checking artwork

Share the sheet, a configuration example, attribution, and the artwork's license
or redistribution permission. Include its source where applicable. MMM-Neko's
code license does not grant rights to third-party artwork or characters.
Custom artwork is maintained by its author; it is not automatically added to
the module or downloaded from a gallery.

Before sharing, verify transparency, alignment, clipping, idle, grooming, both
sleep frames, and all eight walking directions at scales 1–4 in an ordinary
MagicMirror installation. Check the first sleep frame with
`reducedMotion: "always"`. Repeated frames are allowed, but the corresponding
action will be static; this option does not create missing animations.
