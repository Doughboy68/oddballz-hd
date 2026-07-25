/**
 * OddUnitEngine.js - Port of ODDUNIT.PAS / oddunit.js (1992 Engine)
 * Handles hex board state, piece falling, matching algorithms, scoring, and level progression.
 */

import { isInBoard, moveInDirection } from './hexMath.js';

export class OddUnitEngine {
  constructor() {
    this.levAttr = [
      { lDelay: 100, lShapes: 2, lColors: 3 },
      { lDelay: 100, lShapes: 2, lColors: 4 },
      { lDelay: 100, lShapes: 3, lColors: 4 },
      { lDelay: 100, lShapes: 3, lColors: 5 },
      { lDelay: 100, lShapes: 4, lColors: 5 },
      { lDelay: 100, lShapes: 4, lColors: 6 },
      { lDelay: 100, lShapes: 5, lColors: 6 },
      { lDelay: 100, lShapes: 5, lColors: 6 },
      { lDelay: 100, lShapes: 6, lColors: 6 },
      { lDelay: 100, lShapes: 7, lColors: 6 },
      { lDelay: 100, lShapes: 7, lColors: 6 },
      { lDelay: 98,  lShapes: 7, lColors: 6 },
      { lDelay: 95,  lShapes: 7, lColors: 6 },
      { lDelay: 93,  lShapes: 7, lColors: 6 },
      { lDelay: 90,  lShapes: 7, lColors: 6 },
      { lDelay: 88,  lShapes: 7, lColors: 6 },
      { lDelay: 85,  lShapes: 7, lColors: 6 },
      { lDelay: 83,  lShapes: 7, lColors: 6 },
      { lDelay: 80,  lShapes: 7, lColors: 6 },
      { lDelay: 78,  lShapes: 7, lColors: 6 },
      { lDelay: 76,  lShapes: 7, lColors: 6 },
      { lDelay: 74,  lShapes: 7, lColors: 6 },
      { lDelay: 72,  lShapes: 7, lColors: 6 },
      { lDelay: 70,  lShapes: 7, lColors: 6 },
      { lDelay: 68,  lShapes: 7, lColors: 6 },
      { lDelay: 66,  lShapes: 7, lColors: 6 },
      { lDelay: 64,  lShapes: 7, lColors: 6 },
      { lDelay: 62,  lShapes: 7, lColors: 6 },
      { lDelay: 60,  lShapes: 7, lColors: 6 },
      { lDelay: 59,  lShapes: 7, lColors: 6 },
      { lDelay: 58,  lShapes: 7, lColors: 6 },
      { lDelay: 57,  lShapes: 7, lColors: 6 },
      { lDelay: 56,  lShapes: 7, lColors: 6 },
      { lDelay: 55,  lShapes: 7, lColors: 6 },
      { lDelay: 54,  lShapes: 7, lColors: 6 },
      { lDelay: 53,  lShapes: 7, lColors: 6 },
      { lDelay: 52,  lShapes: 7, lColors: 6 },
      { lDelay: 51,  lShapes: 7, lColors: 6 },
      { lDelay: 50,  lShapes: 7, lColors: 6 },
      { lDelay: 49,  lShapes: 7, lColors: 6 },
      { lDelay: 48,  lShapes: 7, lColors: 6 },
      { lDelay: 47,  lShapes: 7, lColors: 6 },
      { lDelay: 46,  lShapes: 7, lColors: 6 },
      { lDelay: 45,  lShapes: 7, lColors: 6 },
      { lDelay: 42,  lShapes: 7, lColors: 6 },
      { lDelay: 40,  lShapes: 7, lColors: 6 },
      { lDelay: 35,  lShapes: 7, lColors: 6 },
      { lDelay: 30,  lShapes: 7, lColors: 6 },
      { lDelay: 25,  lShapes: 7, lColors: 6 },
      { lDelay: 20,  lShapes: 7, lColors: 6 }
    ];

    // Grid row specifications for Row Building mode
    this.midRow = [
      { x: 12, y: 19 }, { x: 11, y: 18 }, { x: 10, y: 17 }, { x: 9, y: 16 },
      { x: 8, y: 15 }, { x: 7, y: 14 }, { x: 6, y: 13 }, { x: 5, y: 12 },
      { x: 4, y: 11 }, { x: 4, y: 10 }, { x: 4, y: 9 }, { x: 4, y: 8 },
      { x: 4, y: 7 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }
    ];

    this.rtRow = [
      { x: 20, y: 19 }, { x: 19, y: 19 }, { x: 18, y: 19 }, { x: 17, y: 19 },
      { x: 16, y: 19 }, { x: 15, y: 19 }, { x: 14, y: 19 }, { x: 13, y: 19 },
      { x: 12, y: 19 }
    ];

    this.ltRow = [
      { x: 12, y: 19 }, { x: 13, y: 19 }, { x: 14, y: 19 }, { x: 15, y: 19 },
      { x: 16, y: 19 }, { x: 17, y: 19 }, { x: 18, y: 19 }, { x: 19, y: 19 },
      { x: 20, y: 19 }
    ];

    // Falling Piece Shape definitions (rel coordinates)
    this.ballShapes = [
      [{ x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }],
      [{ x: -1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }],
      [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
      [{ x: -1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 0 }],
      [{ x: -1, y: -1 }, { x: -2, y: -1 }, { x: 1, y: 0 }],
      [{ x: -1, y: 0 }, { x: -2, y: -1 }, { x: -2, y: -2 }],
      [{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 1 }]
    ];

    // Transformation Matrices (RotCW, RotCCW, FlipX, FlipY)
    this.rotCCW = [
      [{ x: -2, y: 0 }, { x: -2, y: -1 }, { x: -2, y: -2 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
      [{ x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: -1, y: -2 }, { x: 0, y: 0 }],
      [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2 }],
      [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 1, y: -1 }],
      [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 }]
    ];

    this.rotCW = [
      [{ x: 0, y: -2 }, { x: 1, y: -1 }, { x: 2, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
      [{ x: -1, y: -2 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 0 }],
      [{ x: -2, y: -2 }, { x: -1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
      [{ x: 0, y: 0 }, { x: -2, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 2 }],
      [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: -2, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 2 }]
    ];

    this.flipY = [
      [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
      [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 0 }],
      [{ x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      [{ x: 0, y: 0 }, { x: -2, y: -1 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }],
      [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: -2, y: -2 }, { x: -1, y: -2 }, { x: 0, y: -2 }]
    ];

    this.flipX = [
      [{ x: 0, y: -2 }, { x: -1, y: -2 }, { x: -2, y: -2 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
      [{ x: 1, y: -1 }, { x: 0, y: -1 }, { x: -1, y: -1 }, { x: -2, y: -1 }, { x: 0, y: 0 }],
      [{ x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -2, y: 0 }],
      [{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }],
      [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }]
    ];

    this.startPos = [
      { x: 6, y: 3 }, { x: 7, y: 3 }, { x: 8, y: 3 }, { x: 9, y: 3 }
    ];

    // State Variables
    this.matcher = true; // Color matching default
    this.level = 1;
    this.score = 0;
    this.skill = 1;
    this.ballCount = 0;
    this.rows = 0;
    this.rowCount = 0;
    this.matchesDone = 0;
    this.levCol = 0;
    this.shapes = 2;
    this.colors = 3;
    this.pauseTime = 100;
    this.direction = 2; // Default drop direction (2: down-left, 5: down-right)
    this.endGame = false;

    this.colorInc = [0, 0, 0, 0, 0];
    this.colorCount = [0, 0, 0, 0];
    this.matchCount = 0;
    this.sameBonus = 0;

    // BallMap 2D array [0..24][0..23] storing ball colors (0 = empty, 1..6 = color index)
    this.ballMap = [];
    this.oddballz = {
      image: [0, 0, 0, 0],
      map: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
      rel: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]
    };

    // Callback event handlers
    this.onPlaySound = null;
    this.onPopBalls = null;

    this.initEngine();
  }

  initEngine() {
    this.ballMap = [];
    for (let x = 0; x <= 24; x++) {
      this.ballMap[x] = [];
      for (let y = 0; y <= 23; y++) {
        this.ballMap[x][y] = { inMap: false, bzMap: 0 };
      }
    }

    for (let x = 4; x <= 20; x++) {
      for (let y = 0; y <= 19; y++) {
        if (isInBoard(x, y)) {
          this.ballMap[x][y].inMap = true;
        }
      }
    }

    this.initGame();
  }

  initGame() {
    this.eraseBallMap();
    this.level = 1;
    this.score = 0;
    this.skill = 1;
    this.ballCount = 0;
    this.rows = 0;
    this.rowCount = 0;
    this.matchesDone = 0;
    this.matchCount = 0;
    this.sameBonus = 0;
    this.endGame = false;

    const attr = this.levAttr[this.level - 1];
    this.shapes = attr.lShapes;
    this.pauseTime = attr.lDelay;
    this.colors = attr.lColors;

    this.initColorInc();
  }

  initColorInc() {
    this.colorInc[0] = 1;
    for (let i = 0; i <= 3; i++) {
      let temp = 1;
      for (let j = 0; j <= i; j++) {
        temp *= this.colors;
      }
      temp += 1;
      this.colorInc[i + 1] = temp;
      this.colorCount[i] = 0;
    }
  }

  eraseBallMap() {
    for (let x = 4; x <= 20; x++) {
      for (let y = 0; y <= 19; y++) {
        this.ballMap[x][y].bzMap = 0;
      }
    }
  }

  checkInMap(pts) {
    if (pts.x < 0 || pts.x > 24 || pts.y < 0 || pts.y > 23) return false;
    return this.ballMap[pts.x][pts.y].inMap;
  }

  build() {
    this.direction = Math.random() < 0.5 ? 5 : 2;
    const numAvailableShapes = Math.min(7, Math.max(1, this.shapes));
    const config = Math.floor(Math.random() * numAvailableShapes) % 7;
    const pos = Math.floor(Math.random() * 4);

    if (this.matcher) {
      for (let i = 0; i <= 3; i++) {
        if (i === 0) {
          this.oddballz.image[i] = (this.colorCount[i] % this.colors) + 1;
        } else {
          this.oddballz.image[i] = (Math.floor(this.colorCount[i] / (this.colorInc[i] - 1)) % this.colors) + 1;
        }
        this.colorCount[i] += this.colorInc[i];
      }
    } else {
      const sameColor = config < 6 ? config + 1 : Math.floor(Math.random() * 6) + 1;
      for (let i = 0; i <= 3; i++) {
        this.oddballz.image[i] = sameColor;
      }
    }

    this.oddballz.map[0].x = this.startPos[pos].x;
    this.oddballz.map[0].y = this.startPos[pos].y;
    this.oddballz.rel[0].x = 0;
    this.oddballz.rel[0].y = 0;

    for (let i = 1; i <= 3; i++) {
      const shapeOffset = (this.ballShapes[config] && this.ballShapes[config][i - 1]) ? this.ballShapes[config][i - 1] : { x: 0, y: 0 };
      this.oddballz.rel[i].x = shapeOffset.x;
      this.oddballz.rel[i].y = shapeOffset.y;
      this.oddballz.map[i].x = this.oddballz.map[0].x + shapeOffset.x;
      this.oddballz.map[i].y = this.oddballz.map[0].y + shapeOffset.y;
    }

    this.activeFloatPos = {
      x: this.oddballz.map[0].x,
      y: this.oddballz.map[0].y
    };
    this.targetFloatX = this.oddballz.map[0].x;

    this.activeRel = [];
    this.targetRel = [];
    for (let i = 0; i <= 3; i++) {
      this.activeRel[i] = { x: this.oddballz.rel[i].x, y: this.oddballz.rel[i].y };
      this.targetRel[i] = { x: this.oddballz.rel[i].x, y: this.oddballz.rel[i].y };
    }

    this.isZipping = false;
    this.ballCount++;
  }

  /**
   * Continuous Trajectory Downward Motion & Sub-Pixel Smooth Steering
   */
  updateContinuous(dt) {
    if (this.endGame || !this.oddballz || !this.activeFloatPos) return false;

    // Smooth Lerp Steering Float X towards targetFloatX
    const steerLerpSpeed = Math.min(1.0, dt * 18.0);
    this.activeFloatPos.x += (this.targetFloatX - this.activeFloatPos.x) * steerLerpSpeed;

    // Smooth Lerp Relative Offsets for Rotations/Flips
    const rotLerpSpeed = Math.min(1.0, dt * 24.0);
    if (this.activeRel && this.targetRel) {
      for (let i = 0; i <= 3; i++) {
        this.activeRel[i].x += (this.targetRel[i].x - this.activeRel[i].x) * rotLerpSpeed;
        this.activeRel[i].y += (this.targetRel[i].y - this.activeRel[i].y) * rotLerpSpeed;
      }
    }

    const baseSpeed = 1.0 + (this.level - 1) * 0.12;
    const speed = this.isZipping ? 35.0 : baseSpeed;

    // Direction 2 = down-left (Y+1), Direction 5 = down-right (X+1, Y+1)
    const isDownRight = this.direction === 5;

    const curFloatY = this.activeFloatPos.y;
    let nextFloatY = curFloatY + speed * dt;

    // --- Per-step collision: check each integer row the piece would cross this frame ---
    const curRowY = Math.floor(curFloatY);
    const nextRowY = Math.floor(nextFloatY);
    let landingRowY = -1; // -1 = no collision this frame

    outerLoop:
    for (let gy = curRowY + 1; gy <= nextRowY + 1; gy++) {
      // For direction 5, X advances proportionally with Y from the float position
      const rootXAtRow = isDownRight
        ? Math.round(this.targetFloatX + (gy - curFloatY))
        : Math.round(this.targetFloatX);

      for (let i = 0; i <= 3; i++) {
        const relX = this.targetRel ? Math.round(this.targetRel[i].x) : this.oddballz.rel[i].x;
        const relY = this.targetRel ? Math.round(this.targetRel[i].y) : this.oddballz.rel[i].y;
        const testX = rootXAtRow + relX;
        const testY = gy + relY;
        if (!this.checkInMap({ x: testX, y: testY }) || this.ballMap[testX][testY].bzMap !== 0) {
          landingRowY = gy - 1; // land on the row above the blocker
          break outerLoop;
        }
      }
    }

    if (landingRowY !== -1) {
      const targetX = isDownRight
        ? Math.round(this.targetFloatX + (landingRowY - curFloatY))
        : Math.round(this.targetFloatX);
      const targetY = landingRowY;

      this.activeFloatPos.x = targetX;
      this.activeFloatPos.y = targetY;
      this.targetFloatX = targetX;

      for (let i = 0; i <= 3; i++) {
        const rx = this.targetRel ? Math.round(this.targetRel[i].x) : this.oddballz.rel[i].x;
        const ry = this.targetRel ? Math.round(this.targetRel[i].y) : this.oddballz.rel[i].y;
        this.oddballz.rel[i].x = rx;
        this.oddballz.rel[i].y = ry;
        this.oddballz.map[i].x = targetX + rx;
        this.oddballz.map[i].y = targetY + ry;
        if (this.activeRel) {
          this.activeRel[i].x = rx;
          this.activeRel[i].y = ry;
        }
        if (this.targetRel) {
          this.targetRel[i].x = rx;
          this.targetRel[i].y = ry;
        }
      }

      this.stamp();
      if (this.onPlaySound) this.onPlaySound('drop');

      if (this.matcher) {
        this.checkMatches();
      }

      this.checkAdvance();

      if (this.checkGameOver()) {
        return true;
      } else {
        this.build();
      }
      return true;
    }

    // No collision — advance smoothly
    this.activeFloatPos.y = nextFloatY;
    if (isDownRight) {
      this.activeFloatPos.x += speed * dt;
      this.targetFloatX += speed * dt;
    }

    const curY = Math.round(this.activeFloatPos.y);
    const rootX = Math.round(this.targetFloatX !== undefined ? this.targetFloatX : Math.round(this.activeFloatPos.x));

    for (let i = 0; i <= 3; i++) {
      const rx = this.targetRel ? Math.round(this.targetRel[i].x) : this.oddballz.rel[i].x;
      const ry = this.targetRel ? Math.round(this.targetRel[i].y) : this.oddballz.rel[i].y;
      this.oddballz.map[i].x = rootX + rx;
      this.oddballz.map[i].y = curY + ry;
    }

    return false;
  }

  transform(tMatrix) {
    const rootX = Math.round(this.targetFloatX !== undefined ? this.targetFloatX : (this.activeFloatPos ? this.activeFloatPos.x : this.oddballz.map[0].x));
    const rootY = Math.round(this.activeFloatPos ? this.activeFloatPos.y : this.oddballz.map[0].y);
    const origMap = this.oddballz.map.map(p => ({ x: p.x, y: p.y }));

    let transable = true;
    const saveMove = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    let finalRootX = rootX;
    let finalRootY = rootY;

    if (tMatrix === this.rotCW) {
      for (let i = 0; i <= 3; i++) {
        const rx = this.oddballz.rel[i].x;
        const ry = this.oddballz.rel[i].y;
        saveMove[i] = { x: rx - ry, y: rx };
      }
    } else if (tMatrix === this.rotCCW) {
      for (let i = 0; i <= 3; i++) {
        const rx = this.oddballz.rel[i].x;
        const ry = this.oddballz.rel[i].y;
        saveMove[i] = { x: ry, y: ry - rx };
      }
    } else if (tMatrix === this.flipX || tMatrix === this.flipY) {
      const rawReflect = [];
      for (let i = 0; i <= 3; i++) {
        const rx = this.oddballz.rel[i].x;
        const ry = this.oddballz.rel[i].y;
        const mx = rx + 2, my = ry + 2;
        if (mx < 0 || mx > 4 || my < 0 || my > 4) { transable = false; break; }
        rawReflect[i] = { x: tMatrix[my][mx].x, y: tMatrix[my][mx].y };
      }
      if (!transable) return false;

      const candidateShifts = [
        { sx: 0, sy: 0 },
        { sx: -1, sy: 0 },
        { sx: 1, sy: 0 },
        { sx: 0, sy: -1 },
        { sx: 0, sy: 1 }
      ];

      let maxOverlap = -1;
      let minDisp = Infinity;
      let bestShift = null;

      for (const { sx, sy } of candidateShifts) {
        const testRootX = rootX + sx;
        const testRootY = rootY + sy;
        let valid = true;

        for (let i = 0; i <= 3; i++) {
          const px = testRootX + rawReflect[i].x;
          const py = testRootY + rawReflect[i].y;
          const isSelfCell = origMap.some(op => op.x === px && op.y === py);
          if (!this.checkInMap({ x: px, y: py }) || (!isSelfCell && this.ballMap[px][py].bzMap !== 0)) {
            valid = false;
            break;
          }
        }
        if (!valid) continue;

        let overlap = 0;
        for (let i = 0; i <= 3; i++) {
          const px = testRootX + rawReflect[i].x;
          const py = testRootY + rawReflect[i].y;
          if (origMap.some(op => op.x === px && op.y === py)) overlap++;
        }
        const disp = sx * sx + sy * sy;

        if (overlap > maxOverlap || (overlap === maxOverlap && disp < minDisp)) {
          maxOverlap = overlap;
          minDisp = disp;
          bestShift = { sx, sy };
        }
      }

      if (bestShift) {
        finalRootX = rootX + bestShift.sx;
        finalRootY = rootY + bestShift.sy;

        // Re-normalize saveMove so saveMove[0] is ALWAYS { x: 0, y: 0 }
        const s0x = rawReflect[0].x;
        const s0y = rawReflect[0].y;
        finalRootX += s0x;
        finalRootY += s0y;

        for (let i = 0; i <= 3; i++) {
          saveMove[i] = { x: rawReflect[i].x - s0x, y: rawReflect[i].y - s0y };
        }
      } else {
        transable = false;
      }
    } else {
      for (let i = 0; i <= 3; i++) {
        const rx = this.oddballz.rel[i].x;
        const ry = this.oddballz.rel[i].y;
        const mx = rx + 2, my = ry + 2;
        if (mx < 0 || mx > 4 || my < 0 || my > 4) { transable = false; break; }
        saveMove[i] = { x: tMatrix[my][mx].x, y: tMatrix[my][mx].y };
      }
    }

    if (transable) {
      for (let i = 0; i <= 3; i++) {
        const pts = {
          x: finalRootX + saveMove[i].x,
          y: finalRootY + saveMove[i].y
        };
        const isSelfCell = origMap.some(op => op.x === pts.x && op.y === pts.y);
        if (!this.checkInMap(pts) || (!isSelfCell && this.ballMap[pts.x][pts.y].bzMap !== 0)) {
          transable = false;
          break;
        }
      }
    }

    if (transable) {
      const origActiveRel = this.activeRel ? this.activeRel.map(r => ({ x: r.x, y: r.y })) : null;
      const shiftX = finalRootX - rootX;
      const shiftY = finalRootY - rootY;

      if (this.activeFloatPos) {
        this.activeFloatPos.x += shiftX;
        this.activeFloatPos.y += shiftY;
      }
      if (this.targetFloatX !== undefined) {
        this.targetFloatX += shiftX;
      }

      for (let i = 0; i <= 3; i++) {
        this.oddballz.rel[i].x = saveMove[i].x;
        this.oddballz.rel[i].y = saveMove[i].y;
        this.oddballz.map[i].x = finalRootX + saveMove[i].x;
        this.oddballz.map[i].y = finalRootY + saveMove[i].y;
        if (this.targetRel) {
          this.targetRel[i].x = saveMove[i].x;
          this.targetRel[i].y = saveMove[i].y;
        }
        if (this.activeRel && origActiveRel) {
          this.activeRel[i].x = origActiveRel[i].x;
          this.activeRel[i].y = origActiveRel[i].y;
        }
      }
    }
    return transable;
  }

  moveOBall(dir) {
    let moveable = true;
    const saveMove = [];

    const curX = Math.round(this.targetFloatX !== undefined ? this.targetFloatX : (this.activeFloatPos ? this.activeFloatPos.x : this.oddballz.map[0].x));
    const curY = Math.round(this.activeFloatPos ? this.activeFloatPos.y : this.oddballz.map[0].y);

    for (let i = 0; i <= 3; i++) {
      const relX = this.targetRel ? this.targetRel[i].x : this.oddballz.rel[i].x;
      const relY = this.targetRel ? this.targetRel[i].y : this.oddballz.rel[i].y;
      const pts = { x: curX + relX, y: curY + relY };
      moveInDirection(pts, dir);
      if (this.checkInMap(pts) && this.ballMap[pts.x][pts.y].bzMap === 0) {
        saveMove[i] = { x: pts.x, y: pts.y };
      } else {
        moveable = false;
        break;
      }
    }

    if (moveable) {
      if (dir === 1) {
        this.targetFloatX -= 1.0;
      } else if (dir === 4) {
        this.targetFloatX += 1.0;
      } else if (dir === 0) {
        this.targetFloatX -= 1.0;
        this.activeFloatPos.y -= 1.0;
      } else if (dir === 3) {
        this.targetFloatX += 1.0;
        this.activeFloatPos.y -= 1.0;
      }
      for (let i = 0; i <= 3; i++) {
        this.oddballz.map[i].x = saveMove[i].x;
        this.oddballz.map[i].y = saveMove[i].y;
      }
    }
    return moveable;
  }

  zip() {
    this.isZipping = true;
    if (this.onPlaySound) this.onPlaySound('zip');
  }

  /**
   * Calculates the projected landing coordinates of the active piece (ghost piece).
   */
  getGhostPositions() {
    const curFloatY = this.activeFloatPos ? this.activeFloatPos.y : (this.oddballz.map[0] ? this.oddballz.map[0].y : 0);
    const startRootY = Math.round(curFloatY);
    const isDownRight = this.direction === 5;
    const targetX = this.targetFloatX !== undefined ? this.targetFloatX : (this.oddballz.map[0] ? this.oddballz.map[0].x : 0);
    const startRootX = isDownRight ? Math.round(targetX + (startRootY - curFloatY)) : Math.round(targetX);

    const ghostMap = [];
    for (let i = 0; i <= 3; i++) {
      const relX = this.targetRel ? this.targetRel[i].x : this.oddballz.rel[i].x;
      const relY = this.targetRel ? this.targetRel[i].y : this.oddballz.rel[i].y;
      ghostMap[i] = { x: startRootX + relX, y: startRootY + relY };
    }

    let canMove = true;
    while (canMove) {
      const nextMap = [];
      for (let i = 0; i <= 3; i++) {
        const pts = { x: ghostMap[i].x, y: ghostMap[i].y };
        moveInDirection(pts, this.direction);
        // Allow moving into a cell occupied by the ghost piece itself (those cells are vacated this step)
        const isSelfCell = ghostMap.some(g => g.x === pts.x && g.y === pts.y);
        if (this.checkInMap(pts) && (isSelfCell || this.ballMap[pts.x][pts.y].bzMap === 0)) {
          nextMap[i] = pts;
        } else {
          canMove = false;
          break;
        }
      }
      if (canMove) {
        for (let i = 0; i <= 3; i++) {
          ghostMap[i] = nextMap[i];
        }
      }
    }
    return ghostMap;
  }

  rotColors() {
    if (!this.matcher) return;
    const saveColor = this.oddballz.image[0];
    for (let i = 0; i <= 2; i++) {
      this.oddballz.image[i] = this.oddballz.image[i + 1];
    }
    this.oddballz.image[3] = saveColor;
    if (this.onPlaySound) this.onPlaySound('click');
  }

  zip() {
    let zipBonus = false;
    if (this.moveOBall(this.direction)) {
      zipBonus = true;
    }
    while (this.moveOBall(this.direction)) {
      if (this.onPlaySound) this.onPlaySound('zip');
    }
    if (zipBonus) this.score += 1;
  }

  stamp() {
    for (let i = 0; i <= 3; i++) {
      const mx = this.oddballz.map[i].x;
      const my = this.oddballz.map[i].y;
      if (this.checkInMap({ x: mx, y: my })) {
        this.ballMap[mx][my].bzMap = this.oddballz.image[i];
      }
    }
  }

  supported(spts) {
    const p1 = { x: spts.x, y: spts.y };
    const p2 = { x: spts.x, y: spts.y };
    moveInDirection(p1, 2); // Down-Left
    moveInDirection(p2, 5); // Down-Right

    const empty1 = this.checkInMap(p1) && this.ballMap[p1.x][p1.y].bzMap === 0;
    const empty2 = this.checkInMap(p2) && this.ballMap[p2.x][p2.y].bzMap === 0;

    return !(empty1 && empty2);
  }

  checkGaps() {
    let noneDropped = true;
    let flipGate = true;

    if (!this.droppingPathsMap) this.droppingPathsMap = new Map();

    for (let y = 19; y >= 0; y--) {
      for (let x = 4; x <= 20; x++) {
        const startPts = { x: x, y: y };
        const saveColor = this.ballMap[x][y].bzMap;

        if (this.checkInMap(startPts) && saveColor !== 0) {
          if (!this.supported(startPts)) {
            noneDropped = false;
            let current = { x: x, y: y };
            let maxDrops = 25;
            const origKey = `${x}_${y}`;
            const hexPath = [{ x: x, y: y }];

            while (!this.supported(current) && maxDrops > 0) {
              maxDrops--;

              const p1 = { x: current.x, y: current.y };
              const p2 = { x: current.x, y: current.y };
              moveInDirection(p1, 2);
              moveInDirection(p2, 5);

              const canMove1 = this.checkInMap(p1) && this.ballMap[p1.x][p1.y].bzMap === 0;
              const canMove2 = this.checkInMap(p2) && this.ballMap[p2.x][p2.y].bzMap === 0;

              if (!canMove1 && !canMove2) {
                break;
              }

              let chosenTarget = null;
              if (flipGate) {
                chosenTarget = canMove1 ? p1 : p2;
              } else {
                chosenTarget = canMove2 ? p2 : p1;
              }
              flipGate = !flipGate;

              this.ballMap[current.x][current.y].bzMap = 0;
              current = chosenTarget;
              this.ballMap[current.x][current.y].bzMap = saveColor;
              hexPath.push({ x: current.x, y: current.y });
            }

            const targetKey = `${current.x}_${current.y}`;
            if (targetKey !== origKey) {
              let fullPath = hexPath;
              if (this.droppingPathsMap.has(origKey)) {
                const oldPathInfo = this.droppingPathsMap.get(origKey);
                fullPath = oldPathInfo.path.concat(hexPath.slice(1));
                this.droppingPathsMap.delete(origKey);
                this.droppingPathsMap.set(targetKey, { sourceKey: oldPathInfo.sourceKey, targetKey, path: fullPath });
              } else {
                this.droppingPathsMap.set(targetKey, { sourceKey: origKey, targetKey, path: fullPath });
              }
            }
          }
        }
      }
    }
    return noneDropped;
  }

  matchColors() {
    const matchList = [];

    const rowLength = (startPts, dir, saveColor) => {
      let sameCount = 1;
      let curr = { x: startPts.x, y: startPts.y };
      while (true) {
        moveInDirection(curr, dir);
        if (this.checkInMap(curr) && this.ballMap[curr.x][curr.y].bzMap === saveColor) {
          sameCount++;
        } else {
          break;
        }
      }
      return sameCount;
    };

    const add2List = (startPts, rdir, saveColor) => {
      this.matchesDone++;
      this.matchCount++;
      let curr = { x: startPts.x, y: startPts.y };
      while (this.checkInMap(curr) && this.ballMap[curr.x][curr.y].bzMap === saveColor) {
        matchList.push({ x: curr.x, y: curr.y, color: saveColor });
        moveInDirection(curr, rdir);
      }
    };

    for (let x = 4; x <= 20; x++) {
      for (let y = 0; y <= 19; y++) {
        const startPts = { x: x, y: y };
        const saveColor = this.ballMap[x][y].bzMap;

        if (this.checkInMap(startPts) && saveColor !== 0) {
          // Parallel directions (len >= 5)
          [4, 0, 3].forEach((dir, idx) => {
            const checkPrevDir = [1, 5, 2][idx];
            const prev = { x: x, y: y };
            moveInDirection(prev, checkPrevDir);
            if (!this.checkInMap(prev) || this.ballMap[prev.x][prev.y].bzMap !== saveColor) {
              const len = rowLength(startPts, dir, saveColor);
              if (len >= 5) {
                add2List(startPts, dir, saveColor);
                this.sameBonus += len - 3;
              }
            }
          });

          // Perpendicular directions (len >= 3)
          [11, 9, 10].forEach((dir, idx) => {
            const checkPrevDir = [6, 8, 7][idx];
            const prev = { x: x, y: y };
            moveInDirection(prev, checkPrevDir);
            if (!this.checkInMap(prev) || this.ballMap[prev.x][prev.y].bzMap !== saveColor) {
              const len = rowLength(startPts, dir, saveColor);
              if (len >= 3) {
                add2List(startPts, dir, saveColor);
                this.sameBonus += len - 2;
              }
            }
          });
        }
      }
    }

    if (matchList.length > 0) {
      if (this.onPopBalls) this.onPopBalls(matchList);
      for (const m of matchList) {
        this.ballMap[m.x][m.y].bzMap = 0;
      }
      if (this.onPlaySound) this.onPlaySound('pop');
    }

    return matchList.length;
  }

  rowFull(rPts, dir) {
    let curr = { x: rPts.x, y: rPts.y };
    do {
      if (this.ballMap[curr.x][curr.y].bzMap === 0) {
        return false;
      }
      moveInDirection(curr, dir);
    } while (this.checkInMap(curr));
    return true;
  }

  deleteRow(rPts, rdir, cdir) {
    this.rowCount++;
    let curr = { x: rPts.x, y: rPts.y };

    const rowCells = [];
    let p = { x: rPts.x, y: rPts.y };
    while (this.checkInMap(p)) {
      rowCells.push({ x: p.x, y: p.y, color: this.ballMap[p.x][p.y].bzMap });
      moveInDirection(p, rdir);
    }
    if (this.onPopBalls) this.onPopBalls(rowCells);
    if (this.onPlaySound) this.onPlaySound('pop');

    do {
      let colPts = { x: curr.x, y: curr.y };
      do {
        let x = colPts.x, y = colPts.y;
        moveInDirection(colPts, cdir);
        if (this.checkInMap(colPts)) {
          this.ballMap[x][y].bzMap = this.ballMap[colPts.x][colPts.y].bzMap;
        } else {
          this.ballMap[x][y].bzMap = 0;
        }
      } while (this.checkInMap(colPts) && this.ballMap[colPts.x][colPts.y].bzMap !== 0);

      moveInDirection(curr, rdir);
    } while (this.checkInMap(curr));
  }

  checkRows() {
    let noRows = true;
    let coldir = Math.random() < 0.5 ? 3 : 0;

    for (let r = 0; r <= 15; r++) {
      let rPts = { x: this.midRow[r].x, y: this.midRow[r].y };
      while (this.rowFull(rPts, 4)) {
        noRows = false;
        this.deleteRow(rPts, 4, coldir);
      }
    }

    for (let r = 0; r <= 8; r++) {
      let rPts = { x: this.ltRow[r].x, y: this.ltRow[r].y };
      while (this.rowFull(rPts, 0)) {
        noRows = false;
        this.deleteRow(rPts, 0, 3);
      }
    }

    for (let r = 0; r <= 8; r++) {
      let rPts = { x: this.rtRow[r].x, y: this.rtRow[r].y };
      while (this.rowFull(rPts, 3)) {
        noRows = false;
        this.deleteRow(rPts, 3, 0);
      }
    }

    return !noRows;
  }

  checkMatches() {
    let index = 0;
    let hasClearedRows = false;
    let noneDropped = false;

    do {
      if (this.matcher) {
        index = this.matchColors();
      } else {
        hasClearedRows = this.checkRows();
      }
      noneDropped = this.checkGaps();
    } while (index > 0 || hasClearedRows || !noneDropped);
  }

  checkAdvance() {
    if (this.levCol > 0) this.levCol--;

    if (this.rowCount > 0) {
      const cnt = Math.min(this.rowCount, 10);
      this.score += Math.pow(2, cnt);
      this.rows += this.rowCount;
      this.rowCount = 0;
    }

    if (this.matchCount > 0) {
      const cnt = Math.min(this.matchCount, 10);
      this.score += Math.pow(2, cnt);
      this.matchCount = 0;
      this.score += this.sameBonus;
      this.sameBonus = 0;
    }

    if (this.ballCount > 0) {
      this.skill = Math.floor((this.score * 10) / this.ballCount);
    }

    if ((this.matchesDone > 11 || this.rows > 5) && this.level < 50) {
      this.level++;
      this.matchesDone = 0;
      this.rows = 0;
      this.levCol = 5;
      if (this.onPlaySound) this.onPlaySound('levelup');

      const attr = this.levAttr[this.level - 1];
      this.shapes = attr.lShapes;
      this.pauseTime = attr.lDelay;
      this.colors = attr.lColors;
      this.initColorInc();
    }
  }

  checkGameOver() {
    for (let x = 4; x <= 12; x++) {
      for (let y = 0; y <= 3; y++) {
        if (this.checkInMap({ x: x, y: y }) && this.ballMap[x][y].bzMap !== 0) {
          this.endGame = true;
          if (this.onPlaySound) this.onPlaySound('gameover');
          return true;
        }
      }
    }
    return false;
  }
}
