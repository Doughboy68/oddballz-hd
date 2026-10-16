# Classic Game Engine Baseline (`v1.0-classic-engine`)

This document serves as the permanent reference and baseline snapshot for the 1994 Pascal Oddballz Classic Game Engine in `oddballz-hd`.

## Git Snapshot & Revert Command
- **Git Tag**: `v1.0-classic-engine`
- **Revert Command**:
  ```bash
  git checkout v1.0-classic-engine
  ```
  or to restore all files back to this baseline state:
  ```bash
  git reset --hard v1.0-classic-engine
  ```

> **Note on file layout.** This document was written when the code was split across
> an ES-module tree under `src/`. That tree was an out-of-sync duplicate that nothing
> loaded, and has been removed. Everything below now lives in the single standalone
> bundle `oddballz-app.js`, whose six sections map onto the old module names:
> hex math (1), engine logic (2), sound (3), particles (4), renderer (5), and the
> application controller (6). The architecture itself is unchanged.

> **What has changed since this snapshot.** The description below is left as the
> record of what `v1.0-classic-engine` was, and is still accurate for that tag. Later
> work diverged in these places — see `v1.1-board-widths` and
> `v1.2-colour-and-lighting`, whose tag annotations carry the reasoning:
>
> - **Grid coordinates are now a preset**, not fixed. The `x: 4..20, y: 0..19` and the
>   boundary condition below are the 9-wide "classic" entry in `BOARD_PRESETS`; 12- and
>   18-wide presets also exist, and `gridToWorld()` scales by `WORLD_SCALE` so all
>   three occupy the same world extent. `startPos` y and the spawn row scale with the
>   preset. The classic board's geometry itself is unchanged.
> - **Rows above the spawn row are masked** — still playable, not drawn.
> - **The neon cell edges are gone.** The hex wireframe was removed; cells read from
>   the gaps between them and the bevel. It was also the source of aliased cyan edges.
> - **Tone mapping is Linear, not ACES**, and the six ball colours were re-tuned to
>   suit it.
> - **The End Game confirmation modal is gone.** Pause's End Game goes straight to the
>   title screen.
> - The engine itself — `supported()`, `checkGaps()`, `matchColors()`, the shapes and
>   the transform matrices — is untouched. Only `levAttr`'s colour column and the fall
>   speed expression were retuned for difficulty.

## Engine Core Architecture
1. **Hexagonal Grid Geometry** (section 1, formerly `hexMath.js`):
   - `ballMap` grid coordinates `x: 4..20`, `y: 0..19`.
   - Grid boundary condition: `(y < 12 && x < y + 10) || (y > 11 && x > y - 8)`.
   - Spatial 3D conversion in `gridToWorld()`: `worldX = (cx - cy * 0.5) * 1.0 + 1.25`, `worldY = -cy * 0.866`.
   - Initial piece spawn position `startPos`: `y = 3`.

2. **Game Engine Logic** (section 2, formerly `oddunitEngine.js`):
   - 50 difficulty levels (`levAttr`).
   - Tetramino-like shapes (`ballShapes`) with rotation (`rotCW`, `rotCCW`) and flip matrices (`flipX`, `flipY`).
   - Color cycling (`rotColors` / <kbd>F</kbd> key).
   - Hard drop zip (`zip`).
   - Hex support physics (`supported`) and gap dropping (`checkGaps`).
   - **Color Match Mode**: 5+ parallel line matches, 3+ perpendicular line matches.
   - **Row Build Mode**: Edge-to-edge row clears across middle, left, and right hex axes.

3. **3D WebGL Scene** (section 5, formerly `threeRenderer.js`):
   - Extruded 3D hex pedestals with glowing neon cell edges.
   - Metallic and crystal PBR sphere materials for 6 ball colors.
   - 3D perspective camera framed with complete visual clearance above the bottom controls bar.
   - Landing ghost piece projection.

4. **Particles & Audio** (sections 4 & 3, formerly `particleSystem.js` & `soundEngine.js`):
   - Color-matched 3D explosion particle bursts on ball matches and row clears.
   - Trailing piece sparkles and level-up confetti.
   - Web Audio 16-bit sound synthesizer based on Pascal frequency tables.

5. **Controls & UI Layout**:
   - Dedicated flexbox page layout (`#appLayout`) placing `#bottomControlsBar` physically below `#canvasContainer`.
   - Auto-pausing on focus loss / window blur.
   - Modal dialogs for High Scores (viewable & dismissible via <kbd>Enter</kbd> or Close button while keeping the active game loop safely paused) and End Game confirmation.
