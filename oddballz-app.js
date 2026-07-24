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
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    startBGM() {
      if (this.bgmPlaying || !this.enabled) return;
      this.init();
      if (!this.ctx) return;
      this.bgmPlaying = true;
      this.bgmStep = 0;
      const stepDuration = 60 / this.bgmTempo / 4;
      this.bgmTimer = setInterval(() => {
        if (!this.bgmPlaying || !this.enabled || !this.ctx) return;
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
        pulseOsc.connect(pulseGain); pulseGain.connect(this.ctx.destination);
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
        crash.connect(filter); filter.connect(crashGain); crashGain.connect(this.ctx.destination);
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
        gain.connect(this.ctx.destination);

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
            gain.connect(this.ctx.destination);
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

        leadGain.connect(this.ctx.destination);
        leadGain.connect(delayNode);
        delayNode.connect(delayFeedback);
        oscRoot.start(now); oscRoot.stop(now + dur);
        oscChorus.start(now); oscChorus.stop(now + dur);
      }
    }

    playChimeTone(noteFreq, startTime, dur, vol = 0.05) {
      if (!this.ctx) return;
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
      gain.connect(this.ctx.destination);

      lfo.start(startTime); lfo.stop(startTime + dur);
      oscSine.start(startTime); oscSine.stop(startTime + dur);
      oscTri.start(startTime);  oscTri.stop(startTime + dur);
    }

    playSound(type, param = 0) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

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
          gain.connect(this.ctx.destination);
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
          gain.connect(this.ctx.destination);

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
          gain.connect(this.ctx.destination);

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
          gain.connect(this.ctx.destination);

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
            filter.connect(gain); gain.connect(this.ctx.destination);
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
          gain.connect(this.ctx.destination);

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
          gain.connect(this.ctx.destination);
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

            osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
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
          leadGain.connect(this.ctx.destination);
          leadGain.connect(delayNode);
          delayNode.connect(delayFeedback);
          delayFeedback.connect(delayNode);
          delayFeedback.connect(this.ctx.destination);

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

              if (this.staticBallMeshes.has(fromKey)) {
                mesh = this.staticBallMeshes.get(fromKey);
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

      for (const mesh of this.staticBallMeshes.values()) {
        mesh.scale.set(1.0, 1.0, 1.0);

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
      }

      if (this.activeMeshes) {
        for (const mesh of this.activeMeshes) {
          if (mesh.visible && mesh.targetPos) {
            mesh.position.lerp(mesh.targetPos, lerpSpeed);
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

      this.highScores = JSON.parse(localStorage.getItem('oddballz_hd_hiscores') || '[]');

      this.initHooks();
      this.initEventListeners();
      this.initTouchControls();
      this.updateUI();

      this.renderer.updateScene(this.engine);
      requestAnimationFrame((t) => this.gameLoop(t));
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
          const toggle = document.getElementById('toggleSound');
          toggle.checked = !toggle.checked;
          this.audio.enabled = toggle.checked;
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

      document.getElementById('toggleSound').addEventListener('change', (e) => {
        this.audio.enabled = e.target.checked;
        if (this.audio.enabled && this.isPlaying && !this.isPaused) {
          this.audio.startBGM();
        } else {
          this.audio.stopBGM();
        }
      });

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
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.oddApp = new OddballzApp();
  });
})();
