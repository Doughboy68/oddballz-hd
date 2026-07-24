# Oddballz HD - Hex Puzzle Game Engine

Full 3D WebGL remake of the classic 1992 Oddballz hex puzzle game engine with Three.js sphere rendering, metallic materials, particle explosion effects, and Web Audio 16-bit sound synthesis.

## Quick Start
Simply double-click `index.html` to open and play directly in any web browser!

## Controls
- **Move Piece**: Left / Right Arrow Keys (<kbd>←</kbd> / <kbd>→</kbd>) or <kbd>A</kbd> / <kbd>D</kbd>
- **Rotate Piece**: Up / Down Arrow Keys (<kbd>↑</kbd> / <kbd>↓</kbd>)
- **Flip X / Y**: <kbd>X</kbd> / <kbd>Y</kbd>
- **Cycle Color Order**: <kbd>F</kbd> key
- **Hard Drop (Zip)**: <kbd>Spacebar</kbd>
- **Pause**: <kbd>P</kbd>
- **Start / Restart**: <kbd>Enter</kbd>

## Game Modes
1. **Color Match (5+)**: Align 5+ matching colored balls in parallel lines or 3+ in perpendicular angles. Use the <kbd>F</kbd> key to cycle the order of falling colors before dropping!
2. **Row Build**: Fill complete edge-to-edge hex rows. When a full row is completed, it clears the entire line for big score multipliers!

## File Architecture
- `index.html`: Self-contained standalone application entry point.
- `src/engine/hexMath.js`: Hexagonal grid coordinate conversion & spatial math.
- `src/engine/oddunitEngine.js`: Complete 1992 Pascal game engine port.
- `src/engine/soundEngine.js`: Web Audio API sound synthesizer.
- `src/gfx/threeRenderer.js`: Three.js 3D WebGL renderer & PBR materials.
- `src/gfx/particleSystem.js`: 3D explosion & trailing particle FX.
- `src/main.js`: Main application entry point.
