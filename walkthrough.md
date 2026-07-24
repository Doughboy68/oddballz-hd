# Walkthrough - Oddballz HD

Enhanced `d:/antigravity/oddballz-hd` with real-time 3D hexagonal gravity drop path animations, zip-speed fall physics for unsupported balls breaking off from locked shapes, smooth piece lock-in, full horizontal transformation precision, ergonomic mobile UI button height scaling, geometric left-tip alignment, a dedicated About & Credits modal, and automated cache-busting headers.

## Recent Enhancements

### 1. Asset Cache-Busting & Anti-Caching Meta Headers
- **HTML Meta Tags**: Added `Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, and `Expires: 0` to `<head>` in [index.html](file:///d:/antigravity/oddballz-hd/index.html).
- **Version Query Strings**: Appended `?v=1.0.4` query parameters to CSS and JS file imports (`./src/style.css?v=1.0.4` and `./oddballz-app.js?v=1.0.4`). Whenever a new update is released, incrementing `v=1.0.5` forces browsers and CDNs (e.g. GitHub Pages) to immediately download fresh assets instead of serving stale cached files.

### 2. Dedicated About & Credits Interface
- **Title Bar & Start Menu Buttons**: Added an `ℹ️ About & Credits` button to the main header bar and start menu in [index.html](file:///d:/antigravity/oddballz-hd/index.html).
- **Non-Wrapping Name Styling**: Applied `white-space: nowrap` styling around **Fred Kohler** and **Brian Semotiuk** across all modal paragraphs and taglines so names never break onto separate lines.
- **Comprehensive Credits Modal**: Opens a glassmorphism modal containing full historical attribution:
  - Mentions design inspiration by **Fred Kohler** (early 1990s).
  - Attributes original Windows 1992 game engine implementation to **Brian Semotiuk**.
  - Confirms preservation of original engine algorithms and hexagonal strategy.
  - Displays explicit copyright notice: *Code and graphics/design copyright &copy; Brian Semotiuk and Fred Kohler.*

### 3. Left Corner Tip Alignment & Mobile Camera Scaling
- **Slanted Geometry Correction**: Because the hexagonal grid slants by $-y \times 0.5$, the leftmost corner tip (`y=11, x=4`) extends to $X = -8.75$, whereas the rightmost edge reaches $+7.25$.
- **Rightward Offset (+1.25)**: Updated `gridToWorld()` ([hexMath.js](file:///d:/antigravity/oddballz-hd/src/engine/hexMath.js#L29-L41) and [oddballz-app.js](file:///d:/antigravity/oddballz-hd/oddballz-app.js#L19-L26)) with a `+1.25` horizontal shift, pulling the left corner tip to $X = -7.50$ safely inside the visible screen bounds.
- **Mobile Portrait Framing**: Adjusted camera FOV and distance in `updateCameraFraming()` so portrait mobile screens (iPhone & Android) fit all 6 hexagonal board corners comfortably with margin to spare.
