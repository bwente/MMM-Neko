# Third-party notices

## Classic Neko pixels (public domain)

`assets/source/bitmaps/*.xbm` and `assets/source/bitmasks/*.xbm` are the classic
32 × 32 Neko bitmap and transparency-mask set from oneko. `assets/neko.svg`
is a lossless conversion of the selected frames, without redrawing or smoothing.

- Original xneko: **Masayuki Koba**.
- Modified to oneko by **Tatsuya Kato**, 1990.
- Source mirror: <https://github.com/cskaz/oneko-linux>, commit
  `c0e15088608950688e7ee7a06e4e151d439e22ca`.
- The cat bitmap/mask directories and selected dog frames are included. No BSD
  daemon, Sakura, Tomoyo, or other alternate skins are included.
- The original Japanese README is preserved verbatim as
  `assets/source/README.oneko` (ISO-2022-JP). Its final paragraph identifies
  the program as public-domain software (PDS).
- Debian's separate copyright review identifies the general oneko files as
  public domain and cites that README and the original LSM. Its complete record
  is preserved in `assets/source/debian-copyright.txt`, retrieved 2026-09-16 from
  <https://metadata.ftp-master.debian.org/changelogs/main/o/oneko/oneko_1.2.sakura.6-15_copyright>.

These assets retain their public-domain status; the project's MIT license does
not replace it. Run `npm run build:assets` to reproduce the bundled sheet from
the preserved XBM sources using `scripts/build-sprites.js`.

## Classic oneko dog pixels (public domain)

`assets/source/dog/bitmaps/*_dog.xbm` and
`assets/source/dog/bitmasks/*_dog_mask.xbm` contain the selected original dog
frames from the same pinned source commit above. `assets/dog.svg` is their
lossless conversion using the same reproducible build script.

The upstream `README-NEW`, preserved as `assets/source/README-NEW.oneko`, credits
**John Lerchey** for the dog bitmaps and **Eric Anderson** for the original
program's dog support. No upstream C code is reused here. The dog files contain
no separate license notice; the preserved Debian copyright record's `Files: *`
public-domain coverage applies to them. This asset review is separate from the
MIT license on this module's original code. The dog pixels retain their
public-domain status.

## Code review and reuse decision

[adryd325/oneko.js](https://github.com/adryd325/oneko.js) was inspected for its
behavior and sprite approach. Its JavaScript is MIT licensed, copyright 2022
adryd. Its repository license alone was not treated as proof of the historic
pixels' licensing. No oneko.js source code or GIF is bundled or adapted here.

The module's JavaScript, CSS, converter, tests, and documentation are original
MIT-licensed work, copyright 2026 Brian Wente. The behavior engine was written
for autonomous motion and MagicMirror lifecycle handling. No original oneko C
code is included.
