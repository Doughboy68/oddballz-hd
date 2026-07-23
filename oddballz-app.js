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
    const worldX = (cx - cy * 0.5) * HEX_SPACING_X;
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
      const config = Math.floor(Math.random() * this.shapes);
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
        this.oddballz.rel[i].x = this.ballShapes[config][i - 1].x;
        this.oddballz.rel[i].y = this.ballShapes[config][i - 1].y;
        this.oddballz.map[i].x = this.oddballz.map[0].x + this.ballShapes[config][i - 1].x;
        this.oddballz.map[i].y = this.oddballz.map[0].y + this.ballShapes[config][i - 1].y;
      }

      const rotCount = Math.floor(Math.random() * 6);
      for (let i = 0; i < rotCount; i++) this.transform(this.rotCW);
      if (Math.random() < 0.5) this.transform(this.flipX);
      if (Math.random() < 0.5) this.transform(this.flipY);

      this.ballCount++;
    }

    transform(tMatrix) {
      let transable = true;
      const saveMove = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];

      for (let i = 1; i <= 3; i++) {
        const rx = this.oddballz.rel[i].x + 2;
        const ry = this.oddballz.rel[i].y + 2;
        if (rx < 0 || rx > 4 || ry < 0 || ry > 4) {
          transable = false;
          break;
        }
        saveMove[i].x = tMatrix[ry][rx].x;
        saveMove[i].y = tMatrix[ry][rx].y;
        const pts = {
          x: this.oddballz.map[0].x + saveMove[i].x,
          y: this.oddballz.map[0].y + saveMove[i].y
        };

        if (!this.checkInMap(pts) || this.ballMap[pts.x][pts.y].bzMap !== 0) {
          transable = false;
          break;
        }
      }

      if (transable) {
        for (let i = 1; i <= 3; i++) {
          this.oddballz.rel[i].x = saveMove[i].x;
          this.oddballz.rel[i].y = saveMove[i].y;
          this.oddballz.map[i].x = this.oddballz.map[0].x + saveMove[i].x;
          this.oddballz.map[i].y = this.oddballz.map[0].y + saveMove[i].y;
        }
      }
      return transable;
    }

    moveOBall(dir) {
      let moveable = true;
      const saveMove = [];

      for (let i = 0; i <= 3; i++) {
        const pts = { x: this.oddballz.map[i].x, y: this.oddballz.map[i].y };
        moveInDirection(pts, dir);
        if (this.checkInMap(pts) && this.ballMap[pts.x][pts.y].bzMap === 0) {
          saveMove[i] = { x: pts.x, y: pts.y };
        } else {
          moveable = false;
          break;
        }
      }

      if (moveable) {
        for (let i = 0; i <= 3; i++) {
          this.oddballz.map[i].x = saveMove[i].x;
          this.oddballz.map[i].y = saveMove[i].y;
        }
      }
      return moveable;
    }

    getGhostPositions() {
      const ghostMap = this.oddballz.map.map(p => ({ x: p.x, y: p.y }));
      let canMove = true;

      while (canMove) {
        const nextMap = [];
        for (let i = 0; i <= 3; i++) {
          const pts = { x: ghostMap[i].x, y: ghostMap[i].y };
          moveInDirection(pts, this.direction);
          if (this.checkInMap(pts) && this.ballMap[pts.x][pts.y].bzMap === 0) {
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
      moveInDirection(p1, 2);
      moveInDirection(p2, 5);

      const empty1 = this.checkInMap(p1) && this.ballMap[p1.x][p1.y].bzMap === 0;
      const empty2 = this.checkInMap(p2) && this.ballMap[p2.x][p2.y].bzMap === 0;

      return !(empty1 && empty2);
    }

    checkGaps() {
      let noneDropped = true;
      let flipGate = true;

      for (let y = 19; y >= 0; y--) {
        for (let x = 4; x <= 20; x++) {
          const startPts = { x: x, y: y };
          const saveColor = this.ballMap[x][y].bzMap;

          if (this.checkInMap(startPts) && saveColor !== 0) {
            if (!this.supported(startPts)) {
              noneDropped = false;
              let current = { x: x, y: y };

              while (!this.supported(current)) {
                this.ballMap[current.x][current.y].bzMap = 0;
                const dropDir = flipGate ? 2 : 5;
                flipGate = !flipGate;

                const target = { x: current.x, y: current.y };
                moveInDirection(target, dropDir);

                if (this.checkInMap(target) && this.ballMap[target.x][target.y].bzMap === 0) {
                  current = target;
                }
                this.ballMap[current.x][current.y].bzMap = saveColor;
                if (this.onPlaySound) this.onPlaySound('drop');
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
  }

  // --- 3. SOUND SYNTHESIS ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.freq = [25, 27, 28, 30, 32, 33, 35, 37, 39, 40, 42, 44, 45, 47, 49, 51, 52, 54, 56];
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
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const fIndex = Math.min(Math.max(param, 0), this.freq.length - 1);
          const pitch = (this.freq[fIndex] || 30) * 12;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(pitch, now);
          osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, now + 0.06);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }
        case 'pop': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(1400, now + 0.14);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.14);
          break;
        }
        case 'zip': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(850, now);
          osc.frequency.linearRampToValueAtTime(150, now + 0.05);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
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
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(900, now);
          osc.frequency.linearRampToValueAtTime(80, now + 0.6);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
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

      const aspect = window.innerWidth / window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
      this.camera.position.set(0, -14.5, 17.5);
      this.camera.lookAt(0, 1.2, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;

      this.container.appendChild(this.renderer.domElement);

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

      this.staticBallMeshes = new Map();
      window.addEventListener('resize', () => this.onWindowResize());
    }

    initMaterials() {
      const colors = [
        { main: 0x00d2ff, roughness: 0.15, metalness: 0.3, emissive: 0x003366 },
        { main: 0xff2a5f, roughness: 0.15, metalness: 0.3, emissive: 0x550011 },
        { main: 0x00e676, roughness: 0.2,  metalness: 0.2, emissive: 0x004411 },
        { main: 0xffc107, roughness: 0.2,  metalness: 0.4, emissive: 0x553300 },
        { main: 0xb030ff, roughness: 0.15, metalness: 0.3, emissive: 0x330055 },
        { main: 0xff00b7, roughness: 0.15, metalness: 0.3, emissive: 0x550033 }
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

      const chassisGeo = new THREE.BoxGeometry(22, 22, 0.4);
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x090c15, roughness: 0.8, metalness: 0.2 });
      const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
      chassisMesh.position.set(0, 0, -0.5);
      chassisMesh.receiveShadow = true;
      this.boardGroup.add(chassisMesh);
    }

    updateScene(engine) {
      const currentKeys = new Set();

      for (let x = 4; x <= 20; x++) {
        for (let y = 0; y <= 19; y++) {
          const val = engine.ballMap[x][y].bzMap;
          const key = `${x}_${y}`;

          if (val > 0) {
            currentKeys.add(key);
            const colorIdx = (val - 1) % this.ballMaterials.length;
            const mat = this.ballMaterials[colorIdx];

            let mesh = this.staticBallMeshes.get(key);
            if (!mesh) {
              mesh = new THREE.Mesh(this.sphereGeo, mat);
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              const wPos = gridToWorld(x, y, SPHERE_RADIUS);
              mesh.position.set(wPos.x, wPos.y, wPos.z);
              this.ballsGroup.add(mesh);
              this.staticBallMeshes.set(key, mesh);
            } else {
              mesh.material = mat;
            }
          }
        }
      }

      for (const [key, mesh] of this.staticBallMeshes.entries()) {
        if (!currentKeys.has(key)) {
          this.ballsGroup.remove(mesh);
          this.staticBallMeshes.delete(key);
        }
      }

      this.activeGroup.clear();
      if (!engine.endGame && engine.oddballz) {
        let avgX = 0, avgY = 0, avgZ = 0;
        for (let i = 0; i <= 3; i++) {
          const mapPts = engine.oddballz.map[i];
          const val = engine.oddballz.image[i];

          if (val > 0) {
            const colorIdx = (val - 1) % this.ballMaterials.length;
            const mat = this.ballMaterials[colorIdx];
            const mesh = new THREE.Mesh(this.sphereGeo, mat);
            mesh.castShadow = true;

            const wPos = gridToWorld(mapPts.x, mapPts.y, SPHERE_RADIUS);
            mesh.position.set(wPos.x, wPos.y, wPos.z);
            this.activeGroup.add(mesh);

            avgX += wPos.x; avgY += wPos.y; avgZ += wPos.z;
          }
        }

        avgX /= 4; avgY /= 4; avgZ /= 4;
        this.activePointLight.position.set(avgX, avgY, avgZ + 1.5);
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

    render() {
      this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
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
        if (code === 'Enter') {
          if (!this.isPlaying || this.engine.endGame) this.startGame();
          e.preventDefault(); return;
        }

        if (code === 'KeyM') {
          const toggle = document.getElementById('toggleSound');
          toggle.checked = !toggle.checked;
          this.audio.enabled = toggle.checked;
          e.preventDefault(); return;
        }

        if (!this.isPlaying) return;

        if (code === 'KeyP') {
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

      document.getElementById('btnOverlayStart').addEventListener('click', () => this.startGame());
      document.getElementById('btnRestart').addEventListener('click', () => this.startGame());
      document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
      document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
      document.getElementById('btnPauseEnd').addEventListener('click', () => this.promptEndGame());
      document.getElementById('btnConfirmEndYes').addEventListener('click', () => this.confirmEndGame());
      document.getElementById('btnConfirmEndNo').addEventListener('click', () => this.closeEndGameModal());

      ['btnHighScores', 'btnGameOverHighScores'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => this.showHighScoresModal());
      });

      document.getElementById('btnCloseModal').addEventListener('click', () => this.closeHighScoresModal());

      document.getElementById('toggleSound').addEventListener('change', (e) => {
        this.audio.enabled = e.target.checked;
      });

      const tabColor = document.getElementById('tabColorMatch');
      const tabRow = document.getElementById('tabRowBuild');

      tabColor.addEventListener('click', () => this.switchMode(true));
      tabRow.addEventListener('click', () => this.switchMode(false));
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
      bindTouch('btnTouchFlip', () => {
        if (!this.engine.transform(this.engine.flipX)) {
          this.engine.transform(this.engine.flipY);
        }
      });
      bindTouch('btnTouchF', () => this.engine.rotColors());
      bindTouch('btnTouchSpace', () => this.engine.zip());

      // Auto-pause when window or browser tab loses focus
      const handleFocusLoss = () => {
        if (this.isPlaying && !this.isPaused) {
          this.togglePause();
        }
      };

      const handleFocusGain = () => {
        if (this.audio) {
          this.audio.init();
        }
      };

      window.addEventListener('blur', handleFocusLoss);
      window.addEventListener('focus', handleFocusGain);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          handleFocusLoss();
        } else {
          handleFocusGain();
        }
      });
    }

    switchMode(isColorMatch) {
      const tabColor = document.getElementById('tabColorMatch');
      const tabRow = document.getElementById('tabRowBuild');
      this.engine.matcher = isColorMatch;

      if (isColorMatch) {
        tabColor.classList.add('active');
        tabRow.classList.remove('active');
      } else {
        tabRow.classList.add('active');
        tabColor.classList.remove('active');
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

      document.getElementById('overlayStart').classList.add('hidden');
      document.getElementById('overlayGameOver').classList.add('hidden');
      document.getElementById('overlayPause').classList.add('hidden');
      document.getElementById('btnPause').disabled = false;

      this.renderer.updateScene(this.engine);
      this.updateUI();
    }

    togglePause() {
      if (!this.isPlaying) return;
      this.isPaused = !this.isPaused;

      if (this.isPaused) {
        document.getElementById('overlayPause').classList.remove('hidden');
      } else {
        document.getElementById('overlayPause').classList.add('hidden');
        document.getElementById('dialogConfirmEnd').classList.add('hidden');
        this.lastTime = performance.now();
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
        this.accumulatedTime += dt * 1000;
        const tickDelay = Math.max(16, this.engine.pauseTime);

        if (this.accumulatedTime >= tickDelay) {
          this.accumulatedTime = 0;
          this.moveTime++;

          if (this.moveTime >= 8) {
            this.moveTime = 0;

            if (!this.engine.moveOBall(this.engine.direction)) {
              this.engine.stamp();

              if (this.engine.matcher) {
                this.engine.checkMatches();
              }

              const prevLevel = this.engine.level;
              this.engine.checkAdvance();

              if (this.engine.level > prevLevel && typeof window.confetti === 'function') {
                window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
              }

              if (this.engine.checkGameOver()) {
                this.handleGameOver();
              } else {
                this.engine.build();
              }
            }
          }

          this.renderer.updateScene(this.engine);
          this.updateUI();
        }

        if (this.engine.oddballz && Math.random() < 0.3) {
          const lead = this.engine.oddballz.map[0];
          const wPos = gridToWorld(lead.x, lead.y, SPHERE_RADIUS);
          this.particles.spawnTrailParticle(wPos, this.engine.oddballz.image[0]);
        }
      }

      this.particles.update(Math.min(dt, 0.1));
      this.renderer.render();

      requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleGameOver() {
      this.isPlaying = false;
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
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.oddApp = new OddballzApp();
  });
})();
