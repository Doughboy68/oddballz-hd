/**
 * main.js - Oddballz HD Application Entry Point
 * Integrates OddUnitEngine, ThreeRenderer, ParticleSystem, SoundEngine, and HUD.
 */

import confetti from 'canvas-confetti';
import { OddUnitEngine } from './engine/oddunitEngine.js';
import { gridToWorld, SPHERE_RADIUS } from './engine/hexMath.js';
import { ThreeRenderer } from './gfx/threeRenderer.js';
import { ParticleSystem } from './gfx/particleSystem.js';
import { SoundEngine } from './engine/soundEngine.js';

class OddballzApp {
  constructor() {
    this.container = document.getElementById('canvasContainer');

    // Engines
    this.engine = new OddUnitEngine();
    this.renderer = new ThreeRenderer(this.container);
    this.particles = new ParticleSystem(this.renderer.scene);
    this.audio = new SoundEngine();

    // Game loop state
    this.isPlaying = false;
    this.isPaused = false;
    this.moveTime = 0;
    this.lastTime = performance.now();
    this.accumulatedTime = 0;

    // High Scores from localStorage
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

    // Initial 3D Scene Update
    this.renderer.updateScene(this.engine);

    // Main Animation Loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initHooks() {
    // Engine Audio Hooks
    this.engine.onPlaySound = (type, param) => {
      this.audio.playSound(type, param);
    };

    // Engine Particle Hooks (Pop Balls & Row Clears)
    this.engine.onPopBalls = (matchList) => {
      for (const m of matchList) {
        const wPos = gridToWorld(m.x, m.y, SPHERE_RADIUS);
        this.particles.spawnPopExplosion(wPos, m.color || 1);
      }
    };
  }

  initEventListeners() {
    // Keyboard Controls matching original 1992 Help file & ODDUNIT.PAS DoKey procedure
    window.addEventListener('keydown', (e) => {
      const code = e.code;

      if (code === 'Enter') {
        const modal = document.getElementById('gameDialogView');
        if (modal && !modal.classList.contains('hidden')) {
          this.closeHighScoresModal();
          e.preventDefault();
          return;
        }

        if (!this.isPlaying || this.engine.endGame) {
          this.startGame();
        }
        e.preventDefault();
        return;
      }

      if (code === 'KeyM') {
        this.audio.setMasterEnabled(!this.audio.enabled);
        this.syncAudioUI();
        this.saveAudioSettings();
        e.preventDefault();
        return;
      }

      if (!this.isPlaying) return;

      if (code === 'KeyP') {
        this.togglePause();
        e.preventDefault();
        return;
      }

      if (this.isPaused) return;

      switch (code) {
        case 'KeyF':
        case 'Insert':
        case 'Numpad0':
          this.engine.rotColors();
          e.preventDefault();
          break;

        case 'ArrowLeft':
        case 'KeyD':
          this.engine.moveOBall(1);
          e.preventDefault();
          break;

        case 'ArrowRight':
        case 'KeyG':
          this.engine.moveOBall(4);
          e.preventDefault();
          break;

        case 'ArrowUp':
          this.engine.transform(this.engine.rotCCW);
          e.preventDefault();
          break;

        case 'ArrowDown':
        case 'KeyV':
          this.engine.transform(this.engine.rotCW);
          e.preventDefault();
          break;

        case 'KeyX':
        case 'Home':
          this.engine.transform(this.engine.flipX);
          e.preventDefault();
          break;

        case 'KeyY':
        case 'End':
          this.engine.transform(this.engine.flipY);
          e.preventDefault();
          break;

        case 'Space':
          this.engine.zip();
          e.preventDefault();
          break;
      }

      this.renderer.updateScene(this.engine);
    });

    // Start / Restart Buttons
    document.getElementById('btnOverlayStart').addEventListener('click', () => this.startGame());
    document.getElementById('btnRestart').addEventListener('click', () => this.startGame());

    // Pause & End Game Controls
    document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
    document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
    document.getElementById('btnPauseEnd').addEventListener('click', () => this.promptEndGame());
    document.getElementById('btnConfirmEndYes').addEventListener('click', () => this.confirmEndGame());
    document.getElementById('btnConfirmEndNo').addEventListener('click', () => this.closeEndGameModal());

    // High Scores Modal
    ['btnHighScores', 'btnGameOverHighScores'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.showHighScoresModal());
    });

    ['btnCloseModal', 'btnRecordsClose'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.closeHighScoresModal());
    });

    // Audio Options Modal & Controls
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
        if (this.audio.enabled && this.audio.musicEnabled && this.isPlaying && !this.isPaused) {
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
        if (this.audio.enabled && this.audio.musicEnabled && this.isPlaying && !this.isPaused) {
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

    // Mode Selector Tabs & Title Screen Cards
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

    // Auto-pause when window or browser tab loses focus
    const handleFocusLoss = () => {
      if (this.isPlaying && !this.isPaused) {
        this.togglePause();
      }
    };

    const handleFocusGain = () => {
      // Re-initialize WebAudio if needed when focus returns, but keep game paused
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
    const dt = (currentTime - this.lastTime) / 1000; // seconds
    this.lastTime = currentTime;

    if (this.isPlaying && !this.isPaused) {
      const stamped = this.engine.updateContinuous(dt);
      if (stamped && this.engine.endGame) {
        this.handleGameOver();
      }

      this.renderer.updateScene(this.engine);
      this.updateUI();

      // Active piece trailing particles
      if (this.engine.oddballz && Math.random() < 0.3) {
        const rootFloatX = this.engine.activeFloatPos ? this.engine.activeFloatPos.x : this.engine.oddballz.map[0].x;
        const rootFloatY = this.engine.activeFloatPos ? this.engine.activeFloatPos.y : this.engine.oddballz.map[0].y;
        const wPos = gridToWorld(rootFloatX, rootFloatY, SPHERE_RADIUS);
        this.particles.spawnTrailParticle(wPos, this.engine.oddballz.image[0]);
      }
    }

    // Update particles & render 3D WebGL scene every frame
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

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.oddApp = new OddballzApp();
});
