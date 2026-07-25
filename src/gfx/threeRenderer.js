/**
 * ThreeRenderer.js - High-Definition Three.js 3D Sphere & Hex Board Engine
 * Renders glossy 3D spheres, hex cell pedestals, dynamic lights, and ghost previews.
 */

import * as THREE from 'three';
import { gridToWorld, isInBoard, SPHERE_RADIUS } from '../engine/hexMath.js';

export class ThreeRenderer {
  constructor(containerElement) {
    this.container = containerElement;

    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c16);
    this.scene.fog = new THREE.FogExp2(0x0a0c16, 0.025);

    // 2. Camera Setup
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);
    this.updateCameraFraming();

    // Ball Materials Cache (1..6)
    this.ballMaterials = [];
    this.ghostMaterials = [];
    this.initMaterials();

    // Geometries
    this.sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);

    // Scene Groups
    this.boardGroup = new THREE.Group();
    this.ballsGroup = new THREE.Group();
    this.activeGroup = new THREE.Group();
    this.ghostGroup = new THREE.Group();

    this.scene.add(this.boardGroup);
    this.scene.add(this.ballsGroup);
    this.scene.add(this.activeGroup);
    this.scene.add(this.ghostGroup);

    // Lights
    this.initLights();

    // Build 3D Board Pedestals & 3D Starfield Backdrop
    this.build3DStarfield();
    this.build3DBoard();

    // Cache of static ball meshes in grid: key "x_y" -> Mesh
    this.staticBallMeshes = new Map();
    this.activeMeshes = [];
    this.ghostMeshes = [];

    // Resize Event listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  initMaterials() {
    // 6 Distinct Vibrant Metallic & Crystal Ball Color Palettes
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
        emissiveIntensity: 0.25,
      });

      const ghostMat = new THREE.MeshStandardMaterial({
        color: c.main,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: 0.3,
        wireframe: false
      });

      this.ballMaterials.push(mat);
      this.ghostMaterials.push(ghostMat);
    });
  }

  initLights() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x1a2035, 1.2);
    this.scene.add(ambientLight);

    // Main Directional Key Light with Shadows
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
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Secondary Accent Rim Light
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
    rimLight.position.set(-15, 10, 10);
    this.scene.add(rimLight);

    // Dynamic Active Piece Point Light
    this.activePointLight = new THREE.PointLight(0x00f0ff, 3.0, 10);
    this.activePointLight.position.set(0, 0, 2);
    this.scene.add(this.activePointLight);
  }

  build3DBoard() {
    // 3D Hex Pedestal shape
    const hexRadius = 0.52;
    const hexShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = hexRadius * Math.cos(angle);
      const y = hexRadius * Math.sin(angle);
      if (i === 0) hexShape.moveTo(x, y);
      else hexShape.lineTo(x, y);
    }

    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03
    };

    const hexGeo = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);

    const hexMat = new THREE.MeshStandardMaterial({
      color: 0x141829,
      roughness: 0.6,
      metalness: 0.4,
      emissive: 0x070914,
      emissiveIntensity: 0.5
    });

    const wireMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.35
    });

    const edgeGeo = new THREE.EdgesGeometry(hexGeo);

    // Render cells for every valid grid coordinate in hex board
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

    // Outer Board Chassis Plate
    const chassisGeo = new THREE.BoxGeometry(22, 22, 0.4);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x090c15,
      roughness: 0.8,
      metalness: 0.2
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.position.set(0, 0, -0.5);
    chassisMesh.receiveShadow = true;
    this.boardGroup.add(chassisMesh);
  }

  /**
   * Sync 3D scene with OddUnitEngine state
   */
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

    // Remove meshes no longer in ballMap
    for (const [key, mesh] of this.staticBallMeshes.entries()) {
      if (!nextStaticMeshes.has(key)) {
        this.ballsGroup.remove(mesh);
      }
    }

    this.staticBallMeshes = nextStaticMeshes;
    engine.droppingPathsMap = new Map();

    // 2. Synchronize Active Falling Piece (Re-use 4 Meshes for Butter-Smooth Motion)
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

          avgX += mesh.position.x;
          avgY += mesh.position.y;
          avgZ += mesh.position.z;
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

    // 3. Synchronize Ghost Landing Preview
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
    this.starfieldGroup = new THREE.Group();
    const starCount = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0x00f0ff), // Cyan
      new THREE.Color(0xf43f5e), // Pink
      new THREE.Color(0xa855f7), // Purple
      new THREE.Color(0xf59e0b), // Gold
      new THREE.Color(0xffffff)  // White
    ];

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 2] = -15 - Math.random() * 45;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const starPoints = new THREE.Points(geometry, material);
    this.starfieldGroup.add(starPoints);

    // Floating Wireframe Cosmic Crystals
    const crystalGeo = new THREE.IcosahedronGeometry(1.2, 0);
    const crystalMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });

    for (let i = 0; i < 8; i++) {
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        -10 - Math.random() * 25
      );
      crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.starfieldGroup.add(crystal);
    }

    this.scene.add(this.starfieldGroup);
  }

  render(dt = 0.016) {
    if (this.starfieldGroup) {
      this.starfieldGroup.rotation.y += dt * 0.04;
      this.starfieldGroup.rotation.z += dt * 0.015;
    }

    const lerpSpeed = Math.min(1.0, dt * 24.0);

    // Smooth Lerp Static Stacked Balls & Animate Locks/Drops
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

    // Smooth Lerp Active Falling Spheres
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
