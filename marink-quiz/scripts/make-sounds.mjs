// 効果音（WAV）を生成する。外部素材を使わず、ゲーム内で使う3種類を作る。
// 実行: node scripts/make-sounds.mjs
import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 44100;
const out = path.resolve('assets/sounds');
fs.mkdirSync(out, { recursive: true });

/** notes: [{freq, ms}] を順に鳴らす。各音は減衰するサイン波 */
function render(notes, volume = 0.35) {
  const chunks = [];
  for (const { freq, ms, from = freq, to = freq } of notes) {
    const n = Math.floor((SAMPLE_RATE * ms) / 1000);
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      const progress = i / n;
      const f = from + (to - from) * progress;
      const envelope = Math.min(1, i / (SAMPLE_RATE * 0.005)) * Math.exp(-4.5 * progress);
      chunks.push(Math.sin(2 * Math.PI * f * t) * envelope * volume);
    }
  }
  return chunks;
}

function writeWav(file, samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s * 32767))), 44 + i * 2));
  fs.writeFileSync(path.join(out, file), buf);
  console.log('wrote', file, `${(buf.length / 1024).toFixed(1)} KB`);
}

// 押した時の軽いクリック音
writeWav('tap.wav', render([{ freq: 880, to: 620, ms: 55 }], 0.25));
// 正解：上昇アルペジオ
writeWav(
  'correct.wav',
  render([
    { freq: 523.25, ms: 110 },
    { freq: 659.25, ms: 110 },
    { freq: 783.99, ms: 110 },
    { freq: 1046.5, ms: 340 },
  ], 0.3),
);
// 不正解：下降する低い音
writeWav('wrong.wav', render([{ from: 330, to: 196, ms: 360 }], 0.3));
