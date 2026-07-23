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
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    // Position camera for elevated view of hex grid clearing bottom UI bar
    this.camera.position.set(0, -14.5, 17.5);
    this.camera.lookAt(0, 1.2, 0);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

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

    // Build 3D Board Pedestals
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
      { main: 0x00d2ff, roughness: 0.15, metalness: 0.3, emissive: 0x003366 }, // 1: Cyan Crystal
      { main: 0xff2a5f, roughness: 0.15, metalness: 0.3, emissive: 0x550011 }, // 2: Neon Ruby
      { main: 0x00e676, roughness: 0.2,  metalness: 0.2, emissive: 0x004411 }, // 3: Emerald Gold
      { main: 0xffc107, roughness: 0.2,  metalness: 0.4, emissive: 0x553300 }, // 4: Amber Gold
      { main: 0xb030ff, roughness: 0.15, metalness: 0.3, emissive: 0x330055 }, // 5: Electric Amethyst
      { main: 0xff00b7, roughness: 0.15, metalness: 0.3, emissive: 0x550033 }  // 6: Deep Magenta
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
    // 1. Synchronize Static Stacked Board Balls
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
            // Update material if color changed
            mesh.material = mat;
          }
        }
      }
    }

    // Remove meshes no longer in ballMap
    for (const [key, mesh] of this.staticBallMeshes.entries()) {
      if (!currentKeys.has(key)) {
        this.ballsGroup.remove(mesh);
        this.staticBallMeshes.delete(key);
      }
    }

    // 2. Synchronize Active Falling Piece
    // Clear old active meshes
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

          avgX += wPos.x;
          avgY += wPos.y;
          avgZ += wPos.z;
        }
      }

      // Move point light to track active piece center
      avgX /= 4; avgY /= 4; avgZ /= 4;
      this.activePointLight.position.set(avgX, avgY, avgZ + 1.5);
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
