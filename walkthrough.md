# Walkthrough - Oddballz HD

Created a new, clean project in `d:/antigravity/oddballz-hd` featuring a full 3D rendering pipeline powered by Three.js, particle effects, ported hex game engine math from `oddballz-game.js`, and a polished glassmorphism UI.

## Accomplished Features

### 1. Dedicated Page Layout Architecture
- **Separated Viewport & Controls Bar**: Updated [index.html](file:///d:/antigravity/oddballz-hd/index.html) and [style.css](file:///d:/antigravity/oddballz-hd/src/style.css) to use a vertical flexbox layout (`#appLayout`).
- **Upper Canvas Viewport (`#canvasContainer`)**: Occupies `flex: 1` in the upper section of the screen.
- **Bottom Control Bar (`#bottomControlsBar`)**: Occupies `flex: 0 0 auto` physically **BELOW** the 3D playfield.
- **Zero Overlap**: The Three.js WebGL canvas is strictly bounded inside `#canvasContainer`, ensuring the 3D hex playfield and the control buttons bar never touch or overlap on any screen resolution or aspect ratio.

### 2. Hex Engine Core & Math Port
- **Spatial Hex Coordinates**: [hexMath.js](file:///d:/antigravity/oddballz-hd/src/engine/hexMath.js) maps standard 1992 grid positions `(x: 4..20, y: 0..19)` into 3D world space.
- **Engine Rules & Updates**: [oddunitEngine.js](file:///d:/antigravity/oddballz-hd/src/engine/oddunitEngine.js) ports the complete game engine:
  - Updated piece spawn position (`startPos` tuned to `y: 3`).
  - 50 difficulty levels.
  - Tetramino-like hex piece shapes & transformation matrices (`rotCW`, `rotCCW`, `flipX`, `flipY`).
  - Color cycling (`rotColors` / <kbd>F</kbd> key).
  - Hard drop (<kbd>Space</kbd>).
  - Dual Modes: **Color Match** (5+ parallel, 3+ perpendicular) and **Row Build** (edge-to-edge row clears).
  - Score, level progression, and skill rating calculation.
- **16-Bit Audio & Focus Loss Auto-Pause**: [soundEngine.js](file:///d:/antigravity/oddballz-hd/src/engine/soundEngine.js) and [main.js](file:///d:/antigravity/oddballz-hd/src/main.js) handle retro Web Audio synthesis and auto-pause when switching tabs or window focus.

### 3. End Game Confirmation Modal
- Added an **"End Game"** button to the pause menu overlay and a dedicated confirmation modal (`#dialogConfirmEnd`), letting users end active games cleanly and return to the main menu.
