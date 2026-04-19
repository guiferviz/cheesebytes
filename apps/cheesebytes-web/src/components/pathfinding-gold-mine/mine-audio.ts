/**
 * mine-audio.ts
 *
 * 8-bit procedural sound effects and music engine shared by the
 * playable Mine games. Same melody and SFX palette as the canonical
 * `GoldMineDemo`, kept in sync intentionally so every game in the
 * series feels like the same arcade.
 */

let _audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

export function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.12,
  det = 0,
) {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = det;
  gain.gain.setValueAtTime(vol, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + dur);
}

export const sfx = {
  step() {
    tone(220 + Math.random() * 60, 0.06, "square", 0.07);
  },
  collapse() {
    tone(80, 0.15, "sawtooth", 0.1);
    tone(55, 0.25, "triangle", 0.08);
  },
  gold() {
    tone(587, 0.08, "square", 0.09);
    setTimeout(() => tone(784, 0.1, "square", 0.09), 60);
  },
  bump() {
    tone(90, 0.12, "sawtooth", 0.1, -20);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.18, "square", 0.1), i * 100),
    );
  },
  lose() {
    [311, 277, 233, 185].forEach((f, i) =>
      setTimeout(() => tone(f, 0.22, "sawtooth", 0.1), i * 120),
    );
  },
  rewind() {
    [880, 698, 587, 494, 392].forEach((f, i) =>
      setTimeout(() => tone(f, 0.06, "square", 0.07), i * 40),
    );
  },
  /** Low growl played whenever the monster lurches a step. */
  growl() {
    tone(60 + Math.random() * 18, 0.18, "sawtooth", 0.07, -30);
    tone(140 + Math.random() * 20, 0.1, "triangle", 0.05, -10);
  },
};

const MELODY = [
  164.81, 196, 185, 164.81, 146.83, 164.81, 130.81, 146.83, 123.47, 146.83,
  130.81, 110, 123.47, 110, 98, 110,
];
const BASS = [
  82.41, 82.41, 73.42, 73.42, 65.41, 65.41, 55, 55, 61.74, 61.74, 55, 55, 61.74,
  55, 49, 55,
];
const ND = 0.32;

export class MusicEngine {
  private iv: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  playing = false;

  start() {
    if (this.playing) return;
    this.playing = true;
    const ac = getCtx();
    if (ac.state === "suspended") ac.resume();
    this.step = 0;
    this.tick();
    this.iv = setInterval(() => this.tick(), ND * 1000);
  }

  stop() {
    this.playing = false;
    if (this.iv !== null) {
      clearInterval(this.iv);
      this.iv = null;
    }
  }

  private tick() {
    const i = this.step % MELODY.length;
    tone(MELODY[i], ND * 0.8, "square", 0.05);
    tone(BASS[i], ND * 0.9, "triangle", 0.06);
    this.step++;
  }
}
