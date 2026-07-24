# Classic Game Engine Baseline (`v1.0-classic-engine`)

This document serves as the permanent reference and baseline snapshot for the 1992 Pascal Oddballz Classic Game Engine in `oddballz-hd`.

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

## Engine Core Architecture
1. **Hexagonal Grid Geometry**:
   - `ballMap` grid coordinates `x: 4..20`, `y: 0..19`.
   - Grid boundary condition: `(y < 12 && x < y + 10) || (y > 11 && x > y - 8)`.
   - Spatial 3D conversion in `hexMath.js`: `worldX = (cx - cy * 0.5) * 1.0`, `worldY = -cy * 0.866`.
   - Initial piece spawn position `startPos`: `y = 3`.

2. **Game Engine Logic (`oddunitEngine.js`)**:
   - 50 difficulty levels (`levAttr`).
   - Tetramino-like shapes (`ballShapes`) with rotation (`rotCW`, `rotCCW`) and flip matrices (`flipX`, `flipY`).
   - Color cycling (`rotColors` / <kbd>F</kbd> key).
   - Hard drop zip (`zip`).
   - Hex support physics (`supported`) and gap dropping (`checkGaps`).
   - **Color Match Mode**: 5+ parallel line matches, 3+ perpendicular line matches.
   - **Row Build Mode**: Edge-to-edge row clears across middle, left, and right hex axes.

3. **3D WebGL Scene (`threeRenderer.js`)**:
   - Extruded 3D hex pedestals with glowing neon cell edges.
   - Metallic and crystal PBR sphere materials for 6 ball colors.
   - 3D perspective camera framed with complete visual clearance above the bottom controls bar.
   - Landing ghost piece projection.

4. **Particles & Audio (`particleSystem.js` & `soundEngine.js`)**:
   - Color-matched 3D explosion particle bursts on ball matches and row clears.
   - Trailing piece sparkles and level-up confetti.
   - Web Audio 16-bit sound synthesizer based on Pascal frequency tables.

5. **Controls & UI Layout**:
   - Dedicated flexbox page layout (`#appLayout`) placing `#bottomControlsBar` physically below `#canvasContainer`.
   - Auto-pausing on focus loss / window blur.
   - Modal dialogs for High Scores (viewable & dismissible via <kbd>Enter</kbd> or Close button while keeping the active game loop safely paused) and End Game confirmation.
