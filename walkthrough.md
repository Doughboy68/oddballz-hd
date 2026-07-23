# Walkthrough - Oddballz HD

Created a new, clean project in `d:/antigravity/oddballz-hd` featuring a full 3D rendering pipeline powered by Three.js, particle effects, ported hex game engine math from `oddballz-game.js`, and a polished glassmorphism UI.

## Accomplished Features

### 1. Hex Engine Core & Math Port
- **Spatial Hex Coordinates**: [hexMath.js](file:///d:/antigravity/oddballz-hd/src/engine/hexMath.js) maps standard 1992 grid positions `(x: 4..20, y: 0..19)` into 3D world space.
- **Engine Rules & Recent Updates**: [oddunitEngine.js](file:///d:/antigravity/oddballz-hd/src/engine/oddunitEngine.js) ports the complete game engine:
  - Updated piece spawn position (`startPos` tuned to `y: 3`).
  - 50 difficulty levels.
  - Tetramino-like hex piece shapes & transformation matrices (`rotCW`, `rotCCW`, `flipX`, `flipY`).
  - Color cycling (`rotColors` / <kbd>F</kbd> key).
  - Hard drop (<kbd>Space</kbd>).
  - Gravity drop physics & gap resolution (`checkGaps`).
  - Dual Modes: **Color Match** (5+ parallel, 3+ perpendicular) and **Row Build** (edge-to-edge row clears).
  - Score, level progression, and skill rating calculation.
- **16-Bit Audio Synthesizer & Focus Loss Protection**: [soundEngine.js](file:///d:/antigravity/oddballz-hd/src/engine/soundEngine.js) and [main.js](file:///d:/antigravity/oddballz-hd/src/main.js) generate retro Web Audio sound effects, automatically pausing audio and game state on window blur / tab focus loss.

### 2. Three.js 3D Sphere & Board Graphics
- **3D WebGL Scene**: [threeRenderer.js](file:///d:/antigravity/oddballz-hd/src/gfx/threeRenderer.js) renders high-definition glossy/crystalline PBR sphere meshes with dynamic key lighting, rim lighting, and a tracking point light.
- **3D Hex Board**: Extruded 3D hex pedestals with glowing neon cell borders.
- **Ghost Piece Landing Projection**: Semi-transparent preview showing where active pieces will land.

### 3. 3D Particle Systems & Visual Effects
- **Explosion Particles**: [particleSystem.js](file:///d:/antigravity/oddballz-hd/src/gfx/particleSystem.js) spawns color-matched 3D particle bursts on ball matches and row clears.
- **Active Piece Trails**: Sparkle trails follow falling pieces as they descend.
- **Level-Up Fanfare**: Confetti fireworks trigger on level up.

### 4. Glassmorphism HUD & Mobile Touch Controls
- **Standalone `file://` & HTTP Compatibility**: `index.html` and `oddballz-app.js` allow double-clicking `index.html` in File Explorer.
- **Touch & Mobile Controls**: Debounced pointer/touch controls with dedicated Flip button (<kbd>⇄ Flip</kbd>).
