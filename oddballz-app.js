/**
 * oddballz-app.js - Standalone Oddballz HD Game Engine
 * Compatible with direct file:// loading in browser & local web servers.
 * Uses global THREE and confetti.
 */

(function () {
  // --- 1. HEX MATH ---
  // Board presets, keyed by the width of the bottom edge in balls. Each entry is
  // the classic 1992 hexagon's integer parameters scaled up; WORLD_SCALE then
  // shrinks the hex spacing and the ball radius by the same ratio, so every preset
  // occupies the same world-space extent (x +/-8.0, y +/-8.23) and the camera and
  // the locked mobile scaling maths never see a difference.
  //
  //   bottom edge B = MAX_X - MAX_Y + LOWER    top edge T = UPPER - MIN_X
  //   width       W = MAX_X - MIN_X            height   H = MAX_Y
  //
  // The parameters are NOT independent. SPLIT is pinned twice over: the upper
  // region must reach full width exactly on its last row (SPLIT = MAX_X - UPPER + 2)
  // and the lower region must start narrowing on its first (SPLIT = MIN_X + LOWER).
  // Both must give the same SPLIT, which reduces to
  //
  //   2W = T + B + H - 2
  //
  // Miss it and the hexagon grows extra full-width rows -- a straight vertical
  // section down one side that reads as the board being tilted. Scaling the six
  // values independently and rounding did exactly that: 12 wide gained one such
  // row and 18 wide gained two. Check the constraint before editing this table.
  //
  // Set once at startup by setBoardWidth(); changing it reloads the page rather
  // than trying to remap a live board onto a different grid.
  const BOARD_PRESETS = {
    9:  { MIN_X: 4, MAX_X: 20, MAX_Y: 19, SPLIT: 12, UPPER: 10, LOWER: 8 },
    12: { MIN_X: 5, MAX_X: 27, MAX_Y: 26, SPLIT: 16, UPPER: 13, LOWER: 11 },
    18: { MIN_X: 8, MAX_X: 42, MAX_Y: 40, SPLIT: 24, UPPER: 20, LOWER: 16 }
  };

  // Short names for the presets, used on the high score table.
  const BOARD_SHORT = { 9: 'Classic', 12: 'Roomy', 18: 'Dense' };

  // The row pieces spawn on, and the first row of the visible playfield. Rows above
  // it are the staging area the original masked off, so a piece slides down into
  // view rather than sitting in open space above the board.
  let SPAWN_ROW = 3;

  // Horizontal half-extent the portrait camera keeps in view, as tan(hFov/2).
  // This is the value the original fov expression produced at an iPhone's aspect
  // (0.571), kept as the reference so phones render exactly as before.
  const MOBILE_H_COVERAGE = 0.35652;

  // Width of a falling ball's glow decal, in grid cells, and its peak opacity.
  // In cells rather than world units so the glow covers the same number of hexes
  // on every board preset instead of shrinking with the balls.
  //
  // These two are a pair and should be tuned together: the span sets how far the
  // glow reaches and the opacity sets how strong it is, so widening the span
  // without dimming makes the middle hotter as well as the edge wider. Board gain
  // measured at 1.5 / 2.2 / 3.0 / 4.0 / 5.2 cells out, at opacity 0.5:
  //
  //   span  5    48.8   15.5    2.1     0      0     -- dies at 3 cells, a blob
  //   span  8    83.7   46.5   20.1    3.7     0
  //   span 11   109     74.2   44.1   19.6    4.1    -- reaches, far too hot
  //
  // 10 with 0.15 keeps the reach of the wide setting at under a third of its
  // strength, which is the soft sheen this is meant to be rather than a pool of
  // light. Note the render() pulse rewrites material.opacity from GLOW_OPACITY on
  // every frame, so setting opacity on the material directly does nothing.
  //
  // Opacity is the dimmer and span is the reach: turning this down does not pull
  // the glow in, it just fades the whole pool evenly, which is usually what is
  // wanted. Reach for GLOW_SPAN_CELLS only when the glow is the wrong size.
  const GLOW_SPAN_CELLS = 10.0;
  const GLOW_OPACITY = 0.15;

  // How much darker the falling piece is than the settled balls. The piece used to
  // share their materials, so it could only be as bright as they are.
  const ACTIVE_BALL_DIM = 0.85;

  // Cruise starfield. Coordinates are camera space: x and y across the view, z
  // negative into the screen, stars travelling toward z = 0.
  const STAR_COUNT = 3000;
  const STAR_FAR = 190;          // where stars are born, straight ahead
  const STAR_SPREAD = 78;        // half-width of the box they are born in
  const STAR_TRAIL = 0.075;      // seconds of travel drawn as a streak behind each
  // Stars are recycled before they reach the playfield, never at a fixed distance.
  // They are additive and the board is opaque, so any star nearer than the board
  // draws on top of it -- and depth testing cannot help, because in front is in
  // front. The real limit is computed from the board's bounding sphere each frame,
  // since the camera pulls back on narrow screens; this is only the floor under it.
  const STAR_NEAR_MIN = 18;
  const STAR_BOARD_MARGIN = 2.5;

  // Asteroids cruise on the same axis as the stars, in the same camera space. They
  // are born further out than the stars because they are solid objects: a rock that
  // reaches the recycle limit vanishes in open view, so it wants to have drifted off
  // the side of the screen well before then. That is what the lateral offset at
  // spawn is for -- perspective sweeps anything off-centre outward as it closes.
  const ROCK_FAR = 210;
  const ROCK_SIDE_MIN = 15;      // never spawn dead centre, where the board is
  const ROCK_SIDE_RANGE = 46;

  let BOARD_WIDTH = 9;
  let BP = BOARD_PRESETS[9];
  let BOARD_RATIO = 1;      // grid size relative to classic
  let WORLD_SCALE = 1;      // world size per grid cell, = 1 / BOARD_RATIO
  let BOARD_BOUNDS = { MIN_X: 4, MAX_X: 20, MIN_Y: 0, MAX_Y: 19 };
  let ALLOC_MAX_X = 24;
  let ALLOC_MAX_Y = 23;
  let CENTER_X = 12;
  let CENTER_Y = 9.5;
  let SPHERE_RADIUS = 0.45;
  let HEX_SPACING_X = 1.0;
  let HEX_SPACING_Y = 0.866;

  function setBoardWidth(w) {
    BOARD_WIDTH = BOARD_PRESETS[w] ? w : 9;
    BP = BOARD_PRESETS[BOARD_WIDTH];
    BOARD_RATIO = (BP.MAX_X - BP.MIN_X) / 16;
    WORLD_SCALE = 1 / BOARD_RATIO;
    BOARD_BOUNDS = { MIN_X: BP.MIN_X, MAX_X: BP.MAX_X, MIN_Y: 0, MAX_Y: BP.MAX_Y };
    ALLOC_MAX_X = BP.MAX_X + 4;
    ALLOC_MAX_Y = BP.MAX_Y + 4;
    CENTER_X = (BP.MIN_X + BP.MAX_X) / 2;
    CENTER_Y = BP.MAX_Y / 2;
    SPAWN_ROW = Math.round(3 * BOARD_RATIO);
    SPHERE_RADIUS = 0.45 * WORLD_SCALE;
    HEX_SPACING_X = 1.0 * WORLD_SCALE;
    HEX_SPACING_Y = 0.866 * WORLD_SCALE;
  }

  function isInBoard(x, y) {
    if (x < BP.MIN_X || x > BP.MAX_X || y < 0 || y > BP.MAX_Y) return false;
    return (y < BP.SPLIT && x < y + BP.UPPER) || (y >= BP.SPLIT && x > y - BP.LOWER);
  }

  function gridToWorld(x, y, zOffset = 0) {
    const cx = x - CENTER_X;
    const cy = y - CENTER_Y;
    const worldX = (cx - cy * 0.5) * HEX_SPACING_X + 1.25;
    const worldY = -cy * HEX_SPACING_Y;
    const worldZ = zOffset;
    return { x: worldX, y: worldY, z: worldZ };
  }

  function buildRowTables() {
    const topmostRow = Math.round(4 * BOARD_RATIO);   // spawn rows are excluded
    const midRow = [];
    for (let y = BP.MAX_Y; y >= topmostRow; y--) {
      for (let x = BP.MIN_X; x <= BP.MAX_X; x++) {
        if (isInBoard(x, y)) { midRow.push({ x: x, y: y }); break; }
      }
    }
    const bottom = [];
    for (let x = BP.MIN_X; x <= BP.MAX_X; x++) {
      if (isInBoard(x, BP.MAX_Y)) bottom.push({ x: x, y: BP.MAX_Y });
    }
    return { midRow: midRow, ltRow: bottom.slice(), rtRow: bottom.slice().reverse() };
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
      // lColors is the difficulty knob that matters most: an extra colour compounds
      // over every ball in a line, so it hurts the 5-in-a-row parallel match far
      // more than the 3-in-a-row perpendicular one. The original ramp reached the
      // 6-colour ceiling at level 6 (~60 matches), long before the speed ramp had
      // gone anywhere, after which colour difficulty never changed again. Each step
      // now takes 3-4 levels instead of 1-2, so 6 colours arrives at level 12:
      //
      //   L1-3 = 3    L4-7 = 4    L8-11 = 5    L12+ = 6
      //
      // lShapes is deliberately left on its original schedule. Note lDelay is dead
      // data -- it is assigned to pauseTime and never read; real fall speed comes
      // from the baseSpeed line in updateContinuous.
      this.levAttr = [
        { lDelay: 100, lShapes: 2, lColors: 3 },
        { lDelay: 100, lShapes: 2, lColors: 3 },
        { lDelay: 100, lShapes: 3, lColors: 3 },
        { lDelay: 100, lShapes: 3, lColors: 4 },
        { lDelay: 100, lShapes: 4, lColors: 4 },
        { lDelay: 100, lShapes: 4, lColors: 4 },
        { lDelay: 100, lShapes: 5, lColors: 4 },
        { lDelay: 100, lShapes: 5, lColors: 5 },
        { lDelay: 100, lShapes: 6, lColors: 5 },
        { lDelay: 100, lShapes: 7, lColors: 5 },
        { lDelay: 100, lShapes: 7, lColors: 5 },
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

      this.applyBoardGeometry();
    }

    // Everything that depends on the current board preset, in one re-runnable
    // place so the attract demo can borrow the classic board and hand the
    // player's board back afterwards.
    //
    // Row-scan tables are derived from the board shape rather than hardcoded. At
    // width 9 they reproduce the original 1992 tables exactly: midRow is the
    // leftmost cell of each row from the bottom up to y = 4*ratio (the spawn rows
    // are deliberately excluded from row clearing), and lt/rtRow are the bottom
    // row scanned in the two directions.
    applyBoardGeometry() {
      const rowTables = buildRowTables();
      this.midRow = rowTables.midRow;
      this.rtRow = rowTables.rtRow;
      this.ltRow = rowTables.ltRow;

      this.startPos = [6, 7, 8, 9].map(x => ({
        x: Math.round(x * BOARD_RATIO), y: SPAWN_ROW
      }));

      this.initEngine();
    }

    initEngine() {
      this.ballMap = [];
      for (let x = 0; x <= ALLOC_MAX_X; x++) {
        this.ballMap[x] = [];
        for (let y = 0; y <= ALLOC_MAX_Y; y++) {
          this.ballMap[x][y] = { inMap: false, bzMap: 0 };
        }
      }

      for (let x = BOARD_BOUNDS.MIN_X; x <= BOARD_BOUNDS.MAX_X; x++) {
        for (let y = BOARD_BOUNDS.MIN_Y; y <= BOARD_BOUNDS.MAX_Y; y++) {
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
      for (let x = BOARD_BOUNDS.MIN_X; x <= BOARD_BOUNDS.MAX_X; x++) {
        for (let y = BOARD_BOUNDS.MIN_Y; y <= BOARD_BOUNDS.MAX_Y; y++) {
          this.ballMap[x][y].bzMap = 0;
        }
      }
    }

    checkInMap(pts) {
      if (pts.x < 0 || pts.x > ALLOC_MAX_X || pts.y < 0 || pts.y > ALLOC_MAX_Y) return false;
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

      // Fall speed in grid ROWS per second, so a taller preset gives more thinking
      // time per piece (spawn-to-floor is ~16 rows on the 9-wide board but ~32 on
      // the 18-wide). That is deliberate -- the wider boards are meant to be the
      // more forgiving ones -- so this is not normalised by board width.
      //
      // The slope was 0.12 and uncapped, which reached 6.9x by level 50 and undid
      // the stretched colour ramp well before then. At 0.08 it tracks the colour
      // curve, and the ceiling turns the late game into a demanding steady state
      // rather than a wall. The cap is a feel judgement, not a derived number.
      const baseSpeed = Math.min(2.6, 1.0 + (this.level - 1) * 0.08);
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

      for (let y = BOARD_BOUNDS.MAX_Y; y >= BOARD_BOUNDS.MIN_Y; y--) {
        for (let x = BOARD_BOUNDS.MIN_X; x <= BOARD_BOUNDS.MAX_X; x++) {
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

      for (let x = BOARD_BOUNDS.MIN_X; x <= BOARD_BOUNDS.MAX_X; x++) {
        for (let y = BOARD_BOUNDS.MIN_Y; y <= BOARD_BOUNDS.MAX_Y; y++) {
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

      for (let r = 0; r < this.midRow.length; r++) {
        let rPts = { x: this.midRow[r].x, y: this.midRow[r].y };
        while (this.rowFull(rPts, 4)) {
          noRows = false;
          this.deleteRow(rPts, 4, coldir);
        }
      }

      for (let r = 0; r < this.ltRow.length; r++) {
        let rPts = { x: this.ltRow[r].x, y: this.ltRow[r].y };
        while (this.rowFull(rPts, 0)) {
          noRows = false;
          this.deleteRow(rPts, 0, 3);
        }
      }

      for (let r = 0; r < this.rtRow.length; r++) {
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
      for (let x = Math.round(4 * BOARD_RATIO); x <= Math.round(12 * BOARD_RATIO); x++) {
        for (let y = 0; y <= Math.round(4 * BOARD_RATIO) - 1; y++) {
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
          // Colour cycle. Fires on every F press, often several times per piece, so
          // it has to sit under the one-off effects rather than on top of them. It
          // was the only short effect running a raw square wave straight to the
          // output -- every other one is triangle or sine through a filter -- and a
          // square's odd harmonics made it cut through far harder than its 0.15
          // gain suggested. Same pitch sweep and timing, so it still reads as the
          // same event; just softer harmonics, filtered, and quieter.
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2600, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(out);
          osc.start(now);
          osc.stop(now + 0.05);
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
      // Linear, not ACES. ACES is a film curve that desaturates highlights by
      // design, and with this scene's hot lighting it was crushing the balls to
      // near-grey: measured across all six, mean saturation 33% against 99% under
      // Linear, with green worst at 10%. Reinhard and Cineon restore the colour but
      // drop mean luminance to 26-31%, so the balls go dark. Linear was the only
      // mode that kept both (mean luminance 55% against ACES's 43%).
      this.renderer.toneMapping = THREE.LinearToneMapping;
      // Back up to 1.0. This was held at 0.7 because higher exposure collapsed the
      // hues together -- but that was the CYAN RIM LIGHT squashing them, and the rim
      // is white now. With the rim fixed, exposure is free again, and raising it
      // brightens the board and the balls together: the board goes from 27 to 47,
      // which is the shiny surface the game had under ACES (49), while saturation
      // stays at 78% instead of ACES's 44%. The ball colours below are dimmed to
      // absorb the extra exposure without clipping.
      this.renderer.toneMappingExposure = 1.0;

      this.container.appendChild(this.renderer.domElement);
      this.updateCameraFraming();

      // Masks off the staging rows above the playfield. Material-level clipping
      // rather than renderer.clippingPlanes: a global plane would also slice the
      // starfield, planet and moon, which sit above the board in world space.
      this.renderer.localClippingEnabled = true;
      this.topClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

      this.ballMaterials = [];
      this.ghostMaterials = [];
      this.initMaterials();
      this.updateTopClipPlane();

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
      this.initGlowDecals();
      this.build3DBoard();
      this.build3DStarfield();

      this.staticBallMeshes = new Map();
      window.addEventListener('resize', () => this.onWindowResize());
    }

    initMaterials() {
      const colors = [
        // All six dimmed together, base and emissive, to make room for exposure 1.0.
        // The exposure is what brightens the board back to its old shiny look; the
        // balls do not need that extra stop, and taking it would clip them. Dimming
        // the source instead costs nothing visible: measured, saturation still
        // averages 78% and every hue lands within a few degrees of where it was.
        //
        // Emissives are ~22% of each base. That ratio matters -- hand-picked
        // brighter emissives put purple at 22% clipped where this puts it at 10%.
        //
        // Ruby sits at hue 349 and magenta at 311 so the two do not both read as
        // pink; purple is the closest neighbour to magenta at 36 degrees.
        { main: 0x0080d8, roughness: 0.15, metalness: 0.35, emissive: 0x001c2f }, // 1: Electric Azure Cyan-Blue
        { main: 0xd81c32, roughness: 0.15, metalness: 0.30, emissive: 0x2f060b }, // 2: Neon Ruby Red
        { main: 0x00a83c, roughness: 0.18, metalness: 0.25, emissive: 0x00250d }, // 3: Vibrant Emerald Green
        { main: 0xd9a406, roughness: 0.20, metalness: 0.40, emissive: 0x2f2401 }, // 4: Amber Gold
        { main: 0x8020b8, roughness: 0.15, metalness: 0.30, emissive: 0x1c0728 }, // 5: Electric Amethyst Purple
        { main: 0xd8009c, roughness: 0.15, metalness: 0.30, emissive: 0x2f0022 }  // 6: Hot Magenta
      ];

      const clip = this.topClipPlane ? [this.topClipPlane] : null;

      colors.forEach(c => {
        const mat = new THREE.MeshStandardMaterial({
          color: c.main,
          roughness: c.roughness,
          metalness: c.metalness,
          emissive: c.emissive,
          emissiveIntensity: 0.25,
          clippingPlanes: clip,
          clipShadows: true      // otherwise a masked ball still casts a shadow
        });

        // The ghost is a placement hint and should sit behind the real balls. Linear
        // tone mapping lifted every colour, which made it compete with them. Down a
        // third rather than halved: measured against bare board it was only 13% of a
        // solid ball's contrast even at 0.3, and 0.15 risked losing it altogether on
        // a phone in daylight. 0.2 keeps it legible.
        const ghostMat = new THREE.MeshStandardMaterial({
          color: c.main,
          roughness: 0.5,
          metalness: 0.1,
          transparent: true,
          opacity: 0.20,
          clippingPlanes: clip,
          clipShadows: true
        });

        // render() breathes the ball colour around this; keep the rest value so the
        // pulse has something stable to work from.
        mat.userData.baseColor = mat.color.clone();

        this.ballMaterials.push(mat);
        this.ghostMaterials.push(ghostMat);
      });

      // The falling piece gets its own copies of the six, dimmed. It shares the
      // palette but not the brightness.
      //
      // Its own materials because there is nothing else left to turn down. The
      // per-ball lights no longer reach the piece at all -- measured on gold, it
      // reads 127.0 with them at 0.8, at 0.4 and switched off entirely, and the
      // same again with the glow decals hidden. The piece was drawing the shared
      // material, so it was simply as bright as every settled ball and could not
      // be separated from them without separating the material.
      //
      // Colour and emissive both, so the dimming holds under any lighting rather
      // than only where the scene light dominates.
      this.activeBallMaterials = this.ballMaterials.map((m) => {
        const a = m.clone();
        // Share the live clipping plane. Material.clone() deep-copies
        // clippingPlanes, so the clone gets a frozen snapshot of the Plane rather
        // than a reference to it -- and initMaterials runs before
        // updateTopClipPlane, so that snapshot is the constructor's constant of 0.
        // The staging mask then sits at y = 0 for the falling piece alone and
        // slices most of it away. It does not read as a clipping bug either: the
        // piece simply looks darker, and it measured as a 35% drop in brightness
        // that no colour change could account for.
        a.clippingPlanes = m.clippingPlanes;
        a.color.multiplyScalar(ACTIVE_BALL_DIM);
        a.emissive.multiplyScalar(ACTIVE_BALL_DIM);
        // Its own rest value, or the breathe in render() would pull it back to the
        // settled balls' brightness on the first frame.
        a.userData = { baseColor: a.color.clone() };
        return a;
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

      // White, not cyan. A cyan rim tinted every ball about +5 degrees of hue
      // towards green -- measured on a uniform gold board, 47 becomes 52 -- which is
      // why gold read as olive: it starts at hue 45, right on the yellow-green
      // boundary, so it has the least headroom. White holds every ball at 47 with no
      // variation across the board, and is marginally brighter into the bargain.
      const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
      rimLight.position.set(-15, 10, 10);
      this.scene.add(rimLight);

      // One small light per ball of the falling piece rather than a single one at
      // its centre. A single light threw one round pool that sat in the middle of
      // the shape and was always cyan whatever the piece was made of; four take the
      // outline of the piece and each carries its own ball's colour, so the glow on
      // the board reads as a reflection of what is actually falling.
      //
      // The count is fixed at four and unused ones are dimmed to zero rather than
      // hidden: changing how many lights are in the scene forces Three.js to
      // recompile every material.
      this.activeBallLights = [];
      for (let i = 0; i < 4; i++) {
        const L = new THREE.PointLight(0xffffff, 0, 5.0);
        L.position.set(0, 0, 2);
        this.scene.add(L);
        this.activeBallLights.push(L);
      }
    }

    // Top face of a board tile. The tiles are placed at z = -0.25 and extruded by
    // depth + bevelThickness, both of which scale with the preset, so this has to
    // be computed rather than written down as a number.
    boardSurfaceZ() {
      return -0.25 + (0.2 + 0.03) * WORLD_SCALE;
    }

    glowDecalGeometry() {
      const span = GLOW_SPAN_CELLS * WORLD_SCALE;
      return new THREE.PlaneGeometry(span, span);
    }

    // A soft radial gradient laid flat on the board under each falling ball, in
    // that ball's colour, additively blended.
    //
    // This exists because the per-ball point lights cannot spread. Their pool is
    // governed by N.L against the board, and the tile faces sit only about 0.017
    // above z = 0, so a light low enough not to flare the piece is nearly edge-on
    // to them: measured gain 3 units out was 4.3 with the light at the contact
    // point and 12.6 at the ball's centre, against 34.3 with it lifted 3 units --
    // which blew 62-87% of the piece's pixels to white. Opening the distance
    // cutoff from 5 to 25 and softening decay did not escape it either. A point
    // light here is a tight core or a flare, never a wide soft pool.
    //
    // A decal has no such constraint. The falloff is painted into the texture, so
    // it cannot form a hot core; the reach is just the quad's size; and because it
    // is geometry on the board rather than a light it cannot touch the balls at
    // all. That also sidesteps the r128 limitation already recorded here, that a
    // light cannot be confined to one object once the camera can see its layer.
    initGlowDecals() {
      // Painted once, at a fixed resolution independent of the board preset. The
      // stops are deliberately shallow and wide rather than a tight bright centre:
      // a plain linear ramp puts most of its energy in the middle and reads as the
      // same blob the lights gave. Alpha is well under 1 even at the centre, since
      // additive blending on top of the lit board is what makes it visible.
      const SIZE = 128;
      const cvs = document.createElement('canvas');
      cvs.width = SIZE;
      cvs.height = SIZE;
      const ctx = cvs.getContext('2d');
      const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
      const stops = [[0, 0.85], [0.18, 0.55], [0.36, 0.30], [0.55, 0.14], [0.75, 0.045], [1, 0]];
      for (let i = 0; i < stops.length; i++) {
        g.addColorStop(stops[i][0], `rgba(255,255,255,${stops[i][1]})`);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SIZE, SIZE);

      this.glowTexture = new THREE.CanvasTexture(cvs);
      this.glowGeo = this.glowDecalGeometry();
      this.glowGroup = new THREE.Group();
      this.scene.add(this.glowGroup);

      // Clipped like the balls, or the glow would light up the masked staging
      // rows above the playfield where there are no tiles to catch it.
      const clip = this.topClipPlane ? [this.topClipPlane] : null;

      this.glowDecals = [];
      for (let i = 0; i < 4; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: this.glowTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          // Additive and unlit, so it must not occlude anything: the balls and the
          // ghost draw over it normally, but it must not write depth itself or the
          // four decals would cut holes in each other where they overlap.
          depthWrite: false,
          opacity: GLOW_OPACITY,
          clippingPlanes: clip
        });
        const mesh = new THREE.Mesh(this.glowGeo, mat);
        // Before the other transparent objects, not after. The ghost piece is
        // transparent but still writes depth, and it sits at the landing position
        // directly under the falling piece -- exactly where the glow is. Drawn
        // after it, the decal is depth-rejected wherever a ghost ball overlaps and
        // the glow is erased, not dimmed: measured over one ghost ball, the patch
        // read 65.4 both with the decal and without it, against 76.3 once the
        // decal draws first. That is what looked like something blocking the glow.
        //
        // Fixed here rather than by clearing depthWrite on the ghost, which would
        // work too but changes an appearance that is already tuned. Drawing first
        // also means the ghost now blends over the glow instead of cutting it out,
        // which is what a see-through ball in front of a glow should do. Opaque
        // balls are unaffected: they render in the opaque pass before any of this,
        // so they still occlude the decal correctly.
        mesh.renderOrder = -1;
        mesh.visible = false;
        this.glowGroup.add(mesh);
        this.glowDecals.push(mesh);
      }
    }

    // Tear the board down and rebuild it at the current preset. Deliberately a
    // total rebuild: stale per-cell meshes keyed "x_y" surviving a board change
    // are exactly the mesh-reuse fault that produced the old hanging-ball and gap
    // bugs, so nothing is carried across. The shared geometries and materials are
    // disposed rather than dropped, since the attract demo swaps boards on every
    // idle cycle and leaking them would accumulate over a long session.
    rebuildForBoard() {
      const emptyGroup = (group) => {
        while (group.children.length) group.remove(group.children[0]);
      };

      emptyGroup(this.ballsGroup);
      emptyGroup(this.activeGroup);
      emptyGroup(this.ghostGroup);
      emptyGroup(this.boardGroup);
      this.staticBallMeshes = new Map();
      this.activeMeshes = [];        // updateScene rebuilds these on next pass
      this.lastBallCount = -1;

      if (this.hexGeo) this.hexGeo.dispose();
      if (this.hexMat) this.hexMat.dispose();

      if (this.sphereGeo) this.sphereGeo.dispose();
      this.sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);

      // The decals are sized in cells, so a preset change resizes them. The four
      // meshes are kept and re-pointed at the new geometry; the texture is scale
      // independent and does not need rebuilding.
      if (this.glowGeo) this.glowGeo.dispose();
      this.glowGeo = this.glowDecalGeometry();
      for (let i = 0; i < this.glowDecals.length; i++) {
        this.glowDecals[i].geometry = this.glowGeo;
        this.glowDecals[i].visible = false;
      }

      // The starfield's recycle limit is derived from this, and a preset change
      // resizes the board, so the cached sphere has to go with it.
      this._boardSphere = null;

      this.updateTopClipPlane();   // SPAWN_ROW and WORLD_SCALE both just changed
      this.build3DBoard();
    }

    // Top edge of the first visible row, in world space. Everything above it is
    // the staging area and gets clipped away.
    updateTopClipPlane() {
      const hexHalfHeight = 0.52 * WORLD_SCALE * Math.sin(Math.PI / 3);
      this.topClipPlane.constant = gridToWorld(CENTER_X, SPAWN_ROW).y + hexHalfHeight;
    }

    build3DBoard() {
      const hexRadius = 0.52 * WORLD_SCALE;
      const hexShape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = hexRadius * Math.cos(angle);
        const y = hexRadius * Math.sin(angle);
        if (i === 0) hexShape.moveTo(x, y);
        else hexShape.lineTo(x, y);
      }

      const extrudeSettings = {
        depth: 0.2 * WORLD_SCALE, bevelEnabled: true, bevelSegments: 2, steps: 1,
        bevelSize: 0.03 * WORLD_SCALE, bevelThickness: 0.03 * WORLD_SCALE
      };
      // Kept on the instance, not local: rebuildForBoard() has to dispose these
      // when the board preset changes, and they are shared by every cell.
      this.hexGeo = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
      // The board should read as a bluish metallic surface that catches the light,
      // not a flat lighter slab with a bright outline. Raising the face colour and
      // the wireframe did the latter, and made the grid look green-edged.
      //
      // So this leans on the material's response to light instead of its own
      // brightness: lower roughness and higher metalness give sharper specular
      // highlights, so the surface picks up the rim light and the glow of the
      // falling piece rather than sitting inert. The base colour is tinted towards
      // blue so what it does reflect reads cool.
      //
      // Material properties only, deliberately. Lighting the board more strongly
      // would work but cannot be aimed: Three.js r128 applies a light to every
      // object once the camera can see its layer, so a cyan light for the board
      // also swings gold about 57 units of green. Tried and measured; the balls
      // must keep the corrected palette.
      this.hexMat = new THREE.MeshStandardMaterial({ color: 0x1e2c44, roughness: 0.35, metalness: 0.55, emissive: 0x0a1622, emissiveIntensity: 0.5 });
      // No wireframe at all. The original board had no per-cell outline -- the cells
      // read from the dark gaps between the hexes and the bevel catching the light.
      // The cyan LineSegments that drew one were also the source of the jagged cyan
      // edges down the side of the board: hairline geometry aliases badly whatever
      // the renderer's antialiasing does, and the colour made it obvious. Dropping
      // it halves the board's object count as well.

      for (let x = BOARD_BOUNDS.MIN_X; x <= BOARD_BOUNDS.MAX_X; x++) {
        for (let y = BOARD_BOUNDS.MIN_Y; y <= BOARD_BOUNDS.MAX_Y; y++) {
          // Staging rows above the playfield get no tile -- they are masked.
          if (isInBoard(x, y) && y >= SPAWN_ROW) {
            const wPos = gridToWorld(x, y, -0.25);
            const cellMesh = new THREE.Mesh(this.hexGeo, this.hexMat);
            cellMesh.position.set(wPos.x, wPos.y, wPos.z);
            cellMesh.receiveShadow = true;
            this.boardGroup.add(cellMesh);
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

      for (let x = BOARD_BOUNDS.MIN_X; x <= BOARD_BOUNDS.MAX_X; x++) {
        for (let y = BOARD_BOUNDS.MIN_Y; y <= BOARD_BOUNDS.MAX_Y; y++) {
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
          const mesh = new THREE.Mesh(this.sphereGeo, this.activeBallMaterials[0]);
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
            mesh.material = this.activeBallMaterials[colorIdx];

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

        // Each ball lights the board beneath it in its own colour.
        for (let i = 0; i <= 3; i++) {
          const L = this.activeBallLights[i];
          const val = engine.oddballz.image[i];
          const mesh = this.activeMeshes[i];
          if (val > 0 && mesh) {
            // Behind the ball, at the point where it touches the board. A ball
            // rests on the surface, so one radius back from its centre is exactly
            // the contact point. In front of the ball instead, the light hits the
            // face the camera sees and the piece flares.
            //
            // SPHERE_RADIUS, not a literal 0.45. The literal was the 9-wide radius
            // and the radius scales with WORLD_SCALE, so on 18-wide it left the
            // light at z = -0.238, buried under the tile faces, lighting nothing.
            //
            // This position confines the glow to a small core under each ball,
            // which reads as a little jetstream. That is not fixable by moving the
            // light, and it was tried. The board's tile faces sit about 0.017 above
            // z = 0, so a light near that plane is edge-on to them and N.L collapses
            // with distance; lifting the light restores N.L but puts it between the
            // ball and the camera, which flares the piece. Measured board gain at
            // 3 units with the lights-off floor subtracted, against the share of
            // ball pixels clipped to white (11-13% is the lights-off floor):
            //
            //                        board @3u    ball clipped
            //   here (contact pt)          4.3       18-47%
            //   ball centre               12.6       20-62%
            //   +3.0 above, dist 12       34.3       62-87%
            //   +4.0 above, dist 12       29.8       58-69%
            //
            // Opening the distance cutoff from 5 to 25 and softening decay does not
            // escape it either: the pool barely widens and the balls keep blowing
            // out. A point light on the ball can be a tight core or a flare, not a
            // wide soft pool. Spreading the glow properly needs a flat additive
            // decal on the board rather than a light.
            L.position.set(mesh.position.x, mesh.position.y, mesh.position.z - SPHERE_RADIUS);
            L.color.copy(this.ballMaterials[(val - 1) % this.ballMaterials.length].color);
            // Base only. render() pulses around this each frame, so setting
            // intensity directly here would fight it.
            //
            // 0.8, down from 4.5. The glow decals carry the effect now, so this is
            // only here for the genuine shading a real light gives the settled
            // balls the piece passes -- something a decal on the board cannot do.
            // Set it to 0 to drop the lights entirely; nothing else depends on it.
            L.userData.baseIntensity = 0.8;
          } else {
            L.userData.baseIntensity = 0;
            L.intensity = 0;
          }
        }

        // Glow decals follow the same four balls, flat on the board surface.
        const glowZ = this.boardSurfaceZ() + 0.03;
        for (let i = 0; i <= 3; i++) {
          const decal = this.glowDecals[i];
          const val = engine.oddballz.image[i];
          const mesh = this.activeMeshes[i];
          if (val > 0 && mesh && mesh.visible) {
            // x and y from the ball, z pinned to the board. Deliberately not the
            // ball's z: the decal is a mark on the surface, so it must not rise
            // and fall with the piece's hover.
            decal.position.set(mesh.position.x, mesh.position.y, glowZ);
            decal.material.color.copy(this.ballMaterials[(val - 1) % this.ballMaterials.length].color);
            decal.visible = true;
          } else {
            decal.visible = false;
          }
        }
      } else {
        for (let i = 0; i < 4; i++) {
          if (this.activeMeshes[i]) {
            this.activeMeshes[i].visible = false;
            this.activeMeshes[i].initialized = false;
          }
          // No piece falling, so nothing should be glowing on the board.
          if (this.activeBallLights[i]) {
            this.activeBallLights[i].userData.baseIntensity = 0;
            this.activeBallLights[i].intensity = 0;
          }
          if (this.glowDecals && this.glowDecals[i]) this.glowDecals[i].visible = false;
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

    // A soft round dot. Untextured GL points are drawn as hard-edged squares, and
    // at the old 0.45 with size attenuation the near ones were large enough to read
    // as coloured blocks. This is the whole of that fix.
    makeStarSprite() {
      const S = 64;
      const cvs = document.createElement('canvas');
      cvs.width = S;
      cvs.height = S;
      const ctx = cvs.getContext('2d');
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.32)');
      g.addColorStop(0.75, 'rgba(255,255,255,0.07)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      return new THREE.CanvasTexture(cvs);
    }

    // Stars flying toward the viewer from a vanishing point, the view out the
    // window at cruise. Two things make it read as depth rather than drifting
    // confetti: the stars travel along the camera's own axis so perspective throws
    // them outward from the centre of the screen, and each one trails a short
    // streak whose on-screen length grows as it approaches.
    //
    // Deliberately in its own group rather than in spaceFlightGroup. That group is
    // tilted -0.70 to sit with the board, which is what made the old stars stream
    // sideways past the playfield instead of coming at you. This group is pinned to
    // the camera's position and orientation every frame, so star coordinates are
    // camera space: x and y across the view, z negative into the screen, and motion
    // is simply z increasing toward 0. That holds at any aspect or fov, so it needs
    // nothing from the locked mobile camera maths.
    buildCruiseStarfield() {
      this.starFieldGroup = new THREE.Group();
      this.scene.add(this.starFieldGroup);

      // Mostly white, because that is what a starfield looks like. The old palette
      // weighted cyan, purple, blue, white, gold and rose equally, which is why it
      // read as confetti; the tints here are faint and rare.
      const palette = [
        { c: 0xffffff, w: 62 },
        { c: 0xd6e6ff, w: 18 },
        { c: 0xa9c8ff, w: 9 },
        { c: 0xfff0d4, w: 7 },
        { c: 0xffd9d9, w: 4 }
      ];
      const bag = [];
      for (let i = 0; i < palette.length; i++) {
        for (let k = 0; k < palette[i].w; k++) bag.push(new THREE.Color(palette[i].c));
      }

      this.flightStars = [];
      const pos = new Float32Array(STAR_COUNT * 3);
      const col = new Float32Array(STAR_COUNT * 3);
      const segPos = new Float32Array(STAR_COUNT * 6);
      const segCol = new Float32Array(STAR_COUNT * 6);

      for (let i = 0; i < STAR_COUNT; i++) {
        const base = bag[Math.floor(Math.random() * bag.length)];
        // Per-star brightness, so the field has faint stars behind bright ones
        // instead of one flat wall of dots.
        const mag = 0.35 + Math.random() * 0.65;
        this.flightStars.push({
          x: (Math.random() * 2 - 1) * STAR_SPREAD,
          y: (Math.random() * 2 - 1) * STAR_SPREAD,
          z: -(STAR_NEAR_MIN + Math.random() * (STAR_FAR - STAR_NEAR_MIN)),
          speed: 14 + Math.random() * 26,
          r: base.r * mag, g: base.g * mag, b: base.b * mag
        });
      }

      const pointGeo = new THREE.BufferGeometry();
      pointGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      pointGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.starTexture = this.makeStarSprite();
      this.starPointsMesh = new THREE.Points(pointGeo, new THREE.PointsMaterial({
        size: 2.6,
        map: this.starTexture,
        // Constant screen size, not world size. With attenuation on, a star's dot
        // balloons as it approaches -- at these distances the nearest would be tens
        // of pixels across. Depth is carried by the streak instead, which is what
        // actually reads as speed.
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      this.starFieldGroup.add(this.starPointsMesh);

      const segGeo = new THREE.BufferGeometry();
      segGeo.setAttribute('position', new THREE.BufferAttribute(segPos, 3));
      segGeo.setAttribute('color', new THREE.BufferAttribute(segCol, 3));
      // The streak's tail vertex is left black. Under additive blending black adds
      // nothing, so the trail fades out along its length without needing per-vertex
      // alpha, which a line material does not support.
      this.starStreaks = new THREE.LineSegments(segGeo, new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      this.starFieldGroup.add(this.starStreaks);
    }

    // Rocks, not crumpled foil.
    //
    // The old ones displaced every vertex by its own Math.random(). Polyhedron
    // geometries in r128 are NOT indexed -- each triangle owns its three corners
    // outright -- so corners that share a location got different random values and
    // the surface came apart at every seam. Measured on the old build: 144
    // triangles, 432 vertices, 432 distinct positions, where a welded dodecahedron
    // at that detail has about 62. Not one shared corner survived. That is the
    // crumpled-paper look, and it is torn geometry rather than a shading problem.
    //
    // The displacement here is a function of the vertex's DIRECTION from the
    // centre, so duplicated corners are handed identical input and necessarily
    // agree. A few low-frequency terms give big coherent lumps rather than
    // high-frequency noise, which is the difference between a rock and gravel.
    buildAsteroids() {
      this.flightAsteroids = [];
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x3a3f58,
        roughness: 0.9,
        metalness: 0.2,
        flatShading: true
      });

      const v = new THREE.Vector3();
      for (let i = 0; i < 20; i++) {
        const size = 0.8 + Math.random() * 2.5;
        // Detail 1, not 2 or more: a rock wants a few broad faces catching the
        // light, and subdividing further only makes room for noise to look busy.
        const geo = new THREE.IcosahedronGeometry(size, 1);
        const p = geo.attributes.position;
        const ph = [0, 1, 2, 3].map(() => Math.random() * Math.PI * 2);
        for (let k = 0; k < p.count; k++) {
          v.set(p.getX(k), p.getY(k), p.getZ(k));
          const len = v.length() || 1;
          const d = v.clone().divideScalar(len);
          const bump = 1
            + 0.20 * Math.sin(2.3 * d.x + ph[0])
            + 0.16 * Math.sin(2.9 * d.y + ph[1])
            + 0.13 * Math.sin(3.3 * d.z + ph[2])
            + 0.09 * Math.sin(5.1 * (d.x + d.y + d.z) + ph[3]);
          p.setXYZ(k, d.x * len * bump, d.y * len * bump, d.z * len * bump);
        }
        geo.computeVertexNormals();

        const rock = new THREE.Mesh(geo, rockMat);
        // Irregular silhouette from a whole-mesh scale, which cannot tear anything
        // because it is applied to the object rather than to individual vertices.
        rock.scale.set(
          0.78 + Math.random() * 0.44,
          0.78 + Math.random() * 0.44,
          0.78 + Math.random() * 0.44
        );
        rock.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);

        this.placeRock(rock, -(60 + Math.random() * (ROCK_FAR - 60)));

        rock.userData = {
          speed: 10 + Math.random() * 16,
          spinX: (Math.random() - 0.5) * 1.5,
          spinY: (Math.random() - 0.5) * 1.5,
          spinZ: (Math.random() - 0.5) * 1.5
        };

        // Into the camera-pinned group with the stars, not spaceFlightGroup. They
        // have to share the stars' frame to cruise on the same axis; the flight
        // group is tilted to sit with the board and would send them sideways again.
        this.starFieldGroup.add(rock);
        this.flightAsteroids.push(rock);
      }
    }

    // Somewhere off to the side at the given depth, never dead centre. Centre is
    // where the board is, and a rock that closes on the middle of the screen ends up
    // vanishing at the recycle limit in full view instead of leaving past the edge.
    placeRock(rock, z) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const vertical = Math.random() < 0.5 ? -1 : 1;
      rock.position.set(
        side * (ROCK_SIDE_MIN + Math.random() * ROCK_SIDE_RANGE),
        vertical * (ROCK_SIDE_MIN + Math.random() * ROCK_SIDE_RANGE),
        z
      );
    }

    // Distance from the camera to the nearest point of the playfield, via the
    // board's bounding sphere. Cached against camera position and board preset,
    // since it only changes when one of those does.
    boardNearDistance() {
      if (!this._boardSphere) {
        const box = new THREE.Box3().setFromObject(this.boardGroup);
        this._boardSphere = box.getBoundingSphere(new THREE.Sphere());
      }
      return Math.max(
        1,
        this.camera.position.distanceTo(this._boardSphere.center) - this._boardSphere.radius
      );
    }

    build3DStarfield() {
      // === 3D SPACE FLIGHT ENVIRONMENT ===
      this.spaceFlightGroup = new THREE.Group();
      // Tilt space flight container to match the exact camera & board perspective angle (~40 degrees)
      this.spaceFlightGroup.rotation.x = -0.70;

      this.buildCruiseStarfield();
      this.buildAsteroids();

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

      // The glow decals bob with everything else, and must. They lie 0.03 above the
      // board surface while hoverZ swings +/-0.15, so a group left in world space
      // gets overrun by the board on every upswing: the glow vanishes completely,
      // and because the board is tilting at the same time the edge of the board
      // sweeps across it as an arc, one way and then the other, once per cycle.
      // It reads exactly like a shadow passing over the glow and was mistaken for
      // one. The decal positions are taken from activeMeshes, which are local to
      // activeGroup, so this has to be the same transform for them to line up.
      this.glowGroup.rotation.x = hoverPitch;
      this.glowGroup.rotation.y = hoverRoll;
      this.glowGroup.position.z = hoverZ;

      // Pulse the falling piece's lights so the balls read as energised on the way
      // down. Each ball is offset in phase so the piece shimmers rather than
      // throbbing as one block. Driven off the base intensity updateScene stores,
      // not the live value, which would compound frame on frame.
      if (this.activeBallLights) {
        for (let i = 0; i < this.activeBallLights.length; i++) {
          const L = this.activeBallLights[i];
          const base = L.userData.baseIntensity || 0;
          L.intensity = base <= 0 ? 0
            : base * (1 + 0.3 * Math.sin(this._flightTime * 3.2 + i * 0.7));
        }
      }

      // The decals breathe on the same phase as the light they replaced, so the
      // two read as one effect rather than beating against each other. Shallower
      // than the lights' 0.3: the decal is the visible part now, and at 0.3 the
      // pulse became the thing you watch instead of the piece.
      if (this.glowDecals) {
        for (let i = 0; i < this.glowDecals.length; i++) {
          const decal = this.glowDecals[i];
          if (!decal.visible) continue;
          decal.material.opacity = GLOW_OPACITY *
            (1 + 0.16 * Math.sin(this._flightTime * 3.2 + i * 0.7));
        }
      }

      // The balls already landed breathe too, so the board is not inert while a
      // piece falls. Done on the shared material rather than with lights: there can
      // be up to 936 settled balls and one light each is impossible, whereas six
      // shared materials cost nothing per ball.
      //
      // Scaling the COLOUR, not emissiveIntensity. Emissive turned out to have
      // almost no leverage -- sweeping it from 0 to 1.6 moved a ball only about 11
      // luminance, because the balls are dominated by scene lighting rather than
      // their own glow, and at 0.18 amplitude the swing measured 0.4, i.e. nothing.
      //
      // Range 0.90 to 1.02, so it is centred just below the resting colour rather
      // than above it. The balls already sit near the top of the range at exposure
      // 1.0 and there is very little headroom above: x1.05 took one ball from 17%
      // of its pixels blown to 31%. Downward is free -- clipping falls as it dims.
      // This gives about 8 luminance of swing with clipping staying under 20%.
      //
      // Slower than the falling piece (1.6 against 3.2) so that stays the livelier
      // one, and phase is spread across the six colours so the board shimmers
      // rather than flashing in unison.
      // Both sets, on the same phase. The falling piece has its own dimmed copies
      // of these materials, and they need breathing too or the piece would sit
      // inert against a board that is moving. Each drives off its own baseColor,
      // so the piece keeps its dimming instead of being pulled up to the settled
      // brightness.
      const breatheSets = [this.ballMaterials, this.activeBallMaterials];
      for (let s = 0; s < breatheSets.length; s++) {
        const set = breatheSets[s];
        if (!set) continue;
        for (let i = 0; i < set.length; i++) {
          const m = set[i];
          const base = m.userData && m.userData.baseColor;
          if (base) {
            const f = 0.96 + 0.06 * Math.sin(this._flightTime * 1.6 + i * 1.05);
            m.color.setRGB(base.r * f, base.g * f, base.b * f);
          }
        }
      }

      // === 3D SPACE FLIGHT MOTION (ALIGNED WITH BOARD PERSPECTIVE TILT) ===
      const isZip = this.engine && this.engine.isZipping;
      const flightSpeedMult = isZip ? 2.5 : 1.0;

      // 1. Cruise: stars fly toward the viewer down the camera's own axis
      if (this.flightStars && this.starPointsMesh && this.starFieldGroup) {
        // Pin the field to the camera so star coordinates ARE camera space. Doing
        // it here rather than at build time matters: updateCameraFraming moves the
        // camera on every resize and orientation change.
        this.starFieldGroup.position.copy(this.camera.position);
        this.starFieldGroup.quaternion.copy(this.camera.quaternion);

        // How near a star may come before it is recycled. Anything nearer than the
        // playfield would draw over it, so this tracks the board rather than being
        // a fixed number -- the camera sits further back on narrow screens.
        const nearLimit = Math.max(STAR_NEAR_MIN, this.boardNearDistance() - STAR_BOARD_MARGIN);
        const span = STAR_FAR - nearLimit;

        const pts = this.starPointsMesh.geometry.attributes.position;
        const pcol = this.starPointsMesh.geometry.attributes.color;
        const seg = this.starStreaks.geometry.attributes.position;
        const scol = this.starStreaks.geometry.attributes.color;

        for (let i = 0; i < this.flightStars.length; i++) {
          const s = this.flightStars[i];
          s.z += s.speed * flightSpeedMult * dt;

          if (s.z > -nearLimit) {
            s.z = -STAR_FAR;
            s.x = (Math.random() * 2 - 1) * STAR_SPREAD;
            s.y = (Math.random() * 2 - 1) * STAR_SPREAD;
          }

          // Fade in over the far fifth so stars do not pop into existence at the
          // back of the field.
          const depth = (-s.z - nearLimit) / (span || 1);
          const fade = depth > 0.8 ? Math.max(0, (1 - depth) / 0.2) : 1;

          // Streak length in world units. Perspective alone then makes it longer on
          // screen as the star closes, which is the part that reads as speed. Capped
          // against its own distance so a near star cannot smear across the view.
          let len = s.speed * flightSpeedMult * STAR_TRAIL;
          const maxLen = -s.z * 0.22;
          if (len > maxLen) len = maxLen;

          pts.array[i * 3] = s.x;
          pts.array[i * 3 + 1] = s.y;
          pts.array[i * 3 + 2] = s.z;
          pcol.array[i * 3] = s.r * fade;
          pcol.array[i * 3 + 1] = s.g * fade;
          pcol.array[i * 3 + 2] = s.b * fade;

          // Head at the star, tail left black so additive blending fades it out.
          seg.array[i * 6] = s.x;
          seg.array[i * 6 + 1] = s.y;
          seg.array[i * 6 + 2] = s.z;
          seg.array[i * 6 + 3] = s.x;
          seg.array[i * 6 + 4] = s.y;
          seg.array[i * 6 + 5] = s.z - len;
          scol.array[i * 6] = s.r * fade * 0.8;
          scol.array[i * 6 + 1] = s.g * fade * 0.8;
          scol.array[i * 6 + 2] = s.b * fade * 0.8;
          scol.array[i * 6 + 3] = 0;
          scol.array[i * 6 + 4] = 0;
          scol.array[i * 6 + 5] = 0;
        }
        pts.needsUpdate = true;
        pcol.needsUpdate = true;
        seg.needsUpdate = true;
        scol.needsUpdate = true;
      }

      // 2. Asteroids cruise on the same axis as the stars, in the same camera space
      if (this.flightAsteroids && this.starFieldGroup) {
        // The same limit the stars use, so nothing solid crosses the playfield
        // either. Recomputed rather than cached: the camera moves on resize.
        const rockNear = Math.max(STAR_NEAR_MIN, this.boardNearDistance() - STAR_BOARD_MARGIN);
        for (const rock of this.flightAsteroids) {
          const u = rock.userData;
          rock.position.z += u.speed * flightSpeedMult * dt;
          rock.rotation.x += u.spinX * dt;
          rock.rotation.y += u.spinY * dt;
          rock.rotation.z += u.spinZ * dt;

          if (rock.position.z > -rockNear) this.placeRock(rock, -ROCK_FAR);
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

    // Pan offset that leaves equal space above and below the drawn board.
    //
    // Solved rather than derived: the view is tilted, so the board's top edge is
    // further from the camera than its bottom and foreshortens more. Its world
    // midpoint therefore does not project to the screen midpoint -- aiming at the
    // midpoint still leaves roughly 2 units too much room at the top. Bisection is
    // exact and stays right if the board shape changes again.
    //
    // The extent comes from the geometry, not from boardGroup, because framing is
    // set up before the tiles are built. Canvas size does not enter into it: for a
    // perspective camera aspect scales x only, so vertical balance depends solely
    // on fov, camera pose and the board's world extent.
    solveDesktopPan() {
      const cam = this.camera;
      const halfH = 0.52 * WORLD_SCALE * Math.sin(Math.PI / 3);
      const topY = gridToWorld(CENTER_X, SPAWN_ROW).y + halfH;
      const botY = gridToWorld(CENTER_X, BP.MAX_Y).y - halfH;

      const imbalance = (off) => {
        cam.position.set(0.4, -17.5 + off, 21.0);
        cam.lookAt(0.4, 0.8 + off, 0);
        cam.updateMatrixWorld();
        const ndcTop = new THREE.Vector3(0.4, topY, 0).project(cam).y;
        const ndcBot = new THREE.Vector3(0.4, botY, 0).project(cam).y;
        return (1 - ndcTop) - (1 + ndcBot);   // top margin minus bottom margin
      };

      let lo = -8, hi = 4;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (imbalance(mid) > 0) hi = mid; else lo = mid;
      }
      return (lo + hi) / 2;
    }

    updateCameraFraming() {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      const aspect = width / height;
      this.camera.aspect = aspect;

      if (aspect < 1.0) {
        // iPhone & Android portrait mobile camera framing: Ergonomic scaled view showing full board & all tips
        // Exact form of the expression this replaces, which was:
        //     this.camera.fov = Math.min(68, 42 / (aspect * 1.15));
        // That holds horizontal coverage constant only while tan(fov/2) ~= fov/2.
        // True at phone aspects (0.571, accurate to 0.2%), not at tablet ones
        // (0.827, 5.9% short), which clipped the board off both edges of an iPad by
        // 14px and 25px. Anchored on MOBILE_H_COVERAGE so phones are unchanged: at
        // 0.571 this returns 63.96, the same value the old line gave.
        this.camera.fov = Math.min(68, 2 * Math.atan(MOBILE_H_COVERAGE / aspect) * 180 / Math.PI);
        const distFactor = (1.0 - aspect);
        this.camera.position.set(0.4, -16.5 - distFactor * 2.0, 18.0 + distFactor * 2.5);
        this.camera.lookAt(0.4, 0.4, 0);
      } else {
        // Desktop / landscape view framing. Masking the staging rows made the
        // drawn board shorter at the top, which left a black band up there. Pan
        // the camera to recentre it -- position and target move together, so the
        // viewing angle is unchanged and this is a pure pan, not a tilt.
        this.camera.fov = 45;
        this.camera.updateProjectionMatrix();
        const pan = this.solveDesktopPan();
        this.camera.position.set(0.4, -17.5 + pan, 21.0);
        this.camera.lookAt(0.4, 0.8 + pan, 0);
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
          // WASD alongside the arrows. D used to be left and G right, from the
          // original's D/F/G home-row cluster, which left A and D both moving left.
          case 'ArrowLeft': case 'KeyA':
            this.engine.moveOBall(1); e.preventDefault(); break;
          case 'ArrowRight': case 'KeyD':
            this.engine.moveOBall(4); e.preventDefault(); break;
          case 'ArrowUp': case 'KeyW':
            this.engine.transform(this.engine.rotCCW); e.preventDefault(); break;
          case 'ArrowDown': case 'KeyS':
            this.engine.transform(this.engine.rotCW); e.preventDefault(); break;
          // Q/E sit above A/D so the whole game is playable left-handed:
          // Q W E / A S D for flips, rotation and movement, F for colour, Space to drop.
          case 'KeyX': case 'Home': case 'KeyQ':
            this.engine.transform(this.engine.flipX); e.preventDefault(); break;
          case 'KeyY': case 'End': case 'KeyE':
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
      document.getElementById('btnPauseEnd').addEventListener('click', () => this.returnToTitle());
      document.getElementById('btnGameOverMenu').addEventListener('click', () => this.returnToTitle());

      ['btnHighScores', 'btnGameOverHighScores', 'btnStartHighScores'].forEach(id => {
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
      // Belt and braces: the demo borrows the classic board, so make sure the
      // player's chosen board is back before a real game starts.
      this.setLiveBoardWidth(storedBoardWidth());
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
        this.lastTime = performance.now();
        this.audio.startBGM();
      }
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
                        'overlayPause', 'overlayGameOver'];
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

    // Swap the live board to a different preset. Both the engine and the renderer
    // bake the board in when they are built, so this is a full rebuild of each --
    // see ThreeRenderer.rebuildForBoard for why nothing is reused.
    setLiveBoardWidth(w) {
      if (BOARD_WIDTH === w) return false;
      setBoardWidth(w);
      this.engine.applyBoardGeometry();
      this.renderer.rebuildForBoard();
      return true;
    }

    enterAttract() {
      if (this.attractActive) return;
      if (!this.isOnTitleIdle()) { if (!this.isPlaying) this.scheduleAttractIdle(); return; }

      this.attractActive = true;
      this.attractPlay = null;
      this.attractSavedMatcher = this.engine.matcher;   // restore the user's mode on exit

      // The lessons are authored against classic-board coordinates (row 11 x5-9,
      // the perpendicular line, the x15-16 gravity gap), and the demo only has to
      // teach the rules -- which are the same at every width. So it always runs on
      // the 9-wide board and hands the player's board back on the way out.
      this.attractSavedWidth = BOARD_WIDTH;
      this.setLiveBoardWidth(9);

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

      this.setLiveBoardWidth(this.attractSavedWidth || storedBoardWidth());

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
      const wantY = (below > rect.height * 0.82) ? py - rect.height * 0.17 : below;

      // Clamp against the caption's MEASURED size, not a percentage of the
      // pane. `left` is its centre (it is translated -50%), so a percentage
      // clamp let the box hang off the edge whenever it was wider than the
      // margin allowed -- which is exactly what happens on a phone.
      const margin = 10;
      // While the overlay is hidden the caption has no layout, so its size
      // reads as 0 and the clamp below would do nothing -- leaving a position
      // that hangs off the edge once it becomes visible. It gets positioned
      // again with the next caption, so just skip it here.
      if (!cap.offsetWidth) return;

      // Clamp in page coordinates against the play area, then convert into the
      // caption's own offset parent. The parent spans the whole page while the
      // play area does not, so clamping directly in parent coordinates let the
      // box slide off the side on a phone and under the controls bar.
      const halfW = cap.offsetWidth / 2, capH = cap.offsetHeight;
      const wantAbsX = rect.left + px, wantAbsY = rect.top + wantY;

      const minX = rect.left + halfW + margin, maxX = rect.right - halfW - margin;
      const absX = (minX > maxX) ? rect.left + rect.width / 2
                                 : Math.max(minX, Math.min(maxX, wantAbsX));
      const minY = rect.top + margin, maxY = rect.bottom - capH - margin;
      const absY = (minY > maxY) ? rect.top + margin
                                 : Math.max(minY, Math.min(maxY, wantAbsY));

      const parent = cap.offsetParent ? cap.offsetParent.getBoundingClientRect() : rect;
      cap.style.transform = 'translate(' + Math.round(absX - parent.left) + 'px, ' +
                            Math.round(absY - parent.top) + 'px) translate(-50%, 0)';
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
        'Steer, rotate and <b>cycle its colours</b> as it falls.',
        'Watch &mdash; <b>these five</b> are lined up&hellip;',
        'Five in a row &mdash; <b>they burst and clear!</b>'
      ], 6800);

      scene('perp3', 'COLOR MATCH', [
        'Now match <b>3+</b> in a <b>perpendicular</b> line.',
        'Steer, rotate and <b>cycle its colours</b> as it falls.',
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

    // Palette and shape reference sheet, opened with ?palette on the URL. Paints
    // every colour and every shape onto the real board so they are judged under the
    // actual materials, lighting and tone mapping -- a flat swatch page would not
    // represent what the balls look like in play. Not a game feature; it just
    // paints the board and stops.
    showPaletteSheet() {
      const e = this.engine;
      e.endGame = true;
      e.eraseBallMap();

      const free = (x, y) => e.checkInMap({ x: x, y: y }) && e.ballMap[x][y].bzMap === 0;
      const paint = (cells, colour) => cells.forEach(c => { e.ballMap[c.x][c.y].bzMap = colour; });

      // One ball per colour along a single row, as a reference strip. Scan downward
      // for the first row wide enough to hold all six rather than assuming one --
      // the hexagon narrows towards the top and the row that fits moves with the
      // board preset.
      let strip = [];
      let stripY = SPAWN_ROW + 1;
      for (let y = SPAWN_ROW + 1; y <= BOARD_BOUNDS.MAX_Y; y++) {
        const slots = [];
        for (let x = BOARD_BOUNDS.MIN_X; x <= BOARD_BOUNDS.MAX_X && slots.length < 6; x += 2) {
          if (free(x, y)) slots.push({ x: x, y: y });
        }
        if (slots.length === 6) { strip = slots; stripY = y; break; }
      }
      strip.forEach((c, i) => paint([c], i + 1));

      // Then each shape, spaced out, cycling through the colours. Greedy placement
      // against the live map so nothing overlaps and nothing lands off-board.
      const anchors = [];
      for (let y = stripY + 4; y <= BOARD_BOUNDS.MAX_Y; y += 4)
        for (let x = BOARD_BOUNDS.MIN_X + 2; x <= BOARD_BOUNDS.MAX_X; x += 5)
          anchors.push({ x: x, y: y });

      let shapesPlaced = 0;
      e.ballShapes.forEach((offs, i) => {
        const colour = (i % 6) + 1;
        for (const a of anchors) {
          const cells = [{ x: a.x, y: a.y }]
            .concat(offs.map(o => ({ x: a.x + o.x, y: a.y + o.y })));
          if (cells.every(c => free(c.x, c.y))) { paint(cells, colour); shapesPlaced++; break; }
        }
      });

      e.droppingPathsMap = new Map();
      this.renderer.updateScene(e);
      return { colours: strip.length, shapes: shapesPlaced, totalShapes: e.ballShapes.length };
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
        mode: this.engine.matcher ? 'Color Match' : 'Row Build',
        board: BOARD_SHORT[BOARD_WIDTH]
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
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1rem 0;">No records saved yet!</td></tr>';
        } else {
          this.highScores.forEach((hs, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="font-weight:bold; color:var(--text-muted);">#${idx + 1}</td>
              <td style="font-weight:bold; color:var(--accent-gold);">${hs.score}</td>
              <td>Lvl ${hs.level}</td>
              <td style="font-size:0.8rem; color:var(--accent-cyan);">${hs.mode}</td>
              <td style="font-size:0.8rem; color:var(--text-muted);">${hs.board || '&mdash;'}</td>
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

  // Board-width selector. Kept deliberately outside the app class: the width has to
  // be fixed before the engine and renderer are constructed, since both bake the
  // board dimensions in, so changing it reloads the page instead of trying to remap
  // a live board onto a different grid.
  const BOARD_KEY = 'oddballz_hd_board_width';
  const LEGACY_DENSE_KEY = 'oddballz_hd_dense_playfield';
  const BOARD_CYCLE = [9, 12, 18];
  const BOARD_LABELS = { 9: '9 wide (classic)', 12: '12 wide (roomy)', 18: '18 wide (dense)' };

  function storedBoardWidth() {
    try {
      const v = localStorage.getItem(BOARD_KEY);
      if (v && BOARD_PRESETS[v]) return parseInt(v, 10);
      if (localStorage.getItem(LEGACY_DENSE_KEY) === '1') return 18;  // pre-12 setting
    } catch (e) {}
    return 9;
  }

  // Publish the real height of the touch controls bar so the attract overlay can
  // keep its hint clear of it. The bar is content-sized and grows with the iPhone's
  // bottom safe-area inset, so a hardcoded rem value in the CSS was always going to
  // be wrong on some device. Guarded on h > 0: reading a hidden element gives zero.
  function syncControlsHeightVar() {
    const bar = document.getElementById('bottomControlsBar');
    if (!bar) return;
    const h = bar.getBoundingClientRect().height;
    if (h > 0) document.documentElement.style.setProperty('--controls-h', h + 'px');
  }

  window.addEventListener('DOMContentLoaded', () => {
    const width = storedBoardWidth();
    setBoardWidth(width);
    window.oddApp = new OddballzApp();

    if (new URLSearchParams(location.search).has('palette')) {
      const app = window.oddApp;
      if (app.attractIdleTimer) { clearTimeout(app.attractIdleTimer); app.attractIdleTimer = null; }
      app.scheduleAttractIdle = () => {};   // the demo would repaint the board
      document.getElementById('overlayStart').classList.add('hidden');
      // Clear the floating panels off the board. Both overlap the playfield -- the
      // Controls Guide on the right, the stats card on the left -- which gets in the
      // way of photographing the shapes.
      ['.keybinds-panel', '.stats-panel'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.style.display = 'none';
      });
      app.showPaletteSheet();
    }

    syncControlsHeightVar();
    // Observe the bar itself rather than window resize: on a resize the listener
    // runs a layout pass before the bar has settled to its final height, so the
    // value lagged. ResizeObserver fires with the settled box every time.
    const bar = document.getElementById('bottomControlsBar');
    if (bar && window.ResizeObserver) {
      new ResizeObserver(syncControlsHeightVar).observe(bar);
    } else {
      window.addEventListener('resize', syncControlsHeightVar);
      window.addEventListener('orientationchange', () => setTimeout(syncControlsHeightVar, 150));
    }

    const btnBoard = document.getElementById('btnDensePlayfield');
    if (btnBoard) {
      btnBoard.textContent = '⬢ Board: ' + BOARD_LABELS[width];
      btnBoard.classList.toggle('active', width !== 9);
      btnBoard.addEventListener('click', () => {
        const next = BOARD_CYCLE[(BOARD_CYCLE.indexOf(width) + 1) % BOARD_CYCLE.length];
        try {
          localStorage.setItem(BOARD_KEY, String(next));
          localStorage.removeItem(LEGACY_DENSE_KEY);
        } catch (e) {}
        location.reload();
      });
    }
  });
})();
