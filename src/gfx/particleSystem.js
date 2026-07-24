/**
 * ParticleSystem.js - Three.js 3D Particle Systems
 * Explosion bursts, glowing trailing particles, and level-up effects.
 */

import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Color Palette mapping for ball colors 1..6
    this.colorPalette = [
      new THREE.Color(0x38bdf8), // 1: Cyan
      new THREE.Color(0xf43f5e), // 2: Neon Pink/Red
      new THREE.Color(0x10b981), // 3: Emerald Green
      new THREE.Color(0xf59e0b), // 4: Amber Gold
      new THREE.Color(0xa855f7), // 5: Violet Purple
      new THREE.Color(0xec4899)  // 6: Deep Pink
    ];
  }

  /**
   * Spawn a 3D explosion particle burst when balls are matched or popped.
   */
  spawnPopExplosion(worldPos, colorIndex = 1, count = 35) {
    const color = this.colorPalette[(colorIndex - 1) % this.colorPalette.length] || new THREE.Color(0xffffff);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = worldPos.x;
      positions[i * 3 + 1] = worldPos.y;
      positions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.2;

      // Radial spherical velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2.5 + Math.random() * 4.0;

      velocities.push(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi) + 1.5 // slight upward boost
      );

      scales[i] = 0.15 + Math.random() * 0.25;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle texture canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
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

    this.particles.push({
      mesh: pointCloud,
      velocities: velocities,
      life: 1.0,
      decay: 1.4 // ~0.7s life
    });
  }

  /**
   * Spawn subtle trailing sparkle particles behind active falling piece.
   */
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

  /**
   * Update particle positions and fade lifetimes in frame loop.
   */
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

        // Apply slight gravity to z/y
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
