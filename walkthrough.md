# Walkthrough - Oddballz HD

A running log of notable changes. Newest first.

## Attract Mode (how-to-play demo)

An arcade-style demo that takes over the idle title screen after ~12 seconds,
teaches the game in three lessons, then loops back to the title. See the README for
what it shows; the notes below are the parts that were awkward to get right.

- **It plays the real game.** The demo issues the same calls a player's keypresses
  would (`moveOBall`, `transform`, `rotColors`, `updateContinuous`), so the physics,
  match detection and bursts are genuine. Only the *inputs* are scripted.
- **Readability before the burst.** The piece is held in place once landed and every
  ball about to pop is highlighted (pulsed and lifted slightly toward the camera).
  A large lift looked wrong at this camera angle — it slid balls off their hex and
  opened a visible gap — so the emphasis is mostly scale.
- **Chains are staged.** Balls dropping into a cleared line can complete another
  line. Those are shown one line at a time with their own caption rather than
  bursting invisibly, and never highlighted together with a different-coloured line.
- **The board is solved, not repainted mid-demo.** Colour constraints for all three
  lessons are resolved once when the heap is generated. Solving them per-lesson made
  balls visibly change colour between lessons, which read as balls appearing from
  nowhere.
- **The piece adapts to the board.** Where a lesson's non-matching balls could
  complete an unintended line, their colours are chosen to suit the current heap
  rather than repainting the heap to suit them.
- **The gravity lesson is guaranteed clean.** It simulates its own drop until it can
  prove the falling ball cannot land in a match — otherwise the ball vanishes in a
  clear and the lesson teaches the wrong thing.
- **Variety is deliberate.** A fresh random heap per run (density and column heights
  both vary), and second matches are allowed rather than suppressed — an earlier fix
  that forbade them removed every cascade and made each run identical.

## Housekeeping

- **Flattened the project.** The ES-module tree under `src/` was an out-of-sync
  duplicate that `index.html` never loaded; editing it changed nothing at runtime.
  Removed, with `style.css` moved to the project root. The game is now `index.html`
  + `oddballz-app.js` + `style.css`.
- **Fixed the audio toggles.** Turning Music or Master Sound off and on again from
  the Audio Options modal left the music silent until a new game started — the modal
  pauses the game, and the restart was gated on the game not being paused.
- **Fixed hanging balls / gaps after matches.** A renderer bug, not an engine one:
  `updateScene` could hand a single sphere mesh to two grid cells when a ball dropped
  into a cell another was leaving, blanking one of them.
- **Moved the desktop stats and Controls Guide panels** clear of the header bar,
  which they had been overlapping.

## Asset Cache-Busting

`index.html` links the CSS and JS with a `?v=N.N.N` query string, alongside
`Cache-Control` / `Pragma` / `Expires` meta headers. **Increment the version whenever
`oddballz-app.js` or `style.css` changes** — otherwise browsers and GitHub Pages
serve the cached copy and the change appears not to have worked at all.

## About & Credits

An `ℹ️ About & Credits` button in the header and start menu opens a glassmorphism
modal crediting Fred Kohler's early 1990s design and Brian Semotiuk's 1992 Windows
port, and confirming the original engine algorithms are preserved.

## Left Corner Tip Alignment & Mobile Camera Scaling

- The hexagonal grid slants by $-y \times 0.5$, so the leftmost corner tip
  (`y=11, x=4`) reaches $X = -8.75$ while the right edge reaches $+7.25$.
- `gridToWorld()` applies a `+1.25` horizontal shift, pulling that corner to
  $X = -7.50$, safely inside the visible bounds.
- `updateCameraFraming()` sets FOV and distance so portrait phones fit all six
  board corners with margin. **This maths is locked** — see `GEMINI.md`.
