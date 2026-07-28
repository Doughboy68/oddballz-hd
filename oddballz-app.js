/**
 * oddballz-app.js - Standalone Oddballz HD Game Engine
 * Compatible with direct file:// loading in browser & local web servers.
 * Uses global THREE and confetti.
 */

(function () {
  // --- 1. HEX MATH ---
  const BOARD_BOUNDS = { MIN_X: 4, MAX_X: 20, MIN_Y: 0, MAX_Y: 19 };
  const SPHERE_RADIUS = 0.45;
  const HEX_SPACING_X = 1.0;
  const HEX_SPACING_Y = 0.866;

  function isInBoard(x, y) {
    if (x < 4 || x > 20 || y < 0 || y > 19) return false;
    return (y < 12 && x < y + 10) || (y > 11 && x > y - 8);
  }

  function gridToWorld(x, y, zOffset = 0) {
    const cx = x - 12;
    const cy = y - 9.5;
    const worldX = (cx - cy * 0.5) * HEX_SPACING_X + 1.25;
    const worldY = -cy * HEX_SPACING_Y;
    const worldZ = zOffset;
    return { x: worldX, y: worldY, z: worldZ };
  }

  function moveInDirection(pts, dir) {
    switch (dir) {
      case 0: pts.x -= 1; pts.y -= 1; break;
      case 1: pts.x -= 1; break;
      case 2: pts.y += 1; break;
      case 3: pts.y -= 1; break;
      case 4: pts.x += 1; break;
      case 5: pts.x += 1; pts.y += 1; break;
      case 6: pts.x -= 2; pts.y -= 1; break;
      case 7: pts.x -= 1; pts.y += 1; break;
      case 8: pts.x += 1; pts.y += 2; break;
      case 9: pts.x -= 1; pts.y -= 2; break;
      case 10: pts.x += 1; pts.y -= 1; break;
      case 11: pts.x += 2; pts.y += 1; break;
    }
    return pts;
  }

  // --- 2. ENGINE LOGIC ---
  class OddUnitEngine {
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

      this.ballShapes = [
        [{ x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }],
        [{ x: -1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }],
        [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
        [{ x: -1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 0 }],
        [{ x: -1, y: -1 }, { x: -2, y: -1 }, { x: 1, y: 0 }],
        [{ x: -1, y: 0 }, { x: -2, y: -1 }, { x: -2, y: -2 }],
        [{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 1 }]
      ];

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

      this.matcher = true;
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
      this.direction = 2;
      this.endGame = false;

      this.colorInc = [0, 0, 0, 0, 0];
      this.colorCount = [0, 0, 0, 0];
      this.matchCount = 0;
      this.sameBonus = 0;

      this.ballMap = [];
      this.oddballz = {
        image: [0, 0, 0, 0],
        map: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
        rel: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]
      };

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
      this.oddballz.shapeConfig = config;

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

      // Initialize spawn position BEFORE any transform calls so collision checks use the correct position
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

      const rotCount = Math.floor(Math.random() * 6);
      for (let i = 0; i < rotCount; i++) this.transform(this.rotCW);
      if (Math.random() < 0.5) this.transform(this.flipX);

      // Re-sync activeFloatPos/targetFloatX/activeRel/targetRel after initial transforms so shape is crisp
      this.activeFloatPos.x = this.oddballz.map[0].x;
      this.activeFloatPos.y = this.oddballz.map[0].y;
      this.targetFloatX = this.oddballz.map[0].x;

      for (let i = 0; i <= 3; i++) {
        if (this.activeRel) {
          this.activeRel[i].x = this.oddballz.rel[i].x;
          this.activeRel[i].y = this.oddballz.rel[i].y;
        }
        if (this.targetRel) {
          this.targetRel[i].x = this.oddballz.rel[i].x;
          this.targetRel[i].y = this.oddballz.rel[i].y;
        }
      }

      this.isZipping = false;
      this.ballCount++;
    }

    updateContinuous(dt) {
      if (this.endGame || !this.oddballz || !this.activeFloatPos) return false;

      const steerLerpSpeed = Math.min(1.0, dt * 18.0);
      this.activeFloatPos.x += (this.targetFloatX - this.activeFloatPos.x) * steerLerpSpeed;

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
          if (this.activeFloatPos) this.activeFloatPos.y -= 1.0;
        } else if (dir === 3) {
          this.targetFloatX += 1.0;
          if (this.activeFloatPos) this.activeFloatPos.y -= 1.0;
        }
        for (let i = 0; i <= 3; i++) {
          this.oddballz.map[i].x = saveMove[i].x;
          this.oddballz.map[i].y = saveMove[i].y;
        }
      }
      return moveable;
    }

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
      this.isZipping = true;
      if (this.onPlaySound) this.onPlaySound('zip');
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
      moveInDirection(p1, 2);
      moveInDirection(p2, 5);

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
  }  // --- 3. SOUND SYNTHESIS (128-STEP AMIGA TRACKER GAME SOUNDTRACK) ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.musicEnabled = true;
      this.sfxEnabled = true;
      this.musicVolume = 0.7; // Default 70%
      this.sfxVolume = 1.0;   // Default 100%
      this.musicGain = null;
      this.sfxGain = null;
      this.freq = [25, 27, 28, 30, 32, 33, 35, 37, 39, 40, 42, 44, 45, 47, 49, 51, 52, 54, 56];
      this.bgmPlaying = false;
      this.bgmTimer = null;
      this.bgmStep = 0;
      this.bgmTempo = 76; // Deep, slow, floating cosmic space ambient tempo

      // Note frequency mapping (Complete 12-Tone Equal Temperament Across 6 Octaves)
      const C1 = 32.70, Cs1 = 34.65, D1 = 36.71, Eb1 = 38.89, Ds1 = 38.89, E1 = 41.20, F1 = 43.65, Fs1 = 46.25, G1 = 49.00, Ab1 = 51.91, A1 = 55.00, Bb1 = 58.27, B1 = 61.74;
      const C2 = 65.41, Cs2 = 69.30, D2 = 73.42, Eb2 = 77.78, Ds2 = 77.78, E2 = 82.41, F2 = 87.31, Fs2 = 92.50, G2 = 98.00, Ab2 = 103.83, A2 = 110.00, Bb2 = 116.54, B2 = 123.47;
      const C3 = 130.81, Cs3 = 138.59, D3 = 146.83, Eb3 = 155.56, Ds3 = 155.56, E3 = 164.81, F3 = 174.61, Fs3 = 185.00, G3 = 196.00, Ab3 = 207.65, A3 = 220.00, Bb3 = 233.08, B3 = 246.94;
      const C4 = 261.63, Cs4 = 277.18, D4 = 293.66, Eb4 = 311.13, Ds4 = 311.13, E4 = 329.63, F4 = 349.23, Fs4 = 369.99, G4 = 392.00, Ab4 = 415.30, A4 = 440.00, Bb4 = 466.16, B4 = 493.88;
      const C5 = 523.25, Cs5 = 554.37, D5 = 587.33, Eb5 = 622.25, Ds5 = 622.25, E5 = 659.25, F5 = 698.46, Fs5 = 739.99, G5 = 783.99, Ab5 = 830.61, A5 = 880.00, Bb5 = 932.33, B5 = 987.77;
      const C6 = 1046.50, Cs6 = 1108.73, D6 = 1174.66, Eb6 = 1244.51, Ds6 = 1244.51, E6 = 1318.51, F6 = 1396.91, Fs6 = 1479.98, G6 = 1567.98, A6 = 1760.00, B6 = 1975.53;

      // 128-Step Deep Space Sub-Bass Drones (Slow, continuous, non-repetitive swell)
      this.bassPattern = [
        E1, 0, 0, 0, 0, 0, 0, 0, E1, 0, 0, 0, 0, 0, 0, 0,
        C1, 0, 0, 0, 0, 0, 0, 0, C1, 0, 0, 0, 0, 0, 0, 0,
        D1, 0, 0, 0, 0, 0, 0, 0, D1, 0, 0, 0, 0, 0, 0, 0,
        B1, 0, 0, 0, 0, 0, 0, 0, E1, 0, 0, 0, 0, 0, 0, 0,
        E1, 0, 0, 0, 0, 0, 0, 0, G1, 0, 0, 0, 0, 0, 0, 0,
        C1, 0, 0, 0, 0, 0, 0, 0, A1, 0, 0, 0, 0, 0, 0, 0,
        D1, 0, 0, 0, 0, 0, 0, 0, Fs1,0, 0, 0, 0, 0, 0, 0,
        E1, 0, 0, 0, 0, 0, 0, 0, E1, 0, 0, 0, 0, 0, 0, 0
      ];

      // Occasional Lead Guitar Solos (Spaced out, floating, 3-second legato notes)
      this.guitarLeadPattern = [
        // Measure 1-2: Silence / Ambient Space Float
        0,   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0,   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        // Measure 3: Soaring E5 Lead Solo note enters and echoes into space
        E5,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        // Measure 4: B5 Solo swell
        B5,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        // Measure 5-6: Silence / Space Ambient Drift
        0,   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0,   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        // Measure 7: Soaring C6 -> D6 Solo Cry
        C6,  0, 0, 0, 0, 0, 0, 0, D6, 0, 0, 0, 0, 0, 0, 0,
        // Measure 8: High E6 Climax & Long Echo Dissipate
        E6,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ];

      // Warm Floating Ambient Space Pad Walls
      this.guitarPowerChords = [
        [E2, B2, E3, G3], [C2, G2, C3, E3], [D2, A2, D3, Fs3], [B1, Fs2, B2, D3],
        [E2, B2, E3, G3], [C2, G2, C3, E3], [D2, A2, D3, Fs3], [E2, B2, E3, G3]
      ];

      this.distortionCurve = this.makeDistortionCurve(16);
    }

    makeDistortionCurve(amount = 16) {
      const k = amount;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && !this.musicGain) {
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.ctx.destination);
        this.updateGains();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    updateGains() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const effectiveMusic = (this.enabled && this.musicEnabled) ? this.musicVolume : 0;
      const effectiveSFX = (this.enabled && this.sfxEnabled) ? this.sfxVolume : 0;

      if (this.musicGain) {
        this.musicGain.gain.setValueAtTime(effectiveMusic, now);
      }
      if (this.sfxGain) {
        this.sfxGain.gain.setValueAtTime(effectiveSFX, now);
      }
    }

    setMusicVolume(vol) {
      this.musicVolume = Math.max(0, Math.min(1, vol));
      this.updateGains();
    }

    setSFXVolume(vol) {
      this.sfxVolume = Math.max(0, Math.min(1, vol));
      this.updateGains();
    }

    setMusicEnabled(enabled) {
      this.musicEnabled = !!enabled;
      this.updateGains();
      if (!this.musicEnabled) {
        this.stopBGM();
      }
    }

    setSFXEnabled(enabled) {
      this.sfxEnabled = !!enabled;
      this.updateGains();
    }

    setMasterEnabled(enabled) {
      this.enabled = !!enabled;
      this.updateGains();
      if (!this.enabled) {
        this.stopBGM();
      }
    }

    startBGM() {
      if (this.bgmPlaying || !this.enabled || !this.musicEnabled) return;
      this.init();
      if (!this.ctx) return;
      this.bgmPlaying = true;
      this.bgmStep = 0;
      const stepDuration = 60 / this.bgmTempo / 4;
      this.bgmTimer = setInterval(() => {
        if (!this.bgmPlaying || !this.enabled || !this.musicEnabled || !this.ctx) return;
        this.playAmigaStep(this.bgmStep);
        this.bgmStep = (this.bgmStep + 1) % 128;
      }, stepDuration * 1000);
    }

    stopBGM() {
      this.bgmPlaying = false;
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    }

    playAmigaStep(step) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const stepInBar = step % 16;
      const barIndex = Math.floor(step / 16);
      const out = this.musicGain || this.ctx.destination;

      // 1. COSMIC AMBIENT PULSE & SOFT SPACE SHIMMER (No loud rhythmic drums!)
      if (stepInBar === 0 && (barIndex % 2 === 0)) {
        // Distant Sub-Space Pulse
        const pulseOsc = this.ctx.createOscillator();
        const pulseGain = this.ctx.createGain();
        pulseOsc.type = 'sine';
        pulseOsc.frequency.setValueAtTime(80, now);
        pulseOsc.frequency.exponentialRampToValueAtTime(22, now + 0.35);
        pulseGain.gain.setValueAtTime(0.20, now);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        pulseOsc.connect(pulseGain); pulseGain.connect(out);
        pulseOsc.start(now); pulseOsc.stop(now + 0.35);

        // Soft Solar Cymbal Shimmer
        const bufferSize = this.ctx.sampleRate * 0.50;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const crash = this.ctx.createBufferSource();
        crash.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 7000;
        const crashGain = this.ctx.createGain();
        crashGain.gain.setValueAtTime(0.04, now);
        crashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
        crash.connect(filter); filter.connect(crashGain); crashGain.connect(out);
        crash.start(now); crash.stop(now + 0.50);
      }

      // 2. CONTINUOUS SUB-BASS SPACE DRONE
      const bassFreq = this.bassPattern[step % this.bassPattern.length];
      if (bassFreq && bassFreq > 0) {
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(bassFreq * 0.5, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now); // Warm lowpass drone

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        osc.start(now); osc.stop(now + 0.30);
        subOsc.start(now); subOsc.stop(now + 0.30);
      }

      // 3. FLOATING SPACE AMBIENT PAD SWELLS (Sustaining 3.0 Seconds)
      if (stepInBar === 0) {
        const pChordIndex = barIndex % this.guitarPowerChords.length;
        const pChord = this.guitarPowerChords[pChordIndex];
        if (pChord) {
          for (const noteFreq of pChord) {
            const osc = this.ctx.createOscillator();
            const dist = this.ctx.createWaveShaper();
            const cabFilter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(noteFreq, now);
            dist.curve = this.distortionCurve;

            cabFilter.type = 'lowpass';
            cabFilter.frequency.setValueAtTime(1100, now); // Soft warm ambient pad filter

            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 3.00); // 3-second long ambient swell

            osc.connect(dist); dist.connect(cabFilter); cabFilter.connect(gain);
            gain.connect(out);
            osc.start(now); osc.stop(now + 3.00);
          }
        }
      }

      // 4. OCCASIONAL SOARING LEAD GUITAR SOLOS (3.5s Sustain + 450ms Space Echo Delay)
      const guitarNote = this.guitarLeadPattern[step % this.guitarLeadPattern.length];
      if (guitarNote && guitarNote > 0) {
        const dur = 3.50; // Long 3.5-second soaring lead sustain

        const oscRoot = this.ctx.createOscillator();
        const oscChorus = this.ctx.createOscillator();
        const distortion = this.ctx.createWaveShaper();
        const ampFilter = this.ctx.createBiquadFilter();
        const leadGain = this.ctx.createGain();
        const delayNode = this.ctx.createDelay();
        const delayFeedback = this.ctx.createGain();

        oscRoot.type = 'sawtooth';
        oscRoot.frequency.setValueAtTime(guitarNote, now);

        oscChorus.type = 'sawtooth';
        oscChorus.frequency.setValueAtTime(guitarNote * 1.004, now); // Warm chorus detune

        distortion.curve = this.distortionCurve;
        distortion.oversample = '4x';

        ampFilter.type = 'lowpass';
        ampFilter.frequency.setValueAtTime(1400, now);
        ampFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.50); // Soft legato swell
        ampFilter.Q.value = 1.6;

        leadGain.gain.setValueAtTime(0.09, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        // 450ms Space Echo Delay
        delayNode.delayTime.value = 0.45;
        delayFeedback.gain.value = 0.35;

        oscRoot.connect(distortion);
        oscChorus.connect(distortion);
        distortion.connect(ampFilter);
        ampFilter.connect(leadGain);

        leadGain.connect(out);
        leadGain.connect(delayNode);
        delayNode.connect(delayFeedback);
        oscRoot.start(now); oscRoot.stop(now + dur);
        oscChorus.start(now); oscChorus.stop(now + dur);
      }
    }

    playChimeTone(noteFreq, startTime, dur, vol = 0.05) {
      if (!this.ctx) return;
      const out = this.sfxGain || this.ctx.destination;
      const oscSine = this.ctx.createOscillator();
      const oscTri  = this.ctx.createOscillator();
      const lfo     = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const filter  = this.ctx.createBiquadFilter();
      const gain    = this.ctx.createGain();

      oscSine.type = 'sine';
      oscSine.frequency.setValueAtTime(noteFreq, startTime);
      oscSine.frequency.exponentialRampToValueAtTime(noteFreq * 1.008, startTime + dur);

      oscTri.type = 'triangle';
      oscTri.frequency.setValueAtTime(noteFreq * 1.002, startTime);

      lfo.frequency.value = 8;
      lfoGain.gain.value = 5;
      lfo.connect(oscSine.frequency);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, startTime);
      filter.frequency.exponentialRampToValueAtTime(2200, startTime + 0.10);
      filter.frequency.exponentialRampToValueAtTime(750, startTime + dur);
      filter.Q.value = 1.8;

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      oscSine.connect(filter);
      oscTri.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      lfo.start(startTime); lfo.stop(startTime + dur);
      oscSine.start(startTime); oscSine.stop(startTime + dur);
      oscTri.start(startTime);  oscTri.stop(startTime + dur);
    }

    playSound(type, param = 0) {
      if (!this.enabled || !this.sfxEnabled) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const out = this.sfxGain || this.ctx.destination;

      switch (type) {
        case 'click': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
          osc.connect(gain);
          gain.connect(out);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }
        case 'drop': {
          // Subtle Cushioned Socket Snap (Drop into Place)
          const fIndex = Math.min(Math.max(param, 0), this.freq.length - 1);
          const basePitch = 160 + (fIndex * 8); // Subtle 160Hz - 240Hz range
          const dur = 0.08;

          // Soft low-frequency cushioned seating thud
          const oscSine = this.ctx.createOscillator();
          const filter  = this.ctx.createBiquadFilter();
          const gain    = this.ctx.createGain();

          oscSine.type = 'sine';
          oscSine.frequency.setValueAtTime(basePitch * 1.3, now);
          oscSine.frequency.exponentialRampToValueAtTime(basePitch * 0.8, now + dur);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(500, now);
          filter.frequency.exponentialRampToValueAtTime(140, now + dur);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04, now + 0.005); // Very soft 0.04 volume
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          oscSine.connect(filter);
          filter.connect(gain);
          gain.connect(out);

          oscSine.start(now);
          oscSine.stop(now + dur);
          break;
        }
        case 'lock': {
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(440, now);
          osc1.frequency.exponentialRampToValueAtTime(880, now + 0.05);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(220, now);
          osc2.frequency.exponentialRampToValueAtTime(440, now + 0.05);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(out);

          osc1.start(now); osc1.stop(now + 0.06);
          osc2.start(now); osc2.stop(now + 0.06);
          break;
        }
        case 'land': {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(400, now);
          filter.frequency.exponentialRampToValueAtTime(100, now + 0.07);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.005, now + 0.07);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(out);

          osc.start(now); osc.stop(now + 0.07);
          break;
        }
        case 'pop': {
          // Multi-Variation Animated Ball Match Sound Engine (4 Randomized Patterns + Micro-detune)
          const color = Math.max(1, Math.min(6, param || 1));
          const basePitches = [523.25, 587.33, 659.25, 783.99, 880.00, 987.77];
          const detuneFactor = 0.97 + Math.random() * 0.06; // Random micro-detune +/- 3%
          const rootFreq = (basePitches[color - 1] || 523.25) * detuneFactor;

          // Pick 1 of 4 randomized chime variation styles
          const patternType = Math.floor(Math.random() * 4);
          const dur = 0.65;

          if (patternType === 0) {
            // Pattern A: Ascending Crystal Arpeggio (4 steps)
            const intervals = [1.0, 1.25, 1.5, 2.0];
            for (let i = 0; i < 4; i++) {
              const noteFreq = rootFreq * intervals[i];
              const startTime = now + i * 0.04;
              this.playChimeTone(noteFreq, startTime, dur, 0.05);
            }
          } else if (patternType === 1) {
            // Pattern B: Descending Space Echo Chime (4 steps)
            const intervals = [2.0, 1.5, 1.25, 1.0];
            for (let i = 0; i < 4; i++) {
              const noteFreq = rootFreq * intervals[i];
              const startTime = now + i * 0.045;
              this.playChimeTone(noteFreq, startTime, dur, 0.045);
            }
          } else if (patternType === 2) {
            // Pattern C: Simultaneous Harmonized Space Chord (3 notes together)
            const intervals = [1.0, 1.25, 1.5];
            for (let i = 0; i < 3; i++) {
              const noteFreq = rootFreq * intervals[i];
              this.playChimeTone(noteFreq, now, dur + 0.1, 0.04);
            }
          } else {
            // Pattern D: Pitch-Bending Glissando Chime (Bends up by 5th)
            const oscSine = this.ctx.createOscillator();
            const oscTri  = this.ctx.createOscillator();
            const filter  = this.ctx.createBiquadFilter();
            const gain    = this.ctx.createGain();

            oscSine.type = 'sine';
            oscSine.frequency.setValueAtTime(rootFreq * 0.8, now);
            oscSine.frequency.exponentialRampToValueAtTime(rootFreq * 1.5, now + 0.25);

            oscTri.type = 'triangle';
            oscTri.frequency.setValueAtTime(rootFreq * 1.0, now);
            oscTri.frequency.exponentialRampToValueAtTime(rootFreq * 1.875, now + 0.25);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now);
            filter.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
            filter.frequency.exponentialRampToValueAtTime(700, now + dur);
            filter.Q.value = 2.0;

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            oscSine.connect(filter); oscTri.connect(filter);
            filter.connect(gain); gain.connect(out);
            oscSine.start(now); oscSine.stop(now + dur);
            oscTri.start(now);  oscTri.stop(now + dur);
          }
          break;
        }
        case 'zip': {
          // Warm Lower-Register Animated Zip Tinkle (440Hz -> 880Hz with Filter & Pitch Animation)
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          const dur = 0.38; // 0.38s animated sustain

          // Smooth warm triangle/sine blend in mid-register (A4 -> A5)
          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(440, now);
          osc1.frequency.exponentialRampToValueAtTime(720, now + 0.12);
          osc1.frequency.exponentialRampToValueAtTime(880, now + dur);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(554.37, now); // Cs5 3rd harmony
          osc2.frequency.exponentialRampToValueAtTime(900, now + 0.12);
          osc2.frequency.exponentialRampToValueAtTime(1108.73, now + dur);

          // 12Hz Vibrato LFO for animated pitch shimmer
          lfo.frequency.value = 12;
          lfoGain.gain.value = 18;
          lfo.connect(osc1.frequency);
          lfo.connect(osc2.frequency);

          // Resonant Filter Animation Sweep (500Hz -> 1800Hz -> 600Hz)
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(500, now);
          filter.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
          filter.frequency.exponentialRampToValueAtTime(600, now + dur);
          filter.Q.value = 3.2;

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(out);

          lfo.start(now); lfo.stop(now + dur);
          osc1.start(now); osc1.stop(now + dur);
          osc2.start(now); osc2.stop(now + dur);
          break;
        }
        case 'levelup': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(1400, now + 0.4);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
          osc.connect(gain);
          gain.connect(out);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }
        case 'gameover': {
          this.stopBGM();
          // Epic Deep Space Minor Cadence & Weeping Guitar Lead Echo
          const dur = 1.80;

          // 1. Descending Minor Cadence Chords (Em -> Cm -> Am -> Low E0 Sub)
          const chordNotes = [329.63, 261.63, 220.00, 41.20]; // E4 -> C4 -> A3 -> E1
          for (let i = 0; i < chordNotes.length; i++) {
            const startTime = now + i * 0.35;
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(chordNotes[i], startTime);
            osc.frequency.exponentialRampToValueAtTime(chordNotes[i] * 0.95, startTime + 0.9);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, startTime);
            filter.frequency.exponentialRampToValueAtTime(250, startTime + 0.9);

            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.07, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.9);

            osc.connect(filter); filter.connect(gain); gain.connect(out);
            osc.start(startTime); osc.stop(startTime + 0.9);
          }

          // 2. Weeping Space Lead Echo Tail
          const leadOsc = this.ctx.createOscillator();
          const leadDist = this.ctx.createWaveShaper();
          const leadFilter = this.ctx.createBiquadFilter();
          const leadGain = this.ctx.createGain();
          const delayNode = this.ctx.createDelay();
          const delayFeedback = this.ctx.createGain();

          leadOsc.type = 'sawtooth';
          leadOsc.frequency.setValueAtTime(659.25, now); // E5 weeping bend
          leadOsc.frequency.exponentialRampToValueAtTime(523.25, now + 1.2); // Bend down to C5

          leadDist.curve = this.distortionCurve;

          leadFilter.type = 'lowpass';
          leadFilter.frequency.setValueAtTime(1400, now);
          leadFilter.frequency.exponentialRampToValueAtTime(400, now + dur);

          leadGain.gain.setValueAtTime(0.001, now);
          leadGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          delayNode.delayTime.value = 0.40;
          delayFeedback.gain.value = 0.30;

          leadOsc.connect(leadDist); leadDist.connect(leadFilter); leadFilter.connect(leadGain);
          leadGain.connect(out);
          leadGain.connect(delayNode);
          delayNode.connect(delayFeedback);
          delayFeedback.connect(delayNode);
          delayFeedback.connect(out);

          leadOsc.start(now); leadOsc.stop(now + dur);
          break;
        }
      }
    }
  }

  // --- 4. PARTICLE EFFECTS ---
  class ParticleSystem {
    constructor(scene) {
      this.scene = scene;
      this.particles = [];
      this.colorPalette = [
        new THREE.Color(0x38bdf8),
        new THREE.Color(0xf43f5e),
        new THREE.Color(0x10b981),
        new THREE.Color(0xf59e0b),
        new THREE.Color(0xa855f7),
        new THREE.Color(0xec4899)
      ];
    }

    spawnPopExplosion(worldPos, colorIndex = 1, count = 35) {
      const color = this.colorPalette[(colorIndex - 1) % this.colorPalette.length] || new THREE.Color(0xffffff);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = [];

      for (let i = 0; i < count; i++) {
        positions[i * 3] = worldPos.x;
        positions[i * 3 + 1] = worldPos.y;
        positions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.2;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 2.5 + Math.random() * 4.0;

        velocities.push(
          speed * Math.sin(phi) * Math.cos(theta),
          speed * Math.sin(phi) * Math.sin(theta),
          speed * Math.cos(phi) + 1.5
        );
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.PointsMaterial({
        color: color,
        size: 0.35,
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const pointCloud = new THREE.Points(geometry, material);
      this.scene.add(pointCloud);

      this.particles.push({ mesh: pointCloud, velocities, life: 1.0, decay: 1.4 });
    }

    spawnTrailParticle(worldPos, colorIndex = 1) {
      const color = this.colorPalette[(colorIndex - 1) % this.colorPalette.length] || new THREE.Color(0xffffff);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        worldPos.x + (Math.random() - 0.5) * 0.3,
        worldPos.y + (Math.random() - 0.5) * 0.3,
        worldPos.z + 0.1
      ]);

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: color,
        size: 0.15,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.8,
        depthWrite: false
      });

      const point = new THREE.Points(geometry, material);
      this.scene.add(point);
      this.particles.push({
        mesh: point,
        velocities: [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, Math.random() * 0.5],
        life: 0.4,
        decay: 2.0
      });
    }

    spawnLockSparks(worldPos, colorIndex = 1, count = 16) {
      const color = this.colorPalette[(colorIndex - 1) % this.colorPalette.length] || new THREE.Color(0xffffff);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = [];

      for (let i = 0; i < count; i++) {
        positions[i * 3] = worldPos.x;
        positions[i * 3 + 1] = worldPos.y;
        positions[i * 3 + 2] = worldPos.z + 0.1;

        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const speed = 1.8 + Math.random() * 2.2;
        velocities.push(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          1.2 + Math.random() * 1.5
        );
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: color,
        size: 0.22,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 1.0,
        depthWrite: false
      });

      const pointCloud = new THREE.Points(geometry, material);
      this.scene.add(pointCloud);
      this.particles.push({ mesh: pointCloud, velocities, life: 1.0, decay: 3.2 });
    }

    spawnLandDust(worldPos, count = 10) {
      const color = new THREE.Color(0xffffff);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = [];

      for (let i = 0; i < count; i++) {
        positions[i * 3] = worldPos.x;
        positions[i * 3 + 1] = worldPos.y;
        positions[i * 3 + 2] = worldPos.z;

        const angle = (i / count) * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.2;
        velocities.push(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.5 + Math.random() * 0.8
        );
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: color,
        size: 0.18,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.7,
        depthWrite: false
      });

      const pointCloud = new THREE.Points(geometry, material);
      this.scene.add(pointCloud);
      this.particles.push({ mesh: pointCloud, velocities, life: 1.0, decay: 3.5 });
    }

    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          this.particles.splice(i, 1);
          continue;
        }
        p.mesh.material.opacity = Math.max(0, p.life);
        const positions = p.mesh.geometry.attributes.position.array;
        for (let j = 0; j < positions.length / 3; j++) {
          positions[j * 3] += p.velocities[j * 3] * dt;
          positions[j * 3 + 1] += p.velocities[j * 3 + 1] * dt;
          positions[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;
          p.velocities[j * 3 + 1] -= 2.0 * dt;
        }
        p.mesh.geometry.attributes.position.needsUpdate = true;
      }
    }

    clearAll() {
      for (const p of this.particles) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
      this.particles = [];
    }
  }

  // --- 5. THREE.JS 3D RENDERER ---
  class ThreeRenderer {
    constructor(containerElement) {
      this.container = containerElement;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a0c16);
      this.scene.fog = new THREE.FogExp2(0x0a0c16, 0.025);

      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      const aspect = width / height;
      this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;

      this.container.appendChild(this.renderer.domElement);
      this.updateCameraFraming();

      this.ballMaterials = [];
      this.ghostMaterials = [];
      this.initMaterials();

      this.sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);

      this.boardGroup = new THREE.Group();
      this.ballsGroup = new THREE.Group();
      this.activeGroup = new THREE.Group();
      this.ghostGroup = new THREE.Group();

      this.scene.add(this.boardGroup);
      this.scene.add(this.ballsGroup);
      this.scene.add(this.activeGroup);
      this.scene.add(this.ghostGroup);

      this.initLights();
      this.build3DBoard();
      this.build3DStarfield();

      this.staticBallMeshes = new Map();
      window.addEventListener('resize', () => this.onWindowResize());
    }

    initMaterials() {
      const colors = [
        { main: 0x0099ff, roughness: 0.15, metalness: 0.35, emissive: 0x002266 }, // 1: Electric Azure Cyan-Blue
        { main: 0xff2a5f, roughness: 0.15, metalness: 0.30, emissive: 0x550011 }, // 2: Neon Ruby Red
        { main: 0x00f055, roughness: 0.18, metalness: 0.25, emissive: 0x005511 }, // 3: Vibrant Emerald Green
        { main: 0xffc107, roughness: 0.20, metalness: 0.40, emissive: 0x553300 }, // 4: Amber Gold
        { main: 0xb030ff, roughness: 0.15, metalness: 0.30, emissive: 0x330055 }, // 5: Electric Amethyst Purple
        { main: 0xff00b7, roughness: 0.15, metalness: 0.30, emissive: 0x550033 }  // 6: Hot Magenta
      ];

      colors.forEach(c => {
        const mat = new THREE.MeshStandardMaterial({
          color: c.main,
          roughness: c.roughness,
          metalness: c.metalness,
          emissive: c.emissive,
          emissiveIntensity: 0.25
        });

        const ghostMat = new THREE.MeshStandardMaterial({
          color: c.main,
          roughness: 0.5,
          metalness: 0.1,
          transparent: true,
          opacity: 0.3
        });

        this.ballMaterials.push(mat);
        this.ghostMaterials.push(ghostMat);
      });
    }

    initLights() {
      const ambientLight = new THREE.AmbientLight(0x1a2035, 1.2);
      this.scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
      dirLight.position.set(10, -15, 20);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 50;
      dirLight.shadow.camera.left = -15;
      dirLight.shadow.camera.right = 15;
      dirLight.shadow.camera.top = 15;
      dirLight.shadow.camera.bottom = -15;
      this.scene.add(dirLight);

      const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
      rimLight.position.set(-15, 10, 10);
      this.scene.add(rimLight);

      this.activePointLight = new THREE.PointLight(0x00f0ff, 3.0, 10);
      this.activePointLight.position.set(0, 0, 2);
      this.scene.add(this.activePointLight);
    }

    build3DBoard() {
      const hexRadius = 0.52;
      const hexShape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = hexRadius * Math.cos(angle);
        const y = hexRadius * Math.sin(angle);
        if (i === 0) hexShape.moveTo(x, y);
        else hexShape.lineTo(x, y);
      }

      const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
      const hexGeo = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
      const hexMat = new THREE.MeshStandardMaterial({ color: 0x141829, roughness: 0.6, metalness: 0.4, emissive: 0x070914, emissiveIntensity: 0.5 });
      const wireMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 });
      const edgeGeo = new THREE.EdgesGeometry(hexGeo);

      for (let x = 4; x <= 20; x++) {
        for (let y = 0; y <= 19; y++) {
          if (isInBoard(x, y)) {
            const wPos = gridToWorld(x, y, -0.25);
            const cellMesh = new THREE.Mesh(hexGeo, hexMat);
            cellMesh.position.set(wPos.x, wPos.y, wPos.z);
            cellMesh.receiveShadow = true;
            this.boardGroup.add(cellMesh);

            const wireFrame = new THREE.LineSegments(edgeGeo, wireMat);
            wireFrame.position.set(wPos.x, wPos.y, wPos.z);
            this.boardGroup.add(wireFrame);
          }
        }
      }

      // NO chassis plate — open hexagon grid floating cleanly in space!
    }

    updateScene(engine) {
      this.engine = engine;
      const currentKeys = new Set();
      const nextStaticMeshes = new Map();
      // Guard: a single mesh must never back two grid cells in one pass. This can
      // happen when a ball drops INTO a cell that another ball is dropping OUT of,
      // aliasing one sphere across two keys and leaving the other cell blank (gap/hang).
      const assignedMeshes = new Set();

      const droppingPathsMap = engine.droppingPathsMap || new Map();

      for (let x = 4; x <= 20; x++) {
        for (let y = 0; y <= 19; y++) {
          const val = engine.ballMap[x][y].bzMap;
          const key = `${x}_${y}`;

          if (val > 0) {
            currentKeys.add(key);
            const colorIdx = (val - 1) % this.ballMaterials.length;
            const mat = this.ballMaterials[colorIdx];
            const wPos = gridToWorld(x, y, SPHERE_RADIUS);

            let mesh = this.staticBallMeshes.get(key);

            if (!mesh && droppingPathsMap.has(key)) {
              const pathInfo = droppingPathsMap.get(key);
              const fromKey = pathInfo.sourceKey;

              const sourceMesh = this.staticBallMeshes.get(fromKey);
              if (sourceMesh && !assignedMeshes.has(sourceMesh)) {
                mesh = sourceMesh;
                this.staticBallMeshes.delete(fromKey);
                mesh.material = mat;
              } else {
                mesh = new THREE.Mesh(this.sphereGeo, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.ballsGroup.add(mesh);
              }

              mesh.worldPath = pathInfo.path.map(p => gridToWorld(p.x, p.y, SPHERE_RADIUS));
              mesh.pathIndex = 1;
              mesh.position.set(mesh.worldPath[0].x, mesh.worldPath[0].y, mesh.worldPath[0].z);
              mesh.targetPos = new THREE.Vector3(
                mesh.worldPath[mesh.worldPath.length - 1].x,
                mesh.worldPath[mesh.worldPath.length - 1].y,
                mesh.worldPath[mesh.worldPath.length - 1].z
              );
              mesh.isPathDropping = true;
            }

            if (!mesh) {
              mesh = new THREE.Mesh(this.sphereGeo, mat);
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.targetPos = new THREE.Vector3(wPos.x, wPos.y, wPos.z);
              mesh.position.set(wPos.x, wPos.y, wPos.z);
              this.ballsGroup.add(mesh);
            } else {
              mesh.material = mat;
              if (!mesh.isPathDropping) {
                mesh.targetPos.set(wPos.x, wPos.y, wPos.z);
              }
            }

            nextStaticMeshes.set(key, mesh);
            assignedMeshes.add(mesh);
          }
        }
      }

      for (const [key, mesh] of this.staticBallMeshes.entries()) {
        if (!nextStaticMeshes.has(key)) {
          this.ballsGroup.remove(mesh);
        }
      }

      this.staticBallMeshes = nextStaticMeshes;
      engine.droppingPathsMap = new Map();

      if (!this.activeMeshes || this.activeMeshes.length === 0) {
        this.activeMeshes = [];
        for (let i = 0; i < 4; i++) {
          const mesh = new THREE.Mesh(this.sphereGeo, this.ballMaterials[0]);
          mesh.castShadow = true;
          mesh.targetPos = new THREE.Vector3();
          mesh.initialized = false;
          this.activeGroup.add(mesh);
          this.activeMeshes.push(mesh);
        }
      }

      if (this.lastBallCount !== engine.ballCount) {
        this.lastBallCount = engine.ballCount;
        for (let i = 0; i < 4; i++) {
          if (this.activeMeshes[i]) {
            this.activeMeshes[i].initialized = false;
          }
        }
      }

      if (!engine.endGame && engine.oddballz) {
        let avgX = 0, avgY = 0, avgZ = 0;

        const rootFloatX = engine.activeFloatPos ? engine.activeFloatPos.x : engine.oddballz.map[0].x;
        const rootFloatY = engine.activeFloatPos ? engine.activeFloatPos.y : engine.oddballz.map[0].y;

        for (let i = 0; i <= 3; i++) {
          const val = engine.oddballz.image[i];
          const mesh = this.activeMeshes[i];

          if (val > 0) {
            mesh.visible = true;
            const colorIdx = (val - 1) % this.ballMaterials.length;
            mesh.material = this.ballMaterials[colorIdx];

            const relX = engine.activeRel ? engine.activeRel[i].x : engine.oddballz.rel[i].x;
            const relY = engine.activeRel ? engine.activeRel[i].y : engine.oddballz.rel[i].y;
            const floatX = rootFloatX + relX;
            const floatY = rootFloatY + relY;
            const wPos = gridToWorld(floatX, floatY, SPHERE_RADIUS);
            mesh.targetPos.set(wPos.x, wPos.y, wPos.z);

            if (!mesh.initialized) {
              mesh.position.set(wPos.x, wPos.y, wPos.z);
              mesh.initialized = true;
            }

            avgX += mesh.position.x; avgY += mesh.position.y; avgZ += mesh.position.z;
          } else {
            mesh.visible = false;
          }
        }

        avgX /= 4; avgY /= 4; avgZ /= 4;
        this.activePointLight.position.set(avgX, avgY, avgZ + 1.5);
      } else {
        for (let i = 0; i < 4; i++) {
          if (this.activeMeshes[i]) {
            this.activeMeshes[i].visible = false;
            this.activeMeshes[i].initialized = false;
          }
        }
      }

      this.ghostGroup.clear();
      if (!engine.endGame && engine.oddballz) {
        const ghostPositions = engine.getGhostPositions();
        for (let i = 0; i <= 3; i++) {
          const gPts = ghostPositions[i];
          const val = engine.oddballz.image[i];

          if (val > 0 && gPts) {
            const colorIdx = (val - 1) % this.ghostMaterials.length;
            const mat = this.ghostMaterials[colorIdx];
            const ghostMesh = new THREE.Mesh(this.sphereGeo, mat);

            const wPos = gridToWorld(gPts.x, gPts.y, SPHERE_RADIUS);
            ghostMesh.position.set(wPos.x, wPos.y, wPos.z);
            this.ghostGroup.add(ghostMesh);
          }
        }
      }
    }

    build3DStarfield() {
      // === 3D SPACE FLIGHT ENVIRONMENT ===
      this.spaceFlightGroup = new THREE.Group();
      // Tilt space flight container to match the exact camera & board perspective angle (~40 degrees)
      this.spaceFlightGroup.rotation.x = -0.70;

      // 1. DENSE 3D STARFIELD (3000 Stars streaming parallel to platform plane)
      const starCount = 3000;
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);

      this.flightStars = [];
      const palette = [
        new THREE.Color(0x00f0ff), // Cyan
        new THREE.Color(0xa855f7), // Purple
        new THREE.Color(0x3b82f6), // Blue
        new THREE.Color(0xffffff), // White
        new THREE.Color(0xfcbd2c), // Gold
        new THREE.Color(0xf43f5e)  // Rose
      ];

      for (let i = 0; i < starCount; i++) {
        const x = (Math.random() - 0.5) * 240;
        const y = (Math.random() - 0.5) * 240;
        const z = (Math.random() - 0.5) * 140 - 10;
        const color = palette[Math.floor(Math.random() * palette.length)];

        this.flightStars.push({
          x, y, z,
          speed: 15 + Math.random() * 25, // Flight speed parallel to board
          color
        });

        starPositions[i * 3]     = x;
        starPositions[i * 3 + 1] = y;
        starPositions[i * 3 + 2] = z;

        starColors[i * 3]     = color.r;
        starColors[i * 3 + 1] = color.g;
        starColors[i * 3 + 2] = color.b;
      }

      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

      const starMat = new THREE.PointsMaterial({
        size: 0.45,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.starPointsMesh = new THREE.Points(starGeo, starMat);
      this.spaceFlightGroup.add(this.starPointsMesh);

      // 2. FLOATING ASTEROIDS & SPACE ROCKS (Streaming parallel to board tilt)
      this.flightAsteroids = [];
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x3a3f58,
        roughness: 0.9,
        metalness: 0.2,
        flatShading: true
      });

      for (let i = 0; i < 20; i++) {
        const size = 0.8 + Math.random() * 2.5;
        const rockGeo = new THREE.DodecahedronGeometry(size, 1);
        const posAttr = rockGeo.attributes.position;
        for (let v = 0; v < posAttr.count; v++) {
          posAttr.setXYZ(
            v,
            posAttr.getX(v) * (0.8 + Math.random() * 0.4),
            posAttr.getY(v) * (0.8 + Math.random() * 0.4),
            posAttr.getZ(v) * (0.8 + Math.random() * 0.4)
          );
        }
        rockGeo.computeVertexNormals();

        const rock = new THREE.Mesh(rockGeo, rockMat);
        const side = Math.random() < 0.5 ? -1 : 1;
        rock.position.set(
          side * (16 + Math.random() * 45),
          (Math.random() - 0.5) * 120,
          -40 + Math.random() * 80
        );

        rock.userData = {
          speedY: 18 + Math.random() * 28,
          spinX: (Math.random() - 0.5) * 1.5,
          spinY: (Math.random() - 0.5) * 1.5,
          spinZ: (Math.random() - 0.5) * 1.5
        };

        this.spaceFlightGroup.add(rock);
        this.flightAsteroids.push(rock);
      }

      // 3. DISTANT BACKGROUND PLANETS (Aligned with space tilt)
      const planetGroup = new THREE.Group();
      const planetGeo = new THREE.SphereGeometry(14, 32, 32);
      const planetMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        roughness: 0.7,
        metalness: 0.1,
        emissive: 0x0f172a
      });
      const planet = new THREE.Mesh(planetGeo, planetMat);
      planet.position.set(70, 100, -80);

      const ringGeo = new THREE.RingGeometry(17, 26, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.8;
      planet.add(ring);
      planetGroup.add(planet);

      const moonGeo = new THREE.SphereGeometry(5, 24, 24);
      const moonMat = new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        roughness: 0.4,
        emissive: 0x581c87,
        emissiveIntensity: 0.5
      });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(-80, 110, -100);
      planetGroup.add(moon);

      this.spaceFlightGroup.add(planetGroup);

      this.scene.add(this.spaceFlightGroup);
      this._flightTime = 0;
    }

    render(dt = 0.016) {
      this._flightTime = (this._flightTime || 0) + dt;

      // === MAGIC-CARPET FLIGHT HOVER BOBBING FOR PLAYFIELD ===
      const hoverRoll = Math.sin(this._flightTime * 0.8) * 0.015;
      const hoverPitch = Math.cos(this._flightTime * 0.6) * 0.012;
      const hoverZ = Math.sin(this._flightTime * 1.2) * 0.15;

      this.boardGroup.rotation.x = hoverPitch;
      this.boardGroup.rotation.y = hoverRoll;
      this.boardGroup.position.z = hoverZ;

      this.ballsGroup.rotation.x = hoverPitch;
      this.ballsGroup.rotation.y = hoverRoll;
      this.ballsGroup.position.z = hoverZ;

      this.activeGroup.rotation.x = hoverPitch;
      this.activeGroup.rotation.y = hoverRoll;
      this.activeGroup.position.z = hoverZ;

      this.ghostGroup.rotation.x = hoverPitch;
      this.ghostGroup.rotation.y = hoverRoll;
      this.ghostGroup.position.z = hoverZ;

      // === 3D SPACE FLIGHT MOTION (ALIGNED WITH BOARD PERSPECTIVE TILT) ===
      const isZip = this.engine && this.engine.isZipping;
      const flightSpeedMult = isZip ? 2.5 : 1.0;

      // 1. Move Stars smoothly parallel to board plane
      if (this.flightStars && this.starPointsMesh) {
        const posAttr = this.starPointsMesh.geometry.attributes.position;
        for (let i = 0; i < this.flightStars.length; i++) {
          const star = this.flightStars[i];
          star.y -= star.speed * flightSpeedMult * dt;

          if (star.y < -120) {
            star.y = 120;
            star.x = (Math.random() - 0.5) * 240;
            star.z = (Math.random() - 0.5) * 140 - 10;
          }

          posAttr.array[i * 3]     = star.x;
          posAttr.array[i * 3 + 1] = star.y;
          posAttr.array[i * 3 + 2] = star.z;
        }
        posAttr.needsUpdate = true;
      }

      // 2. Stream Asteroids parallel to board plane
      if (this.flightAsteroids) {
        for (const rock of this.flightAsteroids) {
          const u = rock.userData;
          rock.position.y -= u.speedY * flightSpeedMult * dt;
          rock.rotation.x += u.spinX * dt;
          rock.rotation.y += u.spinY * dt;
          rock.rotation.z += u.spinZ * dt;

          if (rock.position.y < -110) {
            rock.position.y = 110;
            const side = Math.random() < 0.5 ? -1 : 1;
            rock.position.x = side * (16 + Math.random() * 45);
            rock.position.z = -40 + Math.random() * 80;
          }
        }
      }

      const lerpSpeed = Math.min(1.0, dt * 24.0);

      // Attract-mode highlight: pulse the balls that are about to match so the
      // player can see what lines up before it bursts.
      this.highlightPhase = (this.highlightPhase || 0) + dt * 7.0;
      const hiPulse = Math.abs(Math.sin(this.highlightPhase));
      const hiScale = 1.0 + 0.42 * hiPulse;
      // Only a token lift -- enough to draw the ball in front of its neighbours
      // without the camera angle opening a visible gap in the pile.
      const hiLift = 0.12 + 0.10 * hiPulse;

      for (const [key, mesh] of this.staticBallMeshes.entries()) {
        const lit = this.highlightKeys && this.highlightKeys.has(key);
        const s = lit ? hiScale : 1.0;
        mesh.scale.set(s, s, s);

        if (mesh.isPathDropping && mesh.worldPath && mesh.worldPath.length > 1) {
          const zipSpeed = 35.0; // Fast zip drop speed along visual hex path
          const targetWaypoint = mesh.worldPath[mesh.pathIndex];
          if (targetWaypoint) {
            const dist = mesh.position.distanceTo(targetWaypoint);
            const step = zipSpeed * dt;
            if (dist <= step) {
              mesh.position.set(targetWaypoint.x, targetWaypoint.y, targetWaypoint.z);
              mesh.pathIndex++;
              if (mesh.pathIndex >= mesh.worldPath.length) {
                mesh.isPathDropping = false;
                mesh.worldPath = null;
                if (this.engine && this.engine.onPlaySound) this.engine.onPlaySound('land');
              }
            } else {
              const dir = new THREE.Vector3().subVectors(targetWaypoint, mesh.position).normalize();
              mesh.position.addScaledVector(dir, step);
            }
          } else {
            mesh.isPathDropping = false;
          }
        } else if (mesh.targetPos) {
          mesh.position.lerp(mesh.targetPos, lerpSpeed);
        }

        if (lit && mesh.targetPos) mesh.position.z = mesh.targetPos.z + hiLift;
      }

      if (this.activeMeshes) {
        for (let i = 0; i < this.activeMeshes.length; i++) {
          const mesh = this.activeMeshes[i];
          if (mesh.visible && mesh.targetPos) {
            mesh.position.lerp(mesh.targetPos, lerpSpeed);
            const lit = this.highlightActive && this.highlightActive.has(i);
            const s = lit ? hiScale : 1.0;
            mesh.scale.set(s, s, s);
            if (lit) mesh.position.z = mesh.targetPos.z + hiLift;
          }
        }
      }

      this.renderer.render(this.scene, this.camera);
    }

    updateCameraFraming() {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      const aspect = width / height;
      this.camera.aspect = aspect;

      if (aspect < 1.0) {
        // iPhone & Android portrait mobile camera framing: Ergonomic scaled view showing full board & all tips
        this.camera.fov = Math.min(68, 42 / (aspect * 1.15));
        const distFactor = (1.0 - aspect);
        this.camera.position.set(0.4, -16.5 - distFactor * 2.0, 18.0 + distFactor * 2.5);
        this.camera.lookAt(0.4, 0.4, 0);
      } else {
        // Desktop / landscape view framing
        this.camera.fov = 45;
        this.camera.position.set(0.4, -17.5, 21.0);
        this.camera.lookAt(0.4, 0.8, 0);
      }

      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    onWindowResize() {
      this.updateCameraFraming();
    }
  }

  // --- 6. APPLICATION CONTROLLER ---
  class OddballzApp {
    constructor() {
      this.container = document.getElementById('canvasContainer');
      this.engine = new OddUnitEngine();
      this.renderer = new ThreeRenderer(this.container);
      this.particles = new ParticleSystem(this.renderer.scene);
      this.audio = new SoundEngine();

      this.isPlaying = false;
      this.isPaused = false;
      this.moveTime = 0;
      this.lastTime = performance.now();
      this.accumulatedTime = 0;

      // Attract / how-to-play demo mode (kicks in on the idle title screen)
      this.attractActive = false;
      this.attractMode = 'row';   // toggles to 'color' on the first cycle
      this.attractTimers = [];
      this.attractIdleTimer = null;
      this.ATTRACT_IDLE_MS = 12000;

      this.highScores = JSON.parse(localStorage.getItem('oddballz_hd_hiscores') || '[]');

      // Audio Settings from localStorage
      const savedAudio = JSON.parse(localStorage.getItem('oddballz_hd_audio_settings') || '{}');
      if (savedAudio.musicVolume !== undefined) this.audio.musicVolume = savedAudio.musicVolume;
      if (savedAudio.sfxVolume !== undefined) this.audio.sfxVolume = savedAudio.sfxVolume;
      if (savedAudio.musicEnabled !== undefined) this.audio.musicEnabled = savedAudio.musicEnabled;
      if (savedAudio.sfxEnabled !== undefined) this.audio.sfxEnabled = savedAudio.sfxEnabled;
      if (savedAudio.masterEnabled !== undefined) this.audio.enabled = savedAudio.masterEnabled;

      this.initHooks();
      this.initEventListeners();
      this.initTouchControls();
      this.updateUI();

      this.renderer.updateScene(this.engine);
      requestAnimationFrame((t) => this.gameLoop(t));

      this.scheduleAttractIdle();
    }

    initHooks() {
      this.engine.onPlaySound = (type, param) => this.audio.playSound(type, param);
      this.engine.onPopBalls = (matchList) => {
        for (const m of matchList) {
          const wPos = gridToWorld(m.x, m.y, SPHERE_RADIUS);
          this.particles.spawnPopExplosion(wPos, m.color || 1);
        }
      };
    }

    initEventListeners() {
      window.addEventListener('keydown', (e) => {
        const code = e.code;
        const key = e.key;

        // Any key dismisses the attract demo back to the title; Enter then starts.
        if (this.attractActive) this.exitAttract(true);

        if (key === 'Enter' || code === 'Enter' || code === 'NumpadEnter') {
          const modal = document.getElementById('gameDialogView');
          if (modal && !modal.classList.contains('hidden')) {
            this.closeHighScoresModal();
            e.preventDefault(); return;
          }
          if (!this.isPlaying || this.engine.endGame) this.startGame();
          e.preventDefault(); return;
        }

        if (code === 'KeyM' || key === 'm' || key === 'M') {
          this.audio.setMasterEnabled(!this.audio.enabled);
          this.syncAudioUI();
          this.saveAudioSettings();
          e.preventDefault(); return;
        }

        if (!this.isPlaying) return;

        if (code === 'KeyP' || key === 'p' || key === 'P') {
          this.togglePause(); e.preventDefault(); return;
        }

        if (this.isPaused) return;

        switch (code) {
          case 'KeyF': case 'Insert': case 'Numpad0':
            this.engine.rotColors(); e.preventDefault(); break;
          case 'ArrowLeft': case 'KeyD': case 'KeyA':
            this.engine.moveOBall(1); e.preventDefault(); break;
          case 'ArrowRight': case 'KeyG':
            this.engine.moveOBall(4); e.preventDefault(); break;
          case 'ArrowUp': case 'KeyW':
            this.engine.transform(this.engine.rotCCW); e.preventDefault(); break;
          case 'ArrowDown': case 'KeyV': case 'KeyS':
            this.engine.transform(this.engine.rotCW); e.preventDefault(); break;
          case 'KeyX': case 'Home':
            this.engine.transform(this.engine.flipX); e.preventDefault(); break;
          case 'KeyY': case 'End':
            this.engine.transform(this.engine.flipY); e.preventDefault(); break;
          case 'Space':
            this.engine.zip(); e.preventDefault(); break;
        }

        this.renderer.updateScene(this.engine);
      });

      // Any tap/click while the attract demo is running returns to the title.
      window.addEventListener('pointerdown', () => {
        if (this.attractActive) this.exitAttract(true);
      }, true);

      const bindStartBtn = (id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', (e) => {
          this.startGame();
        });
      };

      bindStartBtn('btnOverlayStart');
      bindStartBtn('btnRestart');
      document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
      document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
      document.getElementById('btnPauseEnd').addEventListener('click', () => this.promptEndGame());
      document.getElementById('btnConfirmEndYes').addEventListener('click', () => this.confirmEndGame());
      document.getElementById('btnConfirmEndNo').addEventListener('click', () => this.closeEndGameModal());

      ['btnHighScores', 'btnGameOverHighScores'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => this.showHighScoresModal());
      });

      ['btnCloseModal', 'btnRecordsClose'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => this.closeHighScoresModal());
      });

      ['btnAbout', 'btnStartCredits'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => this.showAboutModal());
      });

      ['btnCloseAbout', 'btnAboutClose'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => this.closeAboutModal());
      });

      const btnAudio = document.getElementById('btnAudioSettings');
      if (btnAudio) btnAudio.addEventListener('click', () => this.showAudioModal());

      ['btnCloseAudio', 'btnAudioClose'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => this.closeAudioModal());
      });

      const toggleMaster = document.getElementById('toggleSoundMaster');
      if (toggleMaster) {
        toggleMaster.addEventListener('change', (e) => {
          this.audio.setMasterEnabled(e.target.checked);
          if (this.audio.enabled && this.audio.musicEnabled && this.isPlaying && (!this.isPaused || this.wasPausedByModal)) {
            this.audio.startBGM();
          } else {
            this.audio.stopBGM();
          }
          this.saveAudioSettings();
        });
      }

      const toggleMusic = document.getElementById('toggleMusic');
      if (toggleMusic) {
        toggleMusic.addEventListener('change', (e) => {
          this.audio.setMusicEnabled(e.target.checked);
          if (this.audio.enabled && this.audio.musicEnabled && this.isPlaying && (!this.isPaused || this.wasPausedByModal)) {
            this.audio.startBGM();
          } else {
            this.audio.stopBGM();
          }
          this.saveAudioSettings();
        });
      }

      const toggleSFX = document.getElementById('toggleSFX');
      if (toggleSFX) {
        toggleSFX.addEventListener('change', (e) => {
          this.audio.setSFXEnabled(e.target.checked);
          this.saveAudioSettings();
        });
      }

      const sliderMusic = document.getElementById('sliderMusicVolume');
      if (sliderMusic) {
        sliderMusic.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value) / 100;
          this.audio.setMusicVolume(val);
          const badge = document.getElementById('valMusicVolume');
          if (badge) badge.textContent = `${e.target.value}%`;
          this.saveAudioSettings();
        });
      }

      const sliderSFX = document.getElementById('sliderSFXVolume');
      if (sliderSFX) {
        sliderSFX.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value) / 100;
          this.audio.setSFXVolume(val);
          const badge = document.getElementById('valSFXVolume');
          if (badge) badge.textContent = `${e.target.value}%`;
          this.saveAudioSettings();
        });
      }

      const tabColor = document.getElementById('tabColorMatch');
      const tabRow = document.getElementById('tabRowBuild');
      const cardColor = document.getElementById('modeCardColorMatch');
      const cardRow = document.getElementById('modeCardRowBuild');

      if (tabColor) tabColor.addEventListener('click', () => this.switchMode(true));
      if (tabRow) tabRow.addEventListener('click', () => this.switchMode(false));
      if (cardColor) cardColor.addEventListener('click', () => this.switchMode(true));
      if (cardRow) cardRow.addEventListener('click', () => this.switchMode(false));
    }

    initTouchControls() {
      const bindTouch = (id, action) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        let lastTriggerTime = 0;
        const trigger = (e) => {
          const now = Date.now();
          if (now - lastTriggerTime < 180) {
            if (e && e.cancelable) e.preventDefault();
            return;
          }
          lastTriggerTime = now;
          if (e && e.cancelable) e.preventDefault();
          if (this.isPlaying && !this.isPaused) {
            action();
            this.renderer.updateScene(this.engine);
          }
        };
        btn.addEventListener('pointerdown', trigger, { passive: false });
        btn.addEventListener('touchstart', trigger, { passive: false });
        btn.addEventListener('click', trigger);
      };

      bindTouch('btnTouchLeft', () => this.engine.moveOBall(1));
      bindTouch('btnTouchRight', () => this.engine.moveOBall(4));
      bindTouch('btnTouchRotCW', () => this.engine.transform(this.engine.rotCW));
      bindTouch('btnTouchRotCCW', () => this.engine.transform(this.engine.rotCCW));
      bindTouch('btnTouchFlip', () => this.engine.transform(this.engine.flipX));
      bindTouch('btnTouchFlipY', () => this.engine.transform(this.engine.flipY));
      bindTouch('btnTouchF', () => this.engine.rotColors());
      bindTouch('btnTouchSpace', () => this.engine.zip());

      // Auto-pause ONLY when browser tab is hidden (visibilitychange)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.isPlaying && !this.isPaused) {
            this.togglePause();
          }
        } else {
          if (this.audio) {
            this.audio.init();
          }
        }
      });
    }

    setModeTabsDisabled(disabled) {
      const tabColor = document.getElementById('tabColorMatch');
      const tabRow = document.getElementById('tabRowBuild');
      if (tabColor) {
        tabColor.disabled = disabled;
        if (disabled) tabColor.classList.add('disabled');
        else tabColor.classList.remove('disabled');
      }
      if (tabRow) {
        tabRow.disabled = disabled;
        if (disabled) tabRow.classList.add('disabled');
        else tabRow.classList.remove('disabled');
      }
    }

    switchMode(isColorMatch) {
      if (this.isPlaying) return;

      const tabColor = document.getElementById('tabColorMatch');
      const tabRow = document.getElementById('tabRowBuild');
      const cardColor = document.getElementById('modeCardColorMatch');
      const cardRow = document.getElementById('modeCardRowBuild');

      this.engine.matcher = isColorMatch;

      if (isColorMatch) {
        if (tabColor) tabColor.classList.add('active');
        if (tabRow) tabRow.classList.remove('active');
        if (cardColor) {
          cardColor.classList.add('active');
          const badge = cardColor.querySelector('.mode-select-badge');
          if (badge) badge.textContent = '✓ ACTIVE';
        }
        if (cardRow) {
          cardRow.classList.remove('active');
          const badge = cardRow.querySelector('.mode-select-badge');
          if (badge) badge.textContent = 'SELECT';
        }
      } else {
        if (tabRow) tabRow.classList.add('active');
        if (tabColor) tabColor.classList.remove('active');
        if (cardRow) {
          cardRow.classList.add('active');
          const badge = cardRow.querySelector('.mode-select-badge');
          if (badge) badge.textContent = '✓ ACTIVE';
        }
        if (cardColor) {
          cardColor.classList.remove('active');
          const badge = cardColor.querySelector('.mode-select-badge');
          if (badge) badge.textContent = 'SELECT';
        }
      }

      if (!this.isPlaying) {
        this.engine.initGame();
        this.renderer.updateScene(this.engine);
      }
    }

    startGame() {
      if (this.attractActive) this.exitAttract(false);
      if (this.attractIdleTimer) { clearTimeout(this.attractIdleTimer); this.attractIdleTimer = null; }
      this.audio.init();
      this.engine.initGame();
      this.engine.build();
      this.particles.clearAll();

      this.isPlaying = true;
      this.isPaused = false;
      this.moveTime = 0;
      this.accumulatedTime = 0;
      this.lastTime = performance.now();

      this.setModeTabsDisabled(true);

      document.getElementById('overlayStart').classList.add('hidden');
      document.getElementById('overlayGameOver').classList.add('hidden');
      document.getElementById('overlayPause').classList.add('hidden');
      document.getElementById('btnPause').disabled = false;

      this.renderer.updateScene(this.engine);
      this.updateUI();
      this.audio.startBGM();
    }

    togglePause() {
      if (!this.isPlaying) return;
      this.isPaused = !this.isPaused;

      if (this.isPaused) {
        document.getElementById('overlayPause').classList.remove('hidden');
        this.audio.stopBGM();
      } else {
        document.getElementById('overlayPause').classList.add('hidden');
        document.getElementById('dialogConfirmEnd').classList.add('hidden');
        this.lastTime = performance.now();
        this.audio.startBGM();
      }
    }

    promptEndGame() {
      if (!this.isPlaying) return;
      if (!this.isPaused) {
        this.wasPausedByModal = true;
        this.togglePause();
      }
      document.getElementById('dialogConfirmEnd').classList.remove('hidden');
    }

    closeEndGameModal() {
      document.getElementById('dialogConfirmEnd').classList.add('hidden');
      if (this.wasPausedByModal) {
        this.wasPausedByModal = false;
        if (this.isPlaying && this.isPaused) {
          this.togglePause();
        }
      }
    }

    confirmEndGame() {
      this.wasPausedByModal = false;
      document.getElementById('dialogConfirmEnd').classList.add('hidden');
      this.returnToTitle();
    }

    returnToTitle() {
      this.isPlaying = false;
      this.isPaused = false;
      this.wasPausedByModal = false;
      this.wasPausedByFocusLoss = false;
      this.engine.endGame = true;
      this.audio.stopBGM();

      this.setModeTabsDisabled(false);

      document.getElementById('overlayPause').classList.add('hidden');
      document.getElementById('overlayGameOver').classList.add('hidden');
      document.getElementById('dialogConfirmEnd').classList.add('hidden');
      document.getElementById('overlayStart').classList.remove('hidden');
      document.getElementById('btnPause').disabled = true;

      this.renderer.updateScene(this.engine);
      this.updateUI();

      this.scheduleAttractIdle();
    }

    // ===== Attract / How-To-Play demo mode =====
    isOnTitleIdle() {
      if (this.isPlaying) return false;
      const start = document.getElementById('overlayStart');
      if (!start || start.classList.contains('hidden')) return false;
      const blockers = ['gameDialogView', 'gameDialogAbout', 'gameDialogAudio',
                        'overlayPause', 'overlayGameOver', 'dialogConfirmEnd'];
      for (const id of blockers) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) return false;
      }
      return true;
    }

    scheduleAttractIdle() {
      if (this.attractIdleTimer) { clearTimeout(this.attractIdleTimer); this.attractIdleTimer = null; }
      this.attractIdleTimer = setTimeout(() => this.enterAttract(), this.ATTRACT_IDLE_MS);
    }

    clearAttractTimers() {
      if (this.attractTimers) this.attractTimers.forEach(id => clearTimeout(id));
      this.attractTimers = [];
    }

    enterAttract() {
      if (this.attractActive) return;
      if (!this.isOnTitleIdle()) { if (!this.isPlaying) this.scheduleAttractIdle(); return; }

      this.attractActive = true;
      this.attractPlay = null;
      this.attractSavedMatcher = this.engine.matcher;   // restore the user's mode on exit

      // Level 1's actual palette (levAttr[0].lColors = 3, i.e. colours 1-3), the
      // same every run so the demo looks like a real level-1 board.
      this.demoPalette = [1, 2, 3];
      this.demoMatchColor = 1;
      // A fresh heap for each attract run, the way a page reload gives one.
      // Within the run it is snapshotted and reused, so the board still never
      // changes underneath the three lessons -- it just isn't the same board
      // every single loop.
      this.demoPileSnapshot = null;
      this.engine.endGame = true;            // suppress the live active-piece render
      this.engine.eraseBallMap();
      this.engine.droppingPathsMap = new Map();
      this.renderer.updateScene(this.engine);

      document.getElementById('overlayStart').classList.add('hidden');
      const cap = document.getElementById('attractCaption');
      if (cap) cap.style.visibility = 'hidden';   // no placeholder flash
      const ov = document.getElementById('overlayAttract');
      if (ov) ov.classList.remove('hidden');

      this.runAttractSequence();
    }

    exitAttract(showTitle) {
      if (!this.attractActive) return;
      this.attractActive = false;
      this.clearAttractTimers();
      this.attractPlay = null;
      this.renderer.highlightKeys = new Set();
      this.renderer.highlightActive = new Set();
      delete this.engine.checkMatches;   // in case we exited mid-demo

      this.engine.endGame = true;
      if (this.attractSavedMatcher !== undefined) this.engine.matcher = this.attractSavedMatcher;
      this.engine.eraseBallMap();
      this.engine.droppingPathsMap = new Map();
      this.engine.score = 0; this.engine.level = 1; this.engine.skill = 1; this.engine.ballCount = 0;
      this.renderer.updateScene(this.engine);
      this.updateUI();

      const ov = document.getElementById('overlayAttract');
      if (ov) ov.classList.add('hidden');

      if (showTitle) {
        document.getElementById('overlayStart').classList.remove('hidden');
        this.scheduleAttractIdle();
      }
    }

    setAttractCaption(title, html) {
      const t = document.getElementById('attractModeTitle');
      const c = document.getElementById('attractCaption');
      if (t) t.textContent = title;
      if (c) { c.innerHTML = html; c.style.visibility = html ? 'visible' : 'hidden'; }
      this.positionAttractCaption();
    }

    // Park the caption just under whatever the demo is drawing attention to, by
    // projecting those cells through the camera. Keeps the text and the action
    // in one glance instead of at opposite ends of the screen.
    positionAttractCaption() {
      const cap = document.getElementById('attractCaption');
      const cells = this.attractFocus;
      if (!cap || !this.container || !cells || !cells.length) return;
      const cam = this.renderer && this.renderer.camera;
      if (!cam) return;

      const zOff = this.renderer.ballsGroup ? this.renderer.ballsGroup.position.z : 0;
      let nx = 0, ny = 0;
      for (const c of cells) {
        const w = gridToWorld(c.x, c.y, SPHERE_RADIUS);
        const v = new THREE.Vector3(w.x, w.y, w.z + zOff);
        v.project(cam);
        nx += v.x; ny += v.y;
      }
      nx /= cells.length; ny /= cells.length;

      const rect = this.container.getBoundingClientRect();
      const px = (nx * 0.5 + 0.5) * rect.width;
      const py = (-ny * 0.5 + 0.5) * rect.height;

      // Sit below the action, but flip above it if that would run off the pane.
      const below = py + rect.height * 0.11;
      const top = (below > rect.height * 0.82) ? py - rect.height * 0.17 : below;
      const clampX = Math.max(rect.width * 0.24, Math.min(rect.width * 0.76, px));
      const clampY = Math.max(rect.height * 0.14, Math.min(rect.height * 0.84, top));

      cap.style.left = Math.round(clampX) + 'px';
      cap.style.top = Math.round(clampY) + 'px';
    }

    // Burst + remove balls, exactly like a real match clear.
    demoPop(cells) {
      cells.forEach(cell => {
        const col = this.engine.ballMap[cell.x][cell.y].bzMap || 1;
        const w = gridToWorld(cell.x, cell.y, SPHERE_RADIUS);
        this.particles.spawnPopExplosion(w, col);
        this.engine.ballMap[cell.x][cell.y].bzMap = 0;
      });
      if (this.audio) this.audio.playSound('pop');
      this.renderer.updateScene(this.engine);
    }

    // Build a realistic pile by actually PLAYING the engine for a bunch of
    // hard-dropped pieces (matches clear, balls settle), then freezing the
    // natural result. Gives a jagged, gappy, random-coloured pile like real
    // mid-game play -- never a flat, perfectly-patterned wall.
    // Pick from the demo's small palette, avoiding colours that would leave a
    // ready-made match sitting in the heap: never touch on a perpendicular axis
    // (that is a 3-match), never extend a parallel run past three (a 5-match).
    demoSafeColor(x, y) {
      const e = this.engine;
      const pal = this.demoPalette || [1, 2, 3];
      const at = (nx, ny) =>
        (nx >= 0 && nx <= 24 && ny >= 0 && ny <= 23) ? e.ballMap[nx][ny].bzMap : 0;

      const PERP = [[-2,-1], [-1,1], [1,2], [-1,-2], [1,-1], [2,1]];
      const banned = new Set();
      for (const [dx, dy] of PERP) { const v = at(x + dx, y + dy); if (v) banned.add(v); }

      const runOK = (c) => {
        for (const [dx, dy] of [[1,0], [1,1], [0,1]]) {   // the three parallel axes
          let run = 1;
          for (const s of [1, -1]) {
            let nx = x + dx * s, ny = y + dy * s;
            while (at(nx, ny) === c) { run++; nx += dx * s; ny += dy * s; }
          }
          if (run >= 4) return false;
        }
        return true;
      };

      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      const best = pal.filter(c => !banned.has(c) && runOK(c));
      if (best.length) return pick(best);
      const ok = pal.filter(runOK);
      return ok.length ? pick(ok) : pick(pal);
    }

    // The heap the demos play on. Generated once per attract run and then
    // restored for every scene, so the bottom of the board never changes
    // between lessons. Full at the base, thinning and ragged toward the top
    // with real gaps -- closer to a board you'd actually be playing on.
    demoBuildPile() {
      const e = this.engine;
      const R = Math.random;
      e.eraseBallMap();
      e.droppingPathsMap = new Map();

      if (this.demoPileSnapshot) {
        for (const [key, val] of this.demoPileSnapshot) {
          const p = key.split('_');
          e.ballMap[+p[0]][+p[1]].bzMap = val;
        }
        e.endGame = true;
        this.renderer.updateScene(e);
        return;
      }

      const want = [];
      const seen = new Set();
      const add = (x, y) => {
        const k = x + '_' + y;
        if (!seen.has(k) && e.checkInMap({ x: x, y: y })) { seen.add(k); want.push({ x: x, y: y }); }
      };

      // Gaps scattered through the heap. A ball resting on just one diagonal
      // neighbour is perfectly legal here (that is how this engine's support
      // rule works) and gives the heap its characteristic look, so those are
      // kept -- only genuinely unsupported balls are corrected further down.
      // Overall density and the height of each column both vary per run. Without
      // this the heap kept the same silhouette every time and only its colours
      // changed, which reads as the same board over and over.
      // Denser on average than a pure spread: a thin heap has little to drop
      // into a cleared line, which is what makes chain reactions rare.
      const density = 0.45 + R() * 0.75;
      const surface = {};
      for (let x = 4; x <= 20; x++) surface[x] = 12 + Math.floor(R() * R() * 3);  // 12..14

      for (let y = 19; y >= 12; y--) {
        for (let x = 4; x <= 20; x++) {
          if (!e.checkInMap({ x: x, y: y })) continue;
          if (y < surface[x]) continue;                       // ragged top edge
          const hole = (y >= 16) ? 0.10 : (y >= 14 ? 0.22 : 0.30);
          if (R() < Math.min(0.55, hole * density)) continue;
          add(x, y);
        }
      }
      // Only the cells that actually carry a landing ball are guaranteed; the
      // rest of the surface is free to vary from run to run.
      for (const k of ['6_12', '8_12', '9_12', '11_12', '12_12', '17_12', '18_12']) {
        add(+k.split('_')[0], +k.split('_')[1]);
      }
      // Walls and floor around the permanent notch at x 15-16, part of the heap
      // from the start so the gravity lesson can use it with no board reset.
      for (let y = 12; y <= 16; y++) add(14, y);
      for (let y = 12; y <= 13; y++) { add(17, y); add(18, y); }
      for (let y = 17; y <= 19; y++) { add(15, y); add(16, y); }
      // Ragged extras on the surface, in the columns no lesson lands in.
      for (const x of [4, 13, 19, 20]) if (R() < 0.5) add(x, 11);

      // Often stack a little ABOVE the five-in-a-row's row, just left of where
      // the piece lands. Clearing that row then drops these in, which is what
      // gives that lesson a chance of a chain reaction -- without them the line
      // sits on the surface with nothing above it to fall.
      if (R() < 0.9) {
        add(5, 11); add(6, 11);                       // the pair holds them up
        for (const x of [4, 5, 6]) {
          if (R() < 0.8) { add(x, 10); if (R() < 0.5) add(x, 9); }
        }
      }

      const notch = new Set();
      for (let y = 12; y <= 16; y++) { notch.add('15_' + y); notch.add('16_' + y); }
      const kept = want.filter(c => !notch.has(c.x + '_' + c.y));
      want.length = 0;
      for (const c of kept) want.push(c);

      for (const c of want) e.ballMap[c.x][c.y].bzMap = this.demoSafeColor(c.x, c.y);

      // A ball with BOTH cells beneath it empty would drop the instant gravity
      // ran, so prop those up (or drop them). Diagonal-only support is left be.
      let sg = 0;
      while (sg++ < 60) {
        let fixed = 0;
        for (let y = 19; y >= 0; y--) {
          for (let x = 4; x <= 20; x++) {
            if (!e.ballMap[x][y].bzMap || e.supported({ x: x, y: y })) continue;
            const under = { x: x, y: y + 1 }, diag = { x: x + 1, y: y + 1 };
            const t = e.checkInMap(under) ? under : (e.checkInMap(diag) ? diag : null);
            if (t && !notch.has(t.x + '_' + t.y)) {
              e.ballMap[t.x][t.y].bzMap = this.demoSafeColor(t.x, t.y);
            } else {
              e.ballMap[x][y].bzMap = 0;      // nothing could hold it up
            }
            fixed++;
          }
        }
        if (!fixed) break;
      }

      // The perpendicular lesson's pair belongs to the heap from the very
      // start, so nothing has to visibly pop into existence between lessons.
      // Anchored at x 11-13 so it is clear of the five-in-a-row's row.
      const seedC = this.demoMatchColor || 1;
      for (const p of [[12, 14], [13, 16]]) {
        if (e.checkInMap({ x: p[0], y: p[1] }) && !e.ballMap[p[0]][p[1]].bzMap) {
          e.ballMap[p[0]][p[1]].bzMap = this.demoSafeColor(p[0], p[1]);
        }
      }
      e.ballMap[12][13].bzMap = seedC;
      e.ballMap[13][15].bzMap = seedC;

      // Solve the heap ONCE against every lesson's constraints -- no ready-made
      // match anywhere, and no colour sitting where a later lesson's ball will
      // land. Doing this per-lesson instead makes lesson two repaint balls
      // mid-demo, which looks like balls changing colour out of nowhere.
      this.demoResolveBoard(
        new Set(['12_13', '13_15', '5_11', '6_11', '7_11', '8_11', '9_11', '11_11', '15_11']),
        this.demoAllIsolations(),
        new Set(['6_12', '8_12', '9_12', '11_12', '12_12',
                 '17_12', '18_12', '12_14', '13_16'])
      );

      this.demoPileSnapshot = new Map();
      for (let x = 4; x <= 20; x++) {
        for (let y = 0; y <= 19; y++) {
          if (e.ballMap[x][y].bzMap) this.demoPileSnapshot.set(x + '_' + y, e.ballMap[x][y].bzMap);
        }
      }

      e.endGame = true;
      this.renderer.updateScene(e);
    }

    runAttractSequence() {
      this.clearAttractTimers();
      let t = 0;
      const at = (delay, fn) => {
        t += delay;
        this.attractTimers.push(setTimeout(() => { if (this.attractActive) fn(); }, t));
      };

      // All three lessons play back to back, then back to the title screen.
      // Only the first two captions are on a timer. The last two are fired by
      // the demo itself when the piece actually lands and when it bursts, so
      // the text can never race ahead of (or lag behind) what's on screen.
      const scene = (kind, title, caps, tail) => {
        at(60,   () => { this.setAttractCaption(title, caps[0]); this.startAttractPlay(kind, title, caps); });
        at(1450, () => this.setAttractCaption(title, caps[1]));
        at(3500 + (tail || 0), () => 0);
      };

      scene('match5', 'COLOR MATCH', [
        'Line up <b>5+ same-coloured</b> balls in a row.',
        'Steer and rotate as it falls, and cycle the colours with <b>F</b>.',
        'Watch &mdash; <b>these five</b> are lined up&hellip;',
        'Five in a row &mdash; <b>they burst and clear!</b>'
      ], 6800);

      scene('perp3', 'COLOR MATCH', [
        'Now match <b>3+</b> in a <b>perpendicular</b> line.',
        'Steer and rotate as it falls, and cycle the colours with <b>F</b>.',
        'Watch &mdash; <b>these three</b> line up vertically&hellip;',
        'Three perpendicular &mdash; <b>they burst!</b>'
      ], 6800);

      scene('support', 'SUPPORT & GRAVITY', [
        'Balls must be <b>supported</b> from underneath.',
        'This piece is heading out over a <b>gap</b> in the stack&hellip;',
        'This ball has <b>nothing beneath it</b>&hellip;',
        '&hellip;so it <b>breaks off and falls!</b>'
      ], 1800);

      at(600, () => this.exitAttract(true));
    }

    // Every colour constraint all three lessons will need, so the heap can be
    // solved once up front. Solving them per-lesson instead means lesson two
    // repaints balls mid-demo, which looks like balls changing out of nowhere.
    demoAllIsolations() {
      const pal = this.demoPalette || [1, 2, 3];
      const C = this.demoMatchColor || pal[0];
      const others = pal.filter(c => c !== C);
      const o1 = others[0] !== undefined ? others[0] : C;
      const o2 = others[1] !== undefined ? others[1] : o1;
      const P = (x, y) => ({ x: x, y: y });
      return [
        // five-in-a-row: the line, then its odd ball
        { cells: [P(5,11), P(6,11), P(7,11), P(8,11), P(9,11)], color: C },
        { cells: [P(10,11)], color: o1 },
        // perpendicular: only the line. The diamond's other three colours are
        // chosen at run time to suit the heap, so they need no constraint here.
        { cells: [P(12,13), P(13,15), P(11,11)], color: C },
        // gravity: the bar's four landing cells
        { cells: [P(15,11)], color: o2 },
        { cells: [P(16,11), P(18,11)], color: C },
        { cells: [P(17,11)], color: o1 }
      ];
    }

    // Is this ball part of a scoring line? Mirrors the engine's own rule:
    // 5+ along a parallel axis, 3+ along a perpendicular one.
    demoCellInMatch(x, y) {
      const e = this.engine;
      const c = e.ballMap[x][y].bzMap;
      if (!c) return false;
      const at = (nx, ny) =>
        (nx >= 0 && nx <= 24 && ny >= 0 && ny <= 23) ? e.ballMap[nx][ny].bzMap : -1;
      const AXES = [
        [1, 0, 5], [1, 1, 5], [0, 1, 5],       // parallel  -> needs 5
        [1, 2, 3], [1, -1, 3], [2, 1, 3]       // perpendicular -> needs 3
      ];
      for (const a of AXES) {
        let run = 1;
        for (const s of [1, -1]) {
          let nx = x + a[0] * s, ny = y + a[1] * s;
          while (at(nx, ny) === c) { run++; nx += a[0] * s; ny += a[1] * s; }
        }
        if (run >= a[2]) return true;
      }
      return false;
    }

    // Make the board demo-safe by recolouring, never by popping: no ball may sit
    // in a match, and cells beside where the demo's balls will land or come to
    // rest may not hold that ball's colour (which is how an accidental match
    // sneaks in later). Solved together, since fixing one can break the other.
    demoResolveBoard(protect, isolations, structural) {
      const e = this.engine;
      // Try the match colour LAST, so a repaint never turns a heap ball into
      // the colour the next lesson is about to match -- that reads as a ball
      // appearing from nowhere right beside the action.
      const C = this.demoMatchColor;
      const pal = (this.demoPalette || [1, 2, 3]).slice()
                    .sort((a, b) => (a === C ? 1 : 0) - (b === C ? 1 : 0));
      const AXES = [[1,0], [-1,0], [1,1], [-1,-1], [0,1], [0,-1],
                    [1,2], [-1,-2], [1,-1], [-1,1], [2,1], [-2,-1]];

      // Only PERPENDICULAR neighbours matter here: those lines match at 3, so a
      // touching ball of the same colour is a real risk. Parallel lines need 5,
      // so forbidding the colour there just forced needless repaints of balls
      // sitting right next to the action.
      const PERP = [[1,2], [-1,-2], [1,-1], [-1,1], [2,1], [-2,-1]];
      const forbid = new Map();
      for (const iso of isolations || []) {
        const keep = new Set(iso.cells.map(c => c.x + '_' + c.y));
        for (const c of iso.cells) {
          for (const d of PERP) {
            const nx = c.x + d[0], ny = c.y + d[1], k = nx + '_' + ny;
            if (nx < 4 || nx > 20 || ny < 0 || ny > 19 || keep.has(k)) continue;
            if (!forbid.has(k)) forbid.set(k, new Set());
            forbid.get(k).add(iso.color);
          }
        }
      }

      const bad = (x, y) => {
        const v = e.ballMap[x][y].bzMap;
        if (!v) return false;
        const f = forbid.get(x + '_' + y);
        if (f && f.has(v)) return true;
        return this.demoCellInMatch(x, y);
      };

      const skip = new Set();
      for (let pass = 0; pass < 400; pass++) {
        let tx = -1, ty = -1;
        for (let x = 4; x <= 20 && tx < 0; x++) {
          for (let y = 0; y <= 19; y++) {
            const k = x + '_' + y;
            if (skip.has(k) || protect.has(k)) continue;
            if (bad(x, y)) { tx = x; ty = y; break; }
          }
        }
        if (tx < 0) return true;                       // board is clean
        const orig = e.ballMap[tx][ty].bzMap;
        let ok = false;

        for (const c of pal) {
          if (c === orig) continue;
          e.ballMap[tx][ty].bzMap = c;
          if (!bad(tx, ty)) { ok = true; break; }
        }

        // Recolouring this ball alone may be impossible with so few colours --
        // in that case break the run by recolouring one of its neighbours.
        if (!ok) {
          e.ballMap[tx][ty].bzMap = orig;
          for (const d of AXES) {
            const nx = tx + d[0], ny = ty + d[1], k2 = nx + '_' + ny;
            if (nx < 4 || nx > 20 || ny < 0 || ny > 19) continue;
            if (protect.has(k2)) continue;
            const nv = e.ballMap[nx][ny].bzMap;
            if (!nv || nv !== orig) continue;
            for (const c of pal) {
              if (c === nv) continue;
              e.ballMap[nx][ny].bzMap = c;
              if (!bad(tx, ty) && !bad(nx, ny)) { ok = true; break; }
              e.ballMap[nx][ny].bzMap = nv;
            }
            if (ok) break;
          }
        }

        // Nothing here can be repainted: take the ball out rather than skipping
        // it, because a skipped cell leaves the board dirty while this function
        // still reports success. A gap can never match.
        if (!ok) {
          e.ballMap[tx][ty].bzMap = orig;
          const key = tx + '_' + ty;
          const above = (ty > 0) ? e.ballMap[tx][ty - 1].bzMap : 0;
          const propped = !above ||
            (e.checkInMap({ x: tx + 1, y: ty }) && e.ballMap[tx + 1][ty].bzMap);
          // Structural cells hold up the landing row -- removing one lets the
          // demo piece fall straight past where the lesson needs it.
          if (propped && !(structural && structural.has(key))) e.ballMap[tx][ty].bzMap = 0;
          else skip.add(key);
        }
      }
      return false;
    }

    // Every ball currently sitting in a scoring line.
    demoFindMatchCells() {
      const out = [];
      for (let x = 4; x <= 20; x++) {
        for (let y = 0; y <= 19; y++) {
          if (this.demoCellInMatch(x, y)) out.push({ x: x, y: y });
        }
      }
      return out;
    }


    // Definitive guarantee for the gravity lesson: play the whole landing and
    // drop out on a scratch copy of the board, and keep recolouring the heap
    // until that sequence produces no match at all. Otherwise the falling ball
    // can happen to complete a line and clear, which hides the actual lesson.
    demoEnsureCleanDrop(landing) {
      const e = this.engine;
      const pal = this.demoPalette || [1, 2, 3];
      const notch = new Set();
      for (let y = 12; y <= 16; y++) { notch.add('15_' + y); notch.add('16_' + y); }
      const isLanding = (x, y) => landing.some(L => L[0] === x && L[1] === y);

      // Play the landing + drop on a scratch copy and report every ball that
      // would end up in a match. The engine checks matches BEFORE gravity runs,
      // so both moments matter.
      const simulate = () => {
        const snap = [];
        for (let x = 4; x <= 20; x++) {
          for (let y = 0; y <= 19; y++) snap.push(e.ballMap[x][y].bzMap);
        }
        for (const L of landing) e.ballMap[L[0]][L[1]].bzMap = L[2];

        const found = [];
        const scan = () => {
          for (let x = 4; x <= 20; x++) {
            for (let y = 0; y <= 19; y++) {
              if (this.demoCellInMatch(x, y)) found.push({ x: x, y: y });
            }
          }
        };
        scan();
        let g = 0; while (g++ < 40 && !e.checkGaps()) { /* let it drop */ }
        scan();

        let i = 0;
        for (let x = 4; x <= 20; x++) {
          for (let y = 0; y <= 19; y++) e.ballMap[x][y].bzMap = snap[i++];
        }
        e.droppingPathsMap = new Map();
        return found;
      };

      for (let attempt = 0; attempt < 80; attempt++) {
        const offenders = simulate();
        if (!offenders.length) return true;

        // Heap balls we're allowed to repaint (never the piece or the notch).
        const cands = offenders.filter(o =>
          !notch.has(o.x + '_' + o.y) && !isLanding(o.x, o.y) && e.ballMap[o.x][o.y].bzMap);
        if (!cands.length) return false;

        // Only keep a repaint that actually reduces the problem, otherwise this
        // just oscillates between colours and never converges.
        let improved = false;
        for (const cand of cands) {
          const orig = e.ballMap[cand.x][cand.y].bzMap;
          for (const c of pal) {
            if (c === orig) continue;
            e.ballMap[cand.x][cand.y].bzMap = c;
            if (simulate().length < offenders.length) { improved = true; break; }
            e.ballMap[cand.x][cand.y].bzMap = orig;
          }
          if (improved) break;
        }

        // No repaint helps: take a ball out of the run instead, as long as that
        // doesn't leave the ball above it hanging.
        if (!improved) {
          let removedOne = false;
          for (const cand of cands) {
            const above = e.ballMap[cand.x][cand.y - 1];
            const propped = !above || !above.bzMap ||
                            (e.checkInMap({ x: cand.x + 1, y: cand.y }) && e.ballMap[cand.x + 1][cand.y].bzMap);
            if (!propped) continue;
            e.ballMap[cand.x][cand.y].bzMap = 0;
            removedOne = true;
            break;
          }
          if (!removedOne) return false;
        }
      }
      return false;
    }

    // Recolour anything already sitting in a match so that when the demo's own
    // line bursts, no unrelated balls go with it. Protected cells keep theirs.
    // Set up a scripted "the game plays itself" scene: seed the match balls,
    // spawn a specific piece, and queue the steer / rotate / colour-cycle inputs
    // played as it falls. The real engine handles the fall, landing, match
    // detection and pop, so everything shown is authentic gameplay.
    startAttractPlay(kind, title, caps) {
      const e = this.engine;

      // Never inherit a half-finished lesson. If the previous one was still
      // staging a chain when its scene ran out, its highlight would stay pinned
      // to those cells -- and balls falling into them afterwards left a trio
      // flashing in mismatched colours that wasn't a match at all. Any match it
      // abandoned is resolved here too, so nothing is left for the next
      // lesson's resolver to quietly repaint.
      this.renderer.highlightKeys = new Set();
      this.renderer.highlightActive = new Set();
      if (this.attractPlay && this.attractPlay.phase !== 'done') {
        delete e.checkMatches;
        e.checkMatches();
        e.droppingPathsMap = new Map();
      }
      this.attractPlay = null;
      // Only the first lesson lays out the heap; the others carry straight on
      // from the board the previous one left behind, with no reset.
      if (kind === 'match5') this.demoBuildPile();

      // Same small palette and same match colour for every scene in the run.
      const pal = this.demoPalette || [1, 2, 3];
      const C = this.demoMatchColor || pal[0];
      const others = pal.filter(c => c !== C);
      const o1 = others[0] !== undefined ? others[0] : C;
      const o2 = others[1] !== undefined ? others[1] : o1;

      const setPiece = (rel, colors, rootX, rootY) => {
        for (let i = 0; i <= 3; i++) {
          e.oddballz.rel[i].x = rel[i].x;  e.oddballz.rel[i].y = rel[i].y;
          e.oddballz.image[i] = colors[i];
          e.oddballz.map[i].x = rootX + rel[i].x;
          e.oddballz.map[i].y = rootY + rel[i].y;
          e.activeRel[i].x = rel[i].x;  e.activeRel[i].y = rel[i].y;
          e.targetRel[i].x = rel[i].x;  e.targetRel[i].y = rel[i].y;
        }
        e.activeFloatPos.x = rootX;  e.activeFloatPos.y = rootY;
        e.targetFloatX = rootX;
        e.isZipping = false;
      };

      e.endGame = false;
      e.matcher = true;
      e.build();
      e.direction = 2;                        // fall down-left
      // Landing must NOT clear immediately -- we hold the completed line on
      // screen first, then fire the match by hand. Shadow checkMatches rather
      // than clearing `matcher`, because rotColors() (the F key) is gated on
      // matcher and would stop working. Removed again after the hold.
      e.checkMatches = function () {};

      // A straight 4-ball bar, spawned upright so it visibly rotates into place.
      // Rotated CW the cells sit at root-1, root, root+1, root+2 for image
      // indices 3, 0, 1, 2 respectively.
      const upright = [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2 }, { x: 0, y: 1 }];
      // The 4-ball diamond (ballShapes[0]). Whether or not it is rotated, the
      // image[0] ball is always one of the two that come to rest on the pile.
      const diamond = [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }];
      const steps = [];
      // Colour isolations are applied AFTER the board sanitiser, otherwise its
      // refills can quietly reintroduce the very colours we cleared away.
      const postIsolate = [];
      let perpColors = null;   // the diamond's non-match colours, chosen to fit

      if (kind === 'perp3') {
        // Nothing is added to the board here -- the vertical pair at (12,13)
        // and (13,15) has been sitting in the heap since it was built, so the
        // board doesn't visibly change between lessons. Just repair them in
        // case the previous lesson's cascade disturbed anything.
        for (const p of [[12, 14], [13, 16]]) {
          if (!e.ballMap[p[0]][p[1]].bzMap) e.ballMap[p[0]][p[1]].bzMap = this.demoSafeColor(p[0], p[1]);
        }
        e.ballMap[12][13].bzMap = C;
        e.ballMap[13][15].bzMap = C;
        // Clear the lane the diamond drops into.
        [[10, 10], [11, 10], [11, 11], [12, 11]].forEach(c => { e.ballMap[c[0]][c[1]].bzMap = 0; });

        // Only the taught line is isolated.
        postIsolate.push({ cells: [{ x: 12, y: 13 }, { x: 13, y: 15 }, { x: 11, y: 11 }], color: C });

        // Rather than repaint the heap so the piece fits -- which showed up as a
        // ball changing colour in the middle of the board just before this
        // lesson began -- pick the diamond's other three colours to suit the
        // heap exactly as it already is. Each is tried against the real match
        // rule at the cell it will land on.
        const palOrder = pal.filter(c => c !== C).concat([C]);
        const tentative = [];
        e.ballMap[11][11].bzMap = C;
        tentative.push([11, 11]);
        const chooseFor = (x, y) => {
          for (const col of palOrder) {
            e.ballMap[x][y].bzMap = col;
            if (!this.demoCellInMatch(x, y)) { tentative.push([x, y]); return col; }
          }
          e.ballMap[x][y].bzMap = palOrder[0];
          tentative.push([x, y]);
          return palOrder[0];
        };
        const dA = chooseFor(10, 10);
        const dB = chooseFor(11, 10);
        const dC = chooseFor(12, 11);
        for (const t of tentative) e.ballMap[t[0]][t[1]].bzMap = 0;
        perpColors = [dA, dB, dC];

        // [dC,C,dA,dB] --F--> [C,dA,dB,dC], landing C at (11,11) to top the column.
        setPiece(diamond, [dC, C, dA, dB], 13, 6);
        steps.push({ y: 7.0, fn: () => e.transform(e.rotCW) });   // spin the diamond
        steps.push({ y: 8.0, fn: () => e.moveOBall(1) });
        steps.push({ y: 8.9, fn: () => e.moveOBall(1) });         // root 13 -> 11
        steps.push({ y: 9.8, fn: () => e.rotColors() });          // F
      } else if (kind === 'support') {
        // No reset: this lesson uses the gap that has been part of the heap all
        // along (x 15-16). Just make sure its landing row is clear.
        for (let x = 14; x <= 19; x++) e.ballMap[x][11].bzMap = 0;

        // Simulate the drop with a sentinel colour to find where the overhanging
        // ball comes to rest. If it happened to land in a match it would clear,
        // which would completely undercut the point of this lesson.
        const snap = [];
        for (let x = 4; x <= 20; x++) {
          for (let y = 0; y <= 19; y++) snap.push(e.ballMap[x][y].bzMap);
        }
        const SENTINEL = 6;                       // outside the demo palette
        e.ballMap[15][11].bzMap = SENTINEL;
        e.ballMap[16][11].bzMap = C;
        e.ballMap[17][11].bzMap = o1;
        e.ballMap[18][11].bzMap = C;
        let sg = 0; while (sg++ < 40 && !e.checkGaps()) { /* settle */ }
        let restX = -1, restY = -1;
        for (let x = 4; x <= 20; x++) {
          for (let y = 0; y <= 19; y++) {
            if (e.ballMap[x][y].bzMap === SENTINEL) { restX = x; restY = y; }
          }
        }
        let si = 0;
        for (let x = 4; x <= 20; x++) {
          for (let y = 0; y <= 19; y++) e.ballMap[x][y].bzMap = snap[si++];
        }
        e.droppingPathsMap = new Map();

        // Keep each landing cell -- and the spot the ball drops into -- clear of
        // its own colour, so nothing here can form a match.
        postIsolate.push({ cells: [{ x: 15, y: 11 }], color: o2 });
        postIsolate.push({ cells: [{ x: 16, y: 11 }, { x: 18, y: 11 }], color: C });
        postIsolate.push({ cells: [{ x: 17, y: 11 }], color: o1 });
        if (restX >= 0) postIsolate.push({ cells: [{ x: restX, y: restY }], color: o2 });

        // A flat bar steered right; the ball that ends up at x 15 overhangs the
        // gap, while x 16-18 come to rest on solid ground.
        setPiece(upright, [C, o1, C, o2], 11, 5);
        steps.push({ y: 6.0, fn: () => e.transform(e.rotCW) });   // upright -> flat
        steps.push({ y: 8.6, fn: () => e.moveOBall(4) });
        steps.push({ y: 8.9, fn: () => e.moveOBall(4) });
        steps.push({ y: 9.2, fn: () => e.moveOBall(4) });
        steps.push({ y: 9.5, fn: () => e.moveOBall(4) });
        steps.push({ y: 9.8, fn: () => e.moveOBall(4) });         // root 11 -> 16
      } else {
        // Two of the match colour already resting on the pile surface.
        e.ballMap[5][11].bzMap = C;
        e.ballMap[6][11].bzMap = C;
        // The taught line...
        postIsolate.push({ cells: [{ x: 5, y: 11 }, { x: 6, y: 11 }, { x: 7, y: 11 },
                                   { x: 8, y: 11 }, { x: 9, y: 11 }], color: C });
        // ...and the piece's odd ball, which lands at (10,11) and would
        // otherwise be free to complete a line of its own.
        postIsolate.push({ cells: [{ x: 10, y: 11 }], color: o1 });

        // Starts [C,C,C,o1] -- a wrong-coloured ball at x 7 leaves a gap.
        // One F press -> [C,C,o1,C] puts C at x 7,8,9, completing 5,6,7,8,9.
        setPiece(upright, [C, C, C, o1], 11, 5);
        steps.push({ y: 6.0, fn: () => e.transform(e.rotCW) });   // upright -> flat
        steps.push({ y: 7.0, fn: () => e.moveOBall(1) });
        steps.push({ y: 7.8, fn: () => e.moveOBall(1) });
        steps.push({ y: 8.6, fn: () => e.moveOBall(1) });         // root 11 -> 8
        steps.push({ y: 9.4, fn: () => e.rotColors() });          // F fills the gap
      }

      // Every ball in the completed line -- highlighted once the piece lands,
      // so the whole match is visibly lined up before it bursts.
      const matchCells = (kind === 'perp3') ? ['11_11', '12_13', '13_15']
                       : (kind === 'support') ? ['15_11']
                       : ['5_11', '6_11', '7_11', '8_11', '9_11'];

      // Nothing on the board may already be a match, and nothing may be able to
      // form one where the demo's balls land. Seeded match balls keep theirs.
      // The caption follows the lesson's own cells until something else (a
      // completed line, a chain) takes over.
      this.attractFocus = matchCells.map(k => {
        const p = k.split('_');
        return { x: +p[0], y: +p[1] };
      });

      // Cells that must stay filled: the landing shelf and the props under the
      // perpendicular pair. They may be repainted, never removed.
      // Deliberately minimal -- just the cells that actually hold up a landing
      // ball. Protecting more than this blocks the repainting/removal the
      // resolver needs to clear accidental matches.
      const structural = new Set([
        '6_12', '8_12', '9_12', '11_12', '12_12',  // under the five-in-a-row / diamond
        '17_12', '18_12',                          // under the gravity lesson's bar
        '12_14', '13_16'                           // props under the perpendicular pair
      ]);

      // The perpendicular pair lives in the heap across every lesson, so it is
      // protected in all of them -- otherwise the resolver would repaint it.
      const protect = new Set(matchCells);
      protect.add('12_13');
      protect.add('13_15');
      // The five-in-a-row lesson leaves its odd ball here; it must survive into
      // the next lesson rather than being quietly deleted during setup.
      protect.add('10_11');

      this.demoResolveBoard(protect, postIsolate, structural);
      if (kind === 'support') {
        this.demoEnsureCleanDrop([[15, 11, o2], [16, 11, C], [17, 11, o1], [18, 11, C]]);
      }
      // NOTE: the colour lessons deliberately do NOT force "only the taught
      // line may match". Letting a landing complete a second line is where the
      // demo's variety comes from -- it is shown afterwards as a chain, so it
      // stays readable without being suppressed.

      this.renderer.updateScene(e);
      this.attractPlay = {
        kind: kind, steps: steps, landed: false, color: C,
        // The diamond spawns a row lower, so it falls slightly slower to reach
        // the heap at the same moment the other lessons do.
        speed: (kind === 'perp3') ? 1.67 : 2.0,
        title: title || 'COLOR MATCH', caps: caps || [],
        matchCells: matchCells, phase: 'falling', holdMs: 1900, holdUntil: 0
      };
    }

    // Advances the scripted scene one frame (driven from gameLoop).
    // falling -> (piece lands, line complete) -> hold+pulse -> burst.
    updateAttractPlay(dt) {
      const play = this.attractPlay;
      if (!play || play.phase === 'done') return;
      const e = this.engine;
      const now = performance.now();

      const settle = () => { let g = 0; while (g++ < 40 && !e.checkGaps()) { /* fall */ } };
      const finish = () => {
        e.score = 0; e.level = 1; e.skill = 1; e.ballCount = 0;
        e.rows = 0; e.rowCount = 0; e.matchesDone = 0; e.matchCount = 0; e.sameBonus = 0;
        this.renderer.updateScene(e);
        this.updateUI();
        play.phase = 'done';
        play.landed = true;
      };

      if (play.phase === 'hold') {
        this.renderer.updateScene(e);
        if (now >= play.holdUntil) {
          this.renderer.highlightKeys = new Set();
          this.renderer.highlightActive = new Set();
          delete e.checkMatches;     // restore the engine's real implementation

          this.setAttractCaption(play.title, play.caps[3] || '');

          if (play.kind === 'support') { settle(); finish(); return; }

          // Burst ONLY the line being taught. Anything else the landing
          // completed is left on the board deliberately -- the cascade phase
          // below picks it up and shows it as its own chain, one line at a
          // time, which is how a second match stays readable.
          this.demoPop(play.matchCells.map(k => {
            const p = k.split('_');
            return { x: +p[0], y: +p[1] };
          }));
          settle();
          this.renderer.updateScene(e);
          play.phase = 'cascade';
          play.chain = 0;
          play.highlighting = false;
          // Let the burst caption be read before a chain can replace it.
          play.nextAt = now + 1600;
        }
        return;
      }

      // Balls falling into the gap can complete further lines. Rather than let
      // the engine resolve them instantly, spotlight each one so the chain is
      // actually visible.
      if (play.phase === 'cascade') {
        this.renderer.updateScene(e);
        if (now < play.nextAt) return;

        if (play.highlighting) {
          this.renderer.highlightKeys = new Set();
          this.demoPop(play.chainCells);
          settle();
          this.renderer.updateScene(e);
          play.highlighting = false;
          play.nextAt = now + 800;
          return;
        }

        // Spotlight ONE line at a time. A cascade can complete two lines of
        // different colours at once, and highlighting them together just looks
        // like a jumble of mismatched balls flashing.
        const found = this.demoFindMatchCells();
        let cells = [];
        if (found.length) {
          const byColour = new Map();
          for (const c of found) {
            const v = e.ballMap[c.x][c.y].bzMap;
            if (!byColour.has(v)) byColour.set(v, []);
            byColour.get(v).push(c);
          }
          for (const group of byColour.values()) {
            if (group.length > cells.length) cells = group;
          }
        }
        if (cells.length) {
          if (play.chain < 2) {
            play.chain++;
            play.chainCells = cells;
            play.highlighting = true;
            this.renderer.highlightKeys = new Set(cells.map(c => c.x + '_' + c.y));
            this.attractFocus = cells;
            this.setAttractCaption(play.title, play.chain === 1
              ? 'The balls above drop in &mdash; and land <b>another match!</b>'
              : '<b>Chain reaction!</b> One drop keeps setting off the next&hellip;');
            play.nextAt = now + 1600;
          } else {
            e.checkMatches();          // resolve any remainder, never leave one
            this.renderer.updateScene(e);
            finish();
          }
          return;
        }
        finish();
        return;
      }

      const y = e.activeFloatPos ? e.activeFloatPos.y : 0;
      for (const s of play.steps) {
        if (!s.done && y >= s.y) { s.done = true; s.fn(); }
      }

      const landed = e.updateContinuous(Math.min(dt, 0.05) * play.speed);
      this.renderer.updateScene(e);

      if (landed) {
        // Piece is stamped and the line is now fully formed. Hold it there and
        // pulse every ball in the match so the whole line reads before it goes.
        e.endGame = true;            // hide the piece the engine queued up next
        this.renderer.updateScene(e);
        // Spotlight just the line being taught. If the landing happened to
        // complete another line as well, that one is shown afterwards as a
        // chain rather than lumped in here -- highlighting both together was
        // what made a group of mismatched colours appear to flash as one match.
        this.renderer.highlightKeys = new Set(play.matchCells);
        this.renderer.highlightActive = new Set();
        this.attractFocus = play.matchCells.map(k => {
          const p = k.split('_');
          return { x: +p[0], y: +p[1] };
        });
        this.setAttractCaption(play.title, play.caps[2] || '');
        play.phase = 'hold';
        play.holdUntil = now + play.holdMs;
      }
    }

    gameLoop(currentTime) {
      const dt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      if (this.isPlaying && !this.isPaused) {
        const stamped = this.engine.updateContinuous(dt);
        if (stamped && this.engine.endGame) {
          this.handleGameOver();
        }

        this.renderer.updateScene(this.engine);
        this.updateUI();

        if (this.engine.oddballz && Math.random() < 0.3) {
          const rootFloatX = this.engine.activeFloatPos ? this.engine.activeFloatPos.x : this.engine.oddballz.map[0].x;
          const rootFloatY = this.engine.activeFloatPos ? this.engine.activeFloatPos.y : this.engine.oddballz.map[0].y;
          const wPos = gridToWorld(rootFloatX, rootFloatY, SPHERE_RADIUS);
          this.particles.spawnTrailParticle(wPos, this.engine.oddballz.image[0]);
        }
      } else if (this.attractActive && this.attractPlay) {
        this.updateAttractPlay(dt);
      }

      this.particles.update(Math.min(dt, 0.1));
      this.renderer.render(Math.min(dt, 0.1));

      requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleGameOver() {
      this.isPlaying = false;
      this.setModeTabsDisabled(false);
      this.updateHighScores(this.engine.score, this.engine.level, this.engine.skill);
      document.getElementById('finalScore').textContent = this.engine.score;
      document.getElementById('overlayGameOver').classList.remove('hidden');
      document.getElementById('btnPause').disabled = true;
    }

    updateUI() {
      document.getElementById('statScore').textContent = this.engine.score;
      const lvlEl = document.getElementById('statLevel');
      lvlEl.textContent = this.engine.level;
      if (this.engine.levCol > 0) {
        lvlEl.style.color = '#f43f5e';
      } else {
        lvlEl.style.color = '';
      }
      document.getElementById('statSkill').textContent = this.engine.skill;
      document.getElementById('statBalls').textContent = this.engine.ballCount;
    }

    updateHighScores(score, level, skill) {
      if (score <= 0) return;
      this.highScores.push({
        date: new Date().toLocaleDateString(),
        score: score,
        level: level,
        skill: skill,
        mode: this.engine.matcher ? 'Color Match' : 'Row Build'
      });

      this.highScores.sort((a, b) => b.score - a.score);
      this.highScores = this.highScores.slice(0, 10);
      localStorage.setItem('oddballz_hd_hiscores', JSON.stringify(this.highScores));
    }

    showHighScoresModal() {
      if (this.isPlaying && !this.isPaused) {
        this.wasPausedByModal = true;
        this.isPaused = true;
      }

      const tbody = document.getElementById('recordsTableBody');
      if (tbody) {
        tbody.innerHTML = '';
        if (this.highScores.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:1rem 0;">No records saved yet!</td></tr>';
        } else {
          this.highScores.forEach((hs, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="font-weight:bold; color:var(--text-muted);">#${idx + 1}</td>
              <td style="font-weight:bold; color:var(--accent-gold);">${hs.score}</td>
              <td>Lvl ${hs.level}</td>
              <td style="font-size:0.8rem; color:var(--accent-cyan);">${hs.mode}</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }
      const modal = document.getElementById('gameDialogView');
      if (modal) modal.classList.remove('hidden');
    }

    closeHighScoresModal() {
      const modal = document.getElementById('gameDialogView');
      if (modal) modal.classList.add('hidden');

      if (this.wasPausedByModal) {
        this.wasPausedByModal = false;
        if (this.isPlaying && this.isPaused) {
          this.isPaused = false;
          this.lastTime = performance.now();
        }
      }
    }

    showAboutModal() {
      if (this.isPlaying && !this.isPaused) {
        this.wasPausedByModal = true;
        this.isPaused = true;
      }
      const modal = document.getElementById('gameDialogAbout');
      if (modal) modal.classList.remove('hidden');
    }

    closeAboutModal() {
      const modal = document.getElementById('gameDialogAbout');
      if (modal) modal.classList.add('hidden');

      if (this.wasPausedByModal) {
        this.wasPausedByModal = false;
        if (this.isPlaying && this.isPaused) {
          this.isPaused = false;
          this.lastTime = performance.now();
        }
      }
    }

    saveAudioSettings() {
      const settings = {
        masterEnabled: this.audio.enabled,
        musicEnabled: this.audio.musicEnabled,
        sfxEnabled: this.audio.sfxEnabled,
        musicVolume: this.audio.musicVolume,
        sfxVolume: this.audio.sfxVolume
      };
      localStorage.setItem('oddballz_hd_audio_settings', JSON.stringify(settings));
    }

    syncAudioUI() {
      const toggleMaster = document.getElementById('toggleSoundMaster');
      const toggleMusic = document.getElementById('toggleMusic');
      const toggleSFX = document.getElementById('toggleSFX');
      const sliderMusic = document.getElementById('sliderMusicVolume');
      const sliderSFX = document.getElementById('sliderSFXVolume');
      const valMusic = document.getElementById('valMusicVolume');
      const valSFX = document.getElementById('valSFXVolume');

      if (toggleMaster) toggleMaster.checked = this.audio.enabled;
      if (toggleMusic) toggleMusic.checked = this.audio.musicEnabled;
      if (toggleSFX) toggleSFX.checked = this.audio.sfxEnabled;

      if (sliderMusic) sliderMusic.value = Math.round(this.audio.musicVolume * 100);
      if (sliderSFX) sliderSFX.value = Math.round(this.audio.sfxVolume * 100);

      if (valMusic) valMusic.textContent = `${Math.round(this.audio.musicVolume * 100)}%`;
      if (valSFX) valSFX.textContent = `${Math.round(this.audio.sfxVolume * 100)}%`;
    }

    showAudioModal() {
      if (this.isPlaying && !this.isPaused) {
        this.wasPausedByModal = true;
        this.isPaused = true;
      }
      this.syncAudioUI();
      const modal = document.getElementById('gameDialogAudio');
      if (modal) modal.classList.remove('hidden');
    }

    closeAudioModal() {
      const modal = document.getElementById('gameDialogAudio');
      if (modal) modal.classList.add('hidden');

      if (this.wasPausedByModal) {
        this.wasPausedByModal = false;
        if (this.isPlaying && this.isPaused) {
          this.isPaused = false;
          this.lastTime = performance.now();
        }
      }
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.oddApp = new OddballzApp();
  });
})();
