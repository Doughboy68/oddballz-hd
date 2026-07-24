/**
 * HexMath.js - Hexagonal Grid Math & 3D Spatial Conversions
 * Original Oddballz 1992 grid geometry & coordinate conversions.
 */

export const BOARD_BOUNDS = {
  MIN_X: 4,
  MAX_X: 20,
  MIN_Y: 0,
  MAX_Y: 19
};

export const SPHERE_RADIUS = 0.45;
export const HEX_SPACING_X = 1.0;
export const HEX_SPACING_Y = 0.866; // sqrt(3)/2 for equilateral hex grid

/**
 * Checks if a grid coordinate (x, y) is inside the authentic hexagonal board boundary.
 */
export function isInBoard(x, y) {
  if (x < 4 || x > 20 || y < 0 || y > 19) return false;
  return (y < 12 && x < y + 10) || (y > 11 && x > y - 8);
}

/**
 * Converts grid coordinates (x, y) into 3D space (X, Y, Z).
 * Centered on (0, 0, 0) for the camera.
 */
export function gridToWorld(x, y, zOffset = 0) {
  // Center grid relative to board center (approx x=12, y=9.5)
  const cx = x - 12;
  const cy = y - 9.5;

  // Slanted hex alignment matching original game screen geometry:
  // Each row y moves down-left, with staggered x offsets. +1.25 shifts left corner tip safely onto screen.
  const worldX = (cx - cy * 0.5) * HEX_SPACING_X + 1.25;
  const worldY = -cy * HEX_SPACING_Y;
  const worldZ = zOffset;

  return { x: worldX, y: worldY, z: worldZ };
}

/**
 * 6 Hexagonal Directions mapping relative movement.
 */
export function moveInDirection(pts, dir) {
  switch (dir) {
    case 0: pts.x -= 1; pts.y -= 1; break; // Up-Left
    case 1: pts.x -= 1; break;             // Left
    case 2: pts.y += 1; break;             // Down-Left
    case 3: pts.y -= 1; break;             // Up-Right
    case 4: pts.x += 1; break;             // Right
    case 5: pts.x += 1; pts.y += 1; break; // Down-Right
    case 6: pts.x -= 2; pts.y -= 1; break;
    case 7: pts.x -= 1; pts.y += 1; break;
    case 8: pts.x += 1; pts.y += 2; break;
    case 9: pts.x -= 1; pts.y -= 2; break;
    case 10: pts.x += 1; pts.y -= 1; break;
    case 11: pts.x += 2; pts.y += 1; break;
  }
  return pts;
}
