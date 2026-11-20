// 幻想的なBGM（32秒のループ）を生成する。外部素材は使わない。
// 実行: node scripts/make-bgm.mjs  →  assets/sounds/bgm-mystic.wav
import fs from 'node:fs';
import path from 'node:path';

const SR = 22050;
const LOOP_S = 32; // 周期（秒）。すべての成分がこの周期に揃うので、継ぎ目が自然につながる
const L = SR * LOOP_S;
const CHORD_S = 8;

// Am → Fmaj7 → C → G（各8秒）。パッドの構成音（Hz）
const CHORDS = [
  [220.0, 261.63, 329.63, 493.88],
  [174.61, 220.0, 261.63, 329.63],
  [261.63, 329.63, 392.0, 493.88],
  [196.0, 246.94, 293.66, 392.0],
];

const pad = new Float64Array(L);
const bells = new Float64Array(L);

// パッド：各和音を16秒のハン窓で重ねる（50%重なりで合計が一定になり、和音が滑らかに移り変わる）
CHORDS.forEach((notes, c) => {
  const center = c * CHORD_S + CHORD_S / 2;
  for (let n = 0; n < L; n++) {
    const t = n / SR;
    let d = t - center;
    if (d > LOOP_S / 2) d -= LOOP_S;
    if (d < -LOOP_S / 2) d += LOOP_S;
    if (Math.abs(d) >= CHORD_S) continue;
    const w = 0.5 * (1 + Math.cos((Math.PI * d) / CHORD_S));
    let s = 0;
    for (const f of notes) {
      // わずかに音程をずらした2本で厚みを出す
      s += Math.sin(2 * Math.PI * f * t) + 0.6 * Math.sin(2 * Math.PI * f * 1.004 * t);
    }
    // ゆっくりした揺らぎ（周期LOOP_Sに一致）
    const shimmer = 1 + 0.18 * Math.sin((2 * Math.PI * t) / LOOP_S);
    pad[n] += w * shimmer * s * 0.09;
  }
});

// 鐘の音：0.5秒ごとに和音の構成音を上の音域で鳴らす（上がって下がる順）
const ARP_STEP = 0.5;
const steps = Math.round(LOOP_S / ARP_STEP);
for (let k = 0; k < steps; k++) {
  const chord = CHORDS[Math.floor((k * ARP_STEP) / CHORD_S)];
  const seq = [0, 1, 2, 3, 2, 1];
  const f = chord[seq[k % seq.length]] * 2;
  const start = Math.round(k * ARP_STEP * SR);
  const len = Math.round(2.2 * SR);
  for (let i = 0; i < len; i++) {
    const idx = (start + i) % L;
    const t = i / SR;
    const env = Math.exp(-2.6 * t) * Math.min(1, t / 0.005);
    bells[idx] += env * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2.0 * t)) * 0.07;
  }
}

// 残響：遅延付きのフィードバック（周期的に処理して継ぎ目を保つ）
const D = Math.round(0.37 * SR);
const g = 0.45;
const dry = new Float64Array(L);
for (let n = 0; n < L; n++) dry[n] = pad[n] + bells[n];
let wet = Float64Array.from(dry);
for (let pass = 0; pass < 4; pass++) {
  const next = new Float64Array(L);
  for (let n = 0; n < L; n++) next[n] = dry[n] + g * wet[(n - D + L) % L];
  wet = next;
}

// 正規化（ピークを0.6に）
let peak = 0;
for (let n = 0; n < L; n++) peak = Math.max(peak, Math.abs(wet[n]));
const scale = 0.6 / peak;

// 16bit モノラルWAV
const dataSize = L * 2;
const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);
for (let n = 0; n < L; n++) {
  const v = Math.max(-1, Math.min(1, wet[n] * scale));
  buf.writeInt16LE(Math.round(v * 32767), 44 + n * 2);
}
const out = path.resolve('assets/sounds/bgm-mystic.wav');
fs.writeFileSync(out, buf);
console.log('wrote', out, `${(buf.length / 1024 / 1024).toFixed(2)} MB`, `${LOOP_S}s`);
