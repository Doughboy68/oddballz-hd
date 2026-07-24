# Walkthrough - Oddballz HD

Enhanced `d:/antigravity/oddballz-hd` with real-time 3D hexagonal gravity drop path animations, zip-speed fall physics for unsupported balls breaking off from locked shapes, smooth piece lock-in, full horizontal transformation precision, ergonomic mobile UI button height scaling, geometric left-tip alignment, and a dedicated About & Credits modal with non-wrapping creator names.

## Recent Enhancements

### 1. Dedicated About & Credits Interface
- **Title Bar & Start Menu Buttons**: Added an `ℹ️ About & Credits` button to the main header bar and start menu in [index.html](file:///d:/antigravity/oddballz-hd/index.html).
- **Non-Wrapping Name Styling**: Applied `white-space: nowrap` styling around **Fred Kohler** and **Brian Semotiuk** across all modal paragraphs and taglines so names never break onto separate lines.
- **Comprehensive Credits Modal**: Opens a glassmorphism modal containing full historical attribution:
  - Mentions design inspiration by **Fred Kohler** (early 1990s).
  - Attributes original Windows 1992 game engine implementation to **Brian Semotiuk**.
  - Confirms preservation of original engine algorithms and hexagonal strategy.
  - Displays explicit copyright notice: *Code and graphics/design copyright &copy; Brian Semotiuk and Fred Kohler.*

### 2. Left Corner Tip Alignment & Mobile Camera Scaling
- **Slanted Geometry Correction**: Because the hexagonal grid slants by $-y \times 0.5$, the leftmost corner tip (`y=11, x=4`) extends to $X = -8.75$, whereas the rightmost edge reaches $+7.25$.
- **Rightward Offset (+1.25)**: Updated `gridToWorld()` ([hexMath.js](file:///d:/antigravity/oddballz-hd/src/engine/hexMath.js#L29-L41) and [oddballz-app.js](file:///d:/antigravity/oddballz-hd/oddballz-app.js#L19-L26)) with a `+1.25` horizontal shift, pulling the left corner tip to $X = -7.50$ safely inside the visible screen bounds.
- **Mobile Portrait Framing**: Adjusted camera FOV and distance in `updateCameraFraming()` so portrait mobile screens (iPhone & Android) fit all 6 hexagonal board corners comfortably with margin to spare.

### 3. Mobile UI Vertical Button Scaling
- **Doubled Button Height**: Updated mobile styles in [style.css](file:///d:/antigravity/oddballz-hd/src/style.css) and [index.html](file:///d:/antigravity/oddballz-hd/index.html) to increase mobile touch button height from `38px` to `74px`.
- **Vertical Arcade Controller Layout**: Re-structured touch buttons into vertical target pads (`flex-direction: column`) with large icon glyphs (`1.35rem`) on top and bold labels (`0.76rem`) below for comfortable, mis-tap-free thumb tapping on mobile devices.

### 4. Shape Break-Apart Zip Drop Animation
- **Locked Shape Break-Apart**: When a falling piece locks onto the grid (`stamp()`), any of its 4 balls that are unsupported break off from the shape position.
- **Starting Position Alignment**: Newly detached shape balls initialize their 3D position directly at their break-off coordinates (`worldPath[0]`).
- **Visual Hex Path Zip Drop**: Unsupported balls rapidly glide through their exact hexagonal path waypoints `[p0, p1, ..., pN]` at zip speed ($35.0$ world units/sec) down to their supported bottom slot.
