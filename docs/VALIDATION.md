# Validation record

Validated on 2026-09-16 using a clean, unmodified MagicMirror² **2.32.0** checkout
(`62b0f7f26ec9531aafa91c2020c452ae2ae9d307`) in server-only mode on macOS 15.7.7
(Apple Silicon), Node **24.19.0**, and headless Chromium **151.0.7922.34**.
Only standard `clock`, `helloworld`, and `MMM-Neko` were configured. No companion
modules were present. Runtime dependencies were installed using
`npm ci --omit=dev --omit=optional --ignore-scripts` in the temporary MagicMirror
checkout. Its startup system-information probe reported the separately installed
Node 20.17.0; the server itself was launched with the explicit Node 24.19.0 binary.

## Verified

- Default configuration moves autonomously without any pointer events.
- Bundled sprite sheet renders transparently with crisp pixels at 1024 × 600.
- The screenshot in this directory comes from that running installation,
  before adding the temporary interaction-test control.
- Real browser hit testing reaches a button directly under the cat. Mouse
  click, emulated touch tap, and keyboard Enter activate that underlying button.
- Optional mouse-following and emulated primary touch targets start movement.
- Notifications travel through MagicMirror's actual `sendNotification` API.
- `NEKO_GO_TO_REGION` reaches the occupied `top_left` region's center and uses
  the viewport anchor for the empty `top_right` region.
- Invalid mode payloads leave the current mode unchanged.
- Show/hide, pause/resume, and MagicMirror's own `hide()`/`show()` work.
- Live reduced-motion changes stop/restart animation; reduced motion ignores input.
- Viewport resize clamps the sprite even while paused.
- Decorative DOM is aria-hidden, with no controls or focusable descendants.
- Explicit teardown removes the overlay; no browser JavaScript errors occurred.
- No Neko asset or script requests leave the local server.

The dependency-free unit suite additionally verifies sleep/wake timing,
autonomous state transitions, target bounds (including zero/tiny viewports),
speed, stall clamping, strict configuration/payload validation, passive listeners,
document visibility, pause-gate composition, timer uniqueness, repeated starts,
continuous pointer animation, region payload validation, trip priority and
cancellation, queued region commands, and removal of every listener on teardown.
All 16 unit tests and the browser integration check pass.

## Reproduce

1. Check out standard MagicMirror 2.32.0 in a separate directory and install its
   server dependencies with a supported Node version (22.14+ for that release).
2. Copy or symlink this module into its `modules/MMM-Neko` directory.
3. For that disposable installation only, copy
   `test/fixtures/magicmirror.config.js` to `config/config.js`, and create an empty
   `css/custom.css`. Never replace a personal installation's configuration.
4. Start `node serveronly` in the MagicMirror directory.
5. Run `npm run check` here. With Playwright and its Chromium available in a
   separate development environment, run `node scripts/browser-check.js` here.
   `NODE_PATH` can point to that environment's `node_modules`.

The browser check overwrites the screenshot after successfully observing default
autonomous movement. Its temporary button is browser DOM only; it does not
modify modules on disk.

## Not verified

Physical touchscreens, Raspberry Pi performance, Electron kiosk rendering,
third-party page managers/themes, and MagicMirror releases
other than 2.32.0 have not been tested. Touch validation used Chromium emulation.
Document visibility cleanup is covered by deterministic lifecycle tests, not a
physical kiosk sleep/wake cycle. GitHub Actions results are available in the
repository's Actions tab and are separate from the local runtime validation above.
