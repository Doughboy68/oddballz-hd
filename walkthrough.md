# Walkthrough - Oddballz HD

Enhanced `d:/antigravity/oddballz-hd` with real-time 3D hexagonal gravity drop path animations, zip-speed fall physics for unsupported balls breaking off from locked shapes, smooth piece lock-in, and full horizontal transformation precision.

## Recent Enhancements

### 1. Shape Break-Apart Zip Drop Animation
- **Locked Shape Break-Apart**: When a falling piece locks onto the grid (`stamp()`), any of its 4 balls that are unsupported break off from the shape position.
- **Starting Position Alignment**: Fixed a bug where newly detached shape balls teleported to the bottom because they didn't exist in static mesh cache. They now initialize their 3D position directly at their break-off coordinates (`worldPath[0]`).
- **Visual Hex Path Zip Drop**: Unsupported balls rapidly glide through their exact hexagonal path waypoints `[p0, p1, ..., pN]` at zip speed ($35.0$ world units/sec) down to their supported bottom slot.

### 2. Clean Lock-In State Transition
- **No Blinking / Scale Pulsing**: When a piece lands and locks into `ballMap`, it smoothly transitions into static grid meshes without any scale pulsing or blinking.

### 3. Horizontal Transformation Precision Fix
- **Drift Resolution**: `transform()` adjusts floating coordinates (`targetFloatX` / `activeFloatPos`) using relative shift deltas ($\Delta X$, $\Delta Y$), eliminating leftward drift when pressing `Flip X` / `Flip Y` repeatedly while descending down-right.
