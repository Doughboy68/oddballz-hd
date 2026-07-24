# Walkthrough - Oddballz HD

Enhanced `d:/antigravity/oddballz-hd` with real-time 3D hexagonal gravity drop path animations, zip-speed fall physics for unsupported balls breaking off from locked shapes, smooth piece lock-in, full horizontal transformation precision, and ergonomic mobile UI button height scaling.

## Recent Enhancements

### 1. Mobile UI Vertical Button Scaling
- **Doubled Button Height**: Updated mobile styles in [style.css](file:///d:/antigravity/oddballz-hd/src/style.css) and [index.html](file:///d:/antigravity/oddballz-hd/index.html) to increase mobile touch button height from `38px` to `74px`.
- **Vertical Arcade Controller Layout**: Re-structured touch buttons into vertical target pads (`flex-direction: column`) with large icon glyphs (`1.35rem`) on top and bold labels (`0.76rem`) below for comfortable, mis-tap-free thumb tapping on mobile devices.

### 2. Shape Break-Apart Zip Drop Animation
- **Locked Shape Break-Apart**: When a falling piece locks onto the grid (`stamp()`), any of its 4 balls that are unsupported break off from the shape position.
- **Starting Position Alignment**: Newly detached shape balls initialize their 3D position directly at their break-off coordinates (`worldPath[0]`).
- **Visual Hex Path Zip Drop**: Unsupported balls rapidly glide through their exact hexagonal path waypoints `[p0, p1, ..., pN]` at zip speed ($35.0$ world units/sec) down to their supported bottom slot.

### 3. Clean Lock-In State Transition
- **No Blinking / Scale Pulsing**: When a piece lands and locks into `ballMap`, it smoothly transitions into static grid meshes without any scale pulsing or blinking.

### 4. Horizontal Transformation Precision Fix
- **Drift Resolution**: `transform()` adjusts floating coordinates (`targetFloatX` / `activeFloatPos`) using relative shift deltas ($\Delta X$, $\Delta Y$), eliminating leftward drift when pressing `Flip X` / `Flip Y` repeatedly while descending down-right.
