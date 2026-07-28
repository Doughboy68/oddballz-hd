# Oddballz HD - Hex Puzzle Game Engine

A full 3D WebGL remake of the classic 1992 Oddballz hex puzzle game: the original
Borland Pascal engine faithfully ported to JavaScript, wrapped in Three.js sphere
rendering, metallic PBR materials, particle explosions and Web Audio sound.

Inspired by Fred Kohler's early 1990s design and Brian Semotiuk's 1992 Windows port.

## Quick Start

Double-click `index.html` to play in any browser — no build step, no server. The
Three.js and confetti libraries load from a CDN.

To run it with a dev server instead (hot reload, and reachable from a phone on the
same Wi-Fi):

```bash
npm install
npm run dev -- --host
```

## Controls

- **Move Piece**: <kbd>←</kbd> / <kbd>→</kbd> (or <kbd>A</kbd> / <kbd>D</kbd>)
- **Rotate Piece**: <kbd>↑</kbd> / <kbd>↓</kbd>
- **Flip X / Y**: <kbd>X</kbd> / <kbd>Y</kbd>
- **Cycle Colour Order**: <kbd>F</kbd>
- **Hard Drop (Zip)**: <kbd>Space</kbd>
- **Pause**: <kbd>P</kbd>
- **Start / Restart**: <kbd>Enter</kbd>

On-screen touch buttons mirror all of the above on mobile.

## Game Modes

1. **Colour Match (5+)** — clear 5 or more matching balls in a parallel line, or 3
   or more in a perpendicular line. Cycle the falling piece's colour order with
   <kbd>F</kbd> before it lands.
2. **Row Build** — fill complete edge-to-edge hex rows. A full row clears for big
   score multipliers.

## Attract Mode

If the title screen sits idle for ~12 seconds, an arcade-style demo takes over the
board and teaches the game in three lessons, then returns to the title and loops.
Any key or tap returns to the title; <kbd>Enter</kbd> starts a game straight from
the demo.

1. **Colour Match** — five in a row
2. **Colour Match** — three in a perpendicular line
3. **Support & Gravity** — an unsupported ball breaks off and falls

The lessons run back to back on one continuous board with no reset, and are driven
by the *real* engine: the demo calls the same `moveOBall()`, `transform()`,
`rotColors()` and `updateContinuous()` a player's keypresses would, so the falling,
landing, matching and bursting are all genuine gameplay rather than an animation.

Before each burst the piece is held in place and every ball about to pop is
highlighted, so the match is readable. Balls that drop into the gap and complete a
further line are shown afterwards as a captioned chain reaction, one line at a time.

## File Architecture

The game is deliberately flat — three files, no build step:

- `index.html` — markup, HUD, modals, and the asset links.
- `oddballz-app.js` — **all** the game code, as one standalone IIFE using the global
  `THREE`. Organised in six sections: hex math, engine logic, sound synthesis,
  particles, Three.js renderer, and the application controller (which also contains
  attract mode).
- `style.css` — all styling.

`vite.config.js` and `package.json` exist only for the optional dev server; the game
itself does not depend on them.

## Development Notes

- **Bump the cache-bust version when you change `oddballz-app.js` or `style.css`.**
  `index.html` links them as `?v=1.6.3`; incrementing it is what forces browsers (and
  GitHub Pages) to fetch the new file instead of a cached one. Without it your change
  may simply not load.
- The engine logic is a faithful port and is well tested — if balls appear to hang,
  vanish or leave gaps, suspect the renderer's mesh reuse before the engine.
- The mobile camera scaling and centering maths is deliberately locked; see
  `GEMINI.md`.

## Credits

Code and graphics/design copyright © Brian Semotiuk and Fred Kohler.
