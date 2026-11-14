import {Injectable, signal} from '@angular/core';
import {PartCategory} from './lamp.types';

@Injectable({providedIn: 'root'})
export class SoundEngine {
  private ctx: AudioContext | null = null;
  readonly muted = signal(false);

  private ensureContext(): AudioContext | null {
    if (this.muted() || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext?: typeof AudioContext})
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute(): void {
    this.muted.update((m) => !m);
  }

  playSwitchClick(turningOn: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Crisp mechanical brass click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(turningOn ? 920 : 620, now);
    osc.frequency.exponentialRampToValueAtTime(turningOn ? 1480 : 280, now + 0.045);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);

    if (turningOn) {
      // Subtle warm filament bloom tone
      const hum = ctx.createOscillator();
      const humGain = ctx.createGain();
      hum.type = 'sine';
      hum.frequency.setValueAtTime(220, now + 0.03);
      hum.frequency.exponentialRampToValueAtTime(330, now + 0.22);
      humGain.gain.setValueAtTime(0.001, now + 0.03);
      humGain.gain.linearRampToValueAtTime(0.05, now + 0.09);
      humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      hum.connect(humGain).connect(ctx.destination);
      hum.start(now + 0.03);
      hum.stop(now + 0.3);
    }
  }

  playPartSwap(category: PartCategory): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq =
      category === 'base'
        ? 180
        : category === 'stem'
          ? 340
          : category === 'bulb'
            ? 780
            : 520;

    osc.type = category === 'bulb' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.07);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  playGatherChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  playCoinSale(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  playAppraisal(stars: 1 | 2 | 3): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord =
      stars === 3
        ? [523.25, 659.25, 783.99, 1046.5]
        : stars === 2
          ? [440, 554.37, 659.25]
          : [329.63, 293.66];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }
}
