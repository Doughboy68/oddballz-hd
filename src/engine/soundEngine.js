/**
 * SoundEngine.js - Retro Web Audio API Synthesizer & Cyber Techno BGM Engine
 * Ported from audio.js based on 1992 Pascal sound frequencies + modern procedural synth.
 */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.freq = [25, 27, 28, 30, 32, 33, 35, 37, 39, 40, 42, 44, 45, 47, 49, 51, 52, 54, 56];
    
    // Techno BGM State
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmTempo = 128; // BPM
    
    // Techno Bass Notes (Hz)
    this.bassNotes = [
      55.00, 55.00, 110.00, 55.00, 65.41, 55.00, 73.42, 55.00,
      49.00, 49.00, 98.00, 49.00, 58.27, 49.00, 65.41, 49.00
    ];

    // Synth Arp Notes (Hz)
    this.arpNotes = [
      220.00, 261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63,
      174.61, 220.00, 261.63, 329.63, 349.23, 329.63, 261.63, 220.00
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
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
    const stepDuration = 60 / this.bgmTempo / 4; // 16th notes

    this.bgmTimer = setInterval(() => {
      if (!this.bgmPlaying || !this.enabled || !this.ctx) return;
      this.playTechnoStep(this.bgmStep);
      this.bgmStep = (this.bgmStep + 1) % 16;
    }, stepDuration * 1000);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  playTechnoStep(step) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 1. Cyber Kick Drum (Steps 0, 4, 8, 12)
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();

      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.08);

      kickGain.gain.setValueAtTime(0.3, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      kickOsc.connect(kickGain);
      kickGain.connect(this.ctx.destination);
      kickOsc.start(now);
      kickOsc.stop(now + 0.08);
    }

    // 2. Hi-Hat Noise (Steps 2, 6, 10, 14)
    if (step % 4 === 2) {
      const bufferSize = this.ctx.sampleRate * 0.03;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.08, now);
      hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      whiteNoise.connect(filter);
      filter.connect(hatGain);
      hatGain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.03);
    }

    // 3. Arpeggiated Techno Synth Bassline
    const bassFreq = this.bassNotes[step % this.bassNotes.length];
    if (bassFreq) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.06);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    }

    // 4. Ambient Synth Arp Lead (Accent on 16th steps)
    if (step % 2 === 0 && Math.random() < 0.8) {
      const arpFreq = this.arpNotes[step % this.arpNotes.length];
      const arpOsc = this.ctx.createOscillator();
      const arpGain = this.ctx.createGain();

      arpOsc.type = 'sine';
      arpOsc.frequency.setValueAtTime(arpFreq * 2, now);

      arpGain.gain.setValueAtTime(0.025, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      arpOsc.connect(arpGain);
      arpGain.connect(this.ctx.destination);

      arpOsc.start(now);
      arpOsc.stop(now + 0.12);
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
        this.stopBGM();
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
