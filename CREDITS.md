# Credits and provenance

## Original game

Gravity Defied — Trial Racing was originally developed by Codebrew Software in
2004 for J2ME.

- Tors Björn Henrik Johansson — system/game logic/interface, testing, level design.
- Set Elis Norman — graphics, physics, mathematics, system/tools programming, level design.
- Per David Jacobsson — physics programming, game graphics, level design.

These names and roles are retained from the upstream README. The original game
name, logo, brand and related rights belong to Codebrew Software, as stated
there. This project is not affiliated with or endorsed by Codebrew Software.

## C++ and SDL2 port

Source: <https://github.com/rgimad/gravity_defied_cpp>

- [rgimad](https://github.com/rgimad) — idea and coding.
- [AntonEvmenenko](https://github.com/AntonEvmenenko) — coding.
- [Max Logaev](https://github.com/mxlgv) — coding.

The original Git history and author attribution are retained. The upstream
LICENSE.md contains the GNU General Public License version 2 text and is
preserved here.

## Browser port

Maintained by [LitoMore](https://github.com/LitoMore).

Changes in this derivative include Emscripten build support, browser-friendly
yielding and SDL initialization, a responsive page with touch and standard gamepad controls,
IndexedDB saves, record-store lifecycle fixes, and web build/deployment workflows.
Consult the Git history for individual contributors and dates.

## Dependencies and imported assets

The port uses Emscripten and its SDL2, SDL2_image, SDL2_ttf, FreeType, HarfBuzz,
zlib and libpng ports. Their respective upstream licenses continue to apply;
the GPL text in this repository does not replace those dependency licenses.

The `assets/` directory, including images, `levels.mrg`, and
`FontSansSerif.ttf`, is inherited from the C++ port. The imported tree does not
include a complete per-file license or font provenance record. The upstream
README reserves original game branding and related rights to Codebrew Software.
Do not assume every asset has the same license as the C++ code. Verification of
asset redistribution terms remains outstanding.

`cmake/CMakeRC.cmake` and the build helpers are inherited from the C++ port.
Preserve any existing notices when modifying or redistributing them.
