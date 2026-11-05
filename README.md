# Gravity Defied Web

A community WebAssembly port of **Gravity Defied — Trial Racing**, playable in
modern browsers with keyboard and touch controls.

Based on [rgimad/gravity_defied_cpp](https://github.com/rgimad/gravity_defied_cpp),
the C++ and SDL2 port of Codebrew Software's 2004 J2ME game. This project focuses
on the browser experience and retains the upstream history and credits.

![Gravity Defied gameplay](screens/demo1.gif)

## Features

- Original game physics and built-in tracks, compiled to WebAssembly.
- Keyboard, standard gamepad, and on-screen controls with multi-touch support.
- Browser saves for settings and progress through IndexedDB.
- Static hosting with no backend; GitHub Actions builds and deploys the website.
- Native SDL2 builds remain available.

## Controls

| Key | Action |
| --- | --- |
| ↑ / W · ↓ / X | Accelerate / brake; navigate menus |
| ← / A · → / D | Lean backward / forward; change menu options |
| Enter / S | Select / confirm |
| Esc | Menu / back |

The QWERTY keys also form an eight-way pad, with **S** for confirm:

```text
Q ↖    W ↑    E ↗
A ←    S OK   D →
Z ↙    X ↓    C ↘
```

Q/E combine acceleration with leaning backward/forward; Z/C combine braking
with leaning backward/forward. These use physical QWERTY key positions when the
browser supplies them, including with Shift or a different keyboard layout.
Browser shortcuts using Ctrl, Cmd or Alt are preserved.

Hold a vertical and a horizontal direction together for a combined action,
for example **↑ + →** to accelerate and lean forward. On touchscreens, hold two
buttons at once. The original numeric keysets are not yet connected to desktop
or browser keyboard input.

### Controllers

Connect a USB or Bluetooth controller, then press a button to let the browser
recognize it. Use HTTPS or localhost and keep the game tab focused. Controllers
must expose the browser's `standard` Gamepad mapping; unmapped devices are
reported on the page rather than assigned guessed button positions.

| Controller control | Action |
| --- | --- |
| D-pad / left stick | Same four directions as the arrow keys; diagonals supported |
| RT / R2 | Accelerate |
| LT / L2 | Brake |
| Bottom face button (Xbox A / PlayStation ×) | Select / confirm |
| Right face button (Xbox B / PlayStation ○) / Start / Options | Menu / back |

The first connected controller with a standard mapping is used. The left stick
has a dead zone to prevent drift. Keyboard, touch and controller holds can be
combined. Disconnecting a controller releases its inputs; leaving the tab
releases all inputs. After returning to the tab, release the controller controls
before using them again.

The original loading screens take about six seconds. Saves belong to the site's
origin and browser profile; clearing site data removes them. Private browsing
may not retain progress.

## Build and play locally

Install the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html).
Version **4.0.23** is pinned in CI. From the project root:

```sh
source /path/to/emsdk/emsdk_env.sh
emcmake cmake -S . -B build-web -DCMAKE_BUILD_TYPE=Release
cmake --build build-web --parallel
python3 -m http.server 8000 --directory build-web
```

Open <http://localhost:8000>. Use HTTP(S), rather than opening `index.html` via
`file://`. Assets, fonts and built-in levels are embedded in the binary.
Asyncify lets the existing game and menu loops yield to the browser.

## Deploy

For GitHub Pages, ensure **Settings → Pages → Build and deployment → Source**
is set to **GitHub Actions** in your repository. Pushing to the repository's
default branch builds and publishes the website. For an empty repository, push
your initial commit first so that the workflow and default branch exist.
You can also run
the **Build** workflow manually from the default branch. Pull requests are built
without deploying. The deployment job reports the live URL; for a repository
named `LitoMore/gravity-defied-web`, the standard URL is
`https://litomore.github.io/gravity-defied-web/` once deployed.

The deployment uses GitHub's built-in `GITHUB_TOKEN`; no personal token or
`gh-pages` branch is needed. Keep the generated files together: their relative
URLs support the repository path on project Pages. CI checks these links, the
WASM file, and the source snapshot before uploading the deployment artifact.

If the first deployment reports that Pages is not configured, enable the source
above, then use **Actions → Build → Run workflow** on the default branch. The
**Deploy to GitHub Pages** job and its summary link show the deployment result.

The `GravityDefied-web` Actions artifact contains only the website files,
license, credits, build instructions, and a `source.tar.gz` snapshot of the exact
commit used for that build. It can also be extracted and uploaded to another
static host. Serve `.wasm` as `application/wasm`; cross-origin isolation headers
are not required. Do not publish the entire CMake build directory.

When deploying locally built files yourself, include `index.html`, `index.js`,
`index.wasm`, `input.js`, `LICENSE.md`, and `CREDITS.md` from `build-web/`, together with the
corresponding source and build instructions.

## Native builds

Install CMake 3.24+, a C++17 compiler, pkg-config, SDL2, SDL2_image and SDL2_ttf:

```sh
cmake -S . -B build-native -DCMAKE_BUILD_TYPE=Release
cmake --build build-native --parallel
./build-native/GravityDefied
```

A custom levels file can be passed as the first command-line argument. Ubuntu
and Windows cross-builds are also covered by CI.

## Contributing

Please open an issue or pull request in this repository. For browser bugs,
include the browser version, operating system, reproduction steps, and whether
you used keyboard or touch controls. For physics or track-loading changes,
check the upstream implementation as well.

Browser input tests run with Node.js 20+ via `node --test tests/web-input.test.cjs`.

A record-store regression test can be run without SDL:

```sh
c++ -std=c++17 src/tests/test_record_lifecycle.cpp src/rms/RecordEnumerationImpl.cpp -o /tmp/test-record-lifecycle
/tmp/test-record-lifecycle
```

## Credits and licensing

See [CREDITS.md](CREDITS.md) for the original game and C++ port authors, the
browser port changes, and third-party asset notes. The inherited
[LICENSE.md](LICENSE.md) contains the GNU GPL version 2 text; preserve the
upstream license and copyright notices when redistributing modified code.

The upstream README reserves rights to the original game name, logo and related
material to Codebrew Software. The imported assets do not have a complete
per-file license inventory; their redistribution terms still need verification.
This port does not grant additional rights to those assets or trademarks.

This project is not affiliated with or endorsed by Codebrew Software.
