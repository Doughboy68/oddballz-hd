# Walkthrough - Oddballz HD

A running log of notable changes. Newest first.

## Colour, Lighting and Animation (`v1.2`)

- **The palette was never the problem.** Balls looked faded, and green and cyan were
  hard to tell apart on a phone. Sampling the rendered pixels showed all six source
  colours are 100% saturation arriving on screen at 12–38%. ACES Filmic is a film
  curve that desaturates highlights by design. Switching to Linear fixed it; picking
  new hex values would have produced differently-named grey.
- **One constraint turned out to be imaginary.** Exposure was pinned at 0.7 because
  raising it collapsed hues together — but that was the *cyan rim light* squashing
  them, not the exposure. Once the rim went white the constraint was gone, and it
  took several commits to notice. Exposure is now 1.0, which brightens the board and
  the balls together.
- **The cyan rim light was tinting everything.** About 5° toward green on every ball,
  which is why gold read as olive: it starts nearest the yellow–green boundary and
  had the least headroom. White rim, and hue error dropped to at most 5° across all
  six.
- **The shiny board was ACES's shadow lift**, not the material. Chasing it by
  brightening the tile face was wrong twice over — it flattens the surface, and past
  a board luminance of ~53 the dark balls go *negative* against it. Exposure plus a
  cooler, lower-roughness, higher-metalness material is what brought it back.
- **The falling piece is lit per ball, not per piece.** One light at the centre gave a
  single round cyan pool whatever the piece was made of. Four lights, each in its own
  ball's colour, take the shape of the piece and reflect what is actually falling.
- **Those lights sit *behind* their ball**, between ball and board. In front they lit
  the camera-facing side and the piece flared — 52% of its pixels blown against a 16%
  baseline. Behind, the baseline is untouched, and that headroom is what lets the
  brightness go high enough to see at all.
- **Settled balls breathe via material colour, not emissive.** Emissive has almost no
  leverage on balls dominated by scene lighting: sweeping it 0 → 1.6 moved a ball
  about 11 luminance, and the first attempt's swing measured 0.4. The pulse also has
  to breathe *downward*, since the balls sit near the top of the range and a visible
  brightening pulse hit 100% clipped.
- **Per-object light isolation does not exist in Three.js r128.** A board-only cyan
  light, so the surface could keep its character while the balls kept their corrected
  colours, was built and measured and thrown away: once the camera can see the layer,
  the light hits everything.

## Board Widths (`v1.1`)

- **The bottom edge is selectable at 9, 12 or 18.** An integer multiplier only ever
  gives 9, 18, 27 — 12 needs a 4/3 ratio that is not integral on the grid — so the
  presets are the hexagon's six parameters directly, with `WORLD_SCALE` keeping every
  preset at the same world extent so the locked camera maths stays valid.
- **The parameters are not independent.** `2W = T + B + H - 2` must hold, or the
  hexagon grows extra full-width rows and reads as tilted. Scaling the six values and
  rounding each independently broke it: 12-wide gained one such row and 18-wide two.
- **The staging rows are masked, as the original had them.** Rows above the spawn row
  are still playable but not drawn, and balls are *clipped* rather than hidden so a
  piece slides into view instead of popping on.
- **Difficulty was rebalanced.** Six colours arrived at level 6, roughly 60 matches
  in, after which colour never changed again; it now arrives at level 12. Fall speed
  was uncapped and reached 6.9× by level 50; the slope is gentler with a ceiling, so
  the late game is demanding rather than a wall.
- Note `lDelay` in `levAttr` is dead data — assigned to `pauseTime` and never read.
  Real fall speed comes from the `baseSpeed` line in `updateContinuous`.

## Layout on Tablets

Three separate bugs, all the same shape: a fix written for one form of the layout was
locked inside a `max-width` block, so phones got it and nothing wider did.

- **iPad cut off the touch controls.** `#appLayout` used `height: 100vh`, which on iOS
  Safari is the toolbar-*hidden* height, so the bar sat under the browser chrome. The
  `dvh` fix already existed — below 600px only, and every iPad is 744px or wider.
- **The board was clipped off both edges in portrait.** The fov expression
  `42 / (aspect * 1.15)` holds horizontal coverage constant only while
  `tan(fov/2) ≈ fov/2`. True at phone aspects (0.2% off), 6% short at tablet ones.
  Replaced with the exact form, anchored so the iPhone value is unchanged.
- **The controls collapsed to one row of eight** once there was space, losing the
  thumb split. Now two rows of four at every size.
- The two floating side panels were narrowed and matched to each other so they clear
  the playfield; the board is centred, so unequal panels read as lopsided.

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
- One line of it was changed later, with explicit permission, because the portrait
  FOV approximated `tan(fov/2)` as `fov/2` and fell 6% short at tablet aspects,
  clipping the board off both edges on an iPad. It now uses the exact form,
  `2 * atan(MOBILE_H_COVERAGE / aspect)`, with the constant chosen so the iPhone
  value is unchanged to two decimal places. Nothing else in this maths has moved.
