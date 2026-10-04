const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const BITS = 16;
const CHANNELS = 1;

function writeWav(filename, samples) {
  const byteRate = (SAMPLE_RATE * CHANNELS * BITS) / 8;
  const blockAlign = (CHANNELS * BITS) / 8;
  const dataSize = samples.length * (BITS / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BITS, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
}

function generateClick({ duration, clickFreq, thockFreq, noiseAmount }) {
  const samples = [];
  const n = Math.floor(SAMPLE_RATE * duration);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 35); // fast decay
    const thockEnv = Math.exp(-t * 18);
    const noise = (Math.random() * 2 - 1) * noiseAmount * env;
    const click = Math.sin(2 * Math.PI * clickFreq * t) * env;
    const thock = Math.sin(2 * Math.PI * thockFreq * t) * thockEnv;
    samples.push((click + thock + noise) * 0.5);
  }

  return samples;
}

const outDir = path.join(__dirname, '../public/sounds');
fs.mkdirSync(outDir, { recursive: true });

const variants = [
  { duration: 0.07, clickFreq: 3500, thockFreq: 220, noiseAmount: 0.6 },
  { duration: 0.08, clickFreq: 3200, thockFreq: 240, noiseAmount: 0.55 },
  { duration: 0.07, clickFreq: 3800, thockFreq: 210, noiseAmount: 0.65 },
  { duration: 0.09, clickFreq: 3000, thockFreq: 230, noiseAmount: 0.5 },
];

function generateEngine(duration) {
  const samples = [];
  const n = Math.floor(SAMPLE_RATE * duration);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const rumble = Math.sin(2 * Math.PI * 55 * t) * 0.3 + Math.sin(2 * Math.PI * 110 * t) * 0.2;
    const noise = (Math.random() * 2 - 1) * 0.15;
    // simple low-pass-ish moving average would need previous state; use slow sine + noise for now
    samples.push((rumble + noise) * Math.min(1, t * 4) * Math.min(1, (duration - t) * 2));
  }
  return samples;
}

function generateTireScreech(duration) {
  const samples = [];
  const n = Math.floor(SAMPLE_RATE * duration);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 1200 + Math.sin(t * 10) * 600 + t * 500;
    const tone = Math.sin(2 * Math.PI * freq * t) * 0.4;
    const noise = (Math.random() * 2 - 1) * 0.4;
    const env = Math.min(1, t * 8) * Math.min(1, (duration - t) * 4);
    samples.push((tone + noise) * env * 0.5);
  }
  return samples;
}

variants.forEach((v, i) => {
  const samples = generateClick(v);
  writeWav(path.join(outDir, `keyclick-${i + 1}.wav`), samples);
  console.log(`Generated keyclick-${i + 1}.wav`);
});

writeWav(path.join(outDir, 'engine.wav'), generateEngine(2.0));
console.log('Generated engine.wav');

writeWav(path.join(outDir, 'tirescreech.wav'), generateTireScreech(0.8));
console.log('Generated tirescreech.wav');

console.log('Done.');
