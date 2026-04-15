/**
 * Throwaway component — generates all GoldMineDemo sounds and lets you
 * download each one as a .wav file.  Delete after use.
 */
import React from "react";

function renderToWav(
  generate: (ctx: OfflineAudioContext) => void,
  duration: number,
  sampleRate = 44100,
): Promise<Blob> {
  const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
  generate(ctx);
  return ctx.startRendering().then((buf) => {
    const samples = buf.getChannelData(0);
    const wavBuf = encodeWav(samples, sampleRate);
    return new Blob([wavBuf], { type: "audio/wav" });
  });
}

function encodeWav(samples: Float32Array, sr: number): ArrayBuffer {
  const len = samples.length;
  const buf = new ArrayBuffer(44 + len * 2);
  const v = new DataView(buf);
  const write = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  write(0, "RIFF");
  v.setUint32(4, 36 + len * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  write(36, "data");
  v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function tone(
  ctx: OfflineAudioContext,
  freq: number,
  startTime: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.12,
  det = 0,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = det;
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + dur);
}

// ── Sound definitions (mirrored from GoldMineDemo) ──────────────

const sounds: Record<
  string,
  { duration: number; generate: (ctx: OfflineAudioContext) => void }
> = {
  step: {
    duration: 0.2,
    generate(ctx) {
      // Deterministic version (no Math.random)
      tone(ctx, 250, 0, 0.06, "square", 0.07);
    },
  },
  collapse: {
    duration: 0.4,
    generate(ctx) {
      tone(ctx, 80, 0, 0.15, "sawtooth", 0.1);
      tone(ctx, 55, 0, 0.25, "triangle", 0.08);
    },
  },
  gold: {
    duration: 0.3,
    generate(ctx) {
      tone(ctx, 587, 0, 0.08, "square", 0.09);
      tone(ctx, 784, 0.06, 0.1, "square", 0.09);
    },
  },
  bump: {
    duration: 0.25,
    generate(ctx) {
      tone(ctx, 90, 0, 0.12, "sawtooth", 0.1, -20);
    },
  },
  win: {
    duration: 0.7,
    generate(ctx) {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(ctx, f, i * 0.1, 0.18, "square", 0.1),
      );
    },
  },
  lose: {
    duration: 0.8,
    generate(ctx) {
      [311, 277, 233, 185].forEach((f, i) =>
        tone(ctx, f, i * 0.12, 0.22, "sawtooth", 0.1),
      );
    },
  },
  rewind: {
    duration: 0.4,
    generate(ctx) {
      [880, 698, 587, 494, 392].forEach((f, i) =>
        tone(ctx, f, i * 0.04, 0.06, "square", 0.07),
      );
    },
  },
  music_loop: {
    duration: 6, // single 16-note loop
    generate(ctx) {
      const MELODY = [
        164.81, 196, 185, 164.81, 146.83, 164.81, 130.81, 146.83, 123.47,
        146.83, 130.81, 110, 123.47, 110, 98, 110,
      ];
      const BASS = [
        82.41, 82.41, 73.42, 73.42, 65.41, 65.41, 55, 55, 61.74, 61.74, 55, 55,
        61.74, 55, 49, 55,
      ];
      const ND = 0.32;
      for (let i = 0; i < MELODY.length; i++) {
        tone(ctx, MELODY[i], i * ND, ND * 0.8, "square", 0.05);
        tone(ctx, BASS[i], i * ND, ND * 0.9, "triangle", 0.06);
      }
    },
  },
  music_2min: {
    duration: 125, // ~24 loops × 5.12s = 122.88s, rounded up
    generate(ctx) {
      const MELODY = [
        164.81, 196, 185, 164.81, 146.83, 164.81, 130.81, 146.83, 123.47,
        146.83, 130.81, 110, 123.47, 110, 98, 110,
      ];
      const BASS = [
        82.41, 82.41, 73.42, 73.42, 65.41, 65.41, 55, 55, 61.74, 61.74, 55, 55,
        61.74, 55, 49, 55,
      ];
      const ND = 0.32;
      const loopLen = MELODY.length * ND; // 5.12s
      const loops = Math.ceil(120 / loopLen); // 24 loops ≈ 2min
      for (let l = 0; l < loops; l++) {
        const off = l * loopLen;
        for (let i = 0; i < MELODY.length; i++) {
          tone(ctx, MELODY[i], off + i * ND, ND * 0.8, "square", 0.05);
          tone(ctx, BASS[i], off + i * ND, ND * 0.9, "triangle", 0.06);
        }
      }
    },
  },
};

export const GoldMineSoundExporter: React.FC = () => {
  const handleDownload = async (name: string) => {
    const s = sounds[name];
    if (!s) return;
    const blob = await renderToWav(s.generate, s.duration);
    download(blob, `goldmine_${name}.wav`);
  };

  const handleDownloadAll = async () => {
    for (const name of Object.keys(sounds)) {
      const s = sounds[name];
      const blob = await renderToWav(s.generate, s.duration);
      download(blob, `goldmine_${name}.wav`);
      // Small delay so browser doesn't block multiple downloads
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  return (
    <div
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 400,
      }}
    >
      <h3 style={{ margin: 0 }}>Gold Mine Sound Exporter</h3>
      {Object.keys(sounds).map((name) => (
        <button
          key={name}
          onClick={() => handleDownload(name)}
          style={{ padding: "8px 16px", cursor: "pointer", textAlign: "left" }}
        >
          Download: {name}
        </button>
      ))}
      <hr />
      <button
        onClick={handleDownloadAll}
        style={{ padding: "10px 16px", cursor: "pointer", fontWeight: "bold" }}
      >
        Download ALL
      </button>
    </div>
  );
};
