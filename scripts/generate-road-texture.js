const PImage = require('pureimage');
const fs = require('fs');
const path = require('path');

const W = 1024;
const H = 1024;

const canvas = PImage.make(W, H);
const ctx = canvas.getContext('2d');

// asphalt base
ctx.fillStyle = '#1a1a1a';
ctx.fillRect(0, 0, W, H);

// noise
for (let i = 0; i < 80000; i++) {
  const x = Math.random() * W;
  const y = Math.random() * H;
  const v = Math.floor(Math.random() * 30 + 20);
  ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.08)`;
  ctx.fillRect(x, y, 2, 2);
}

// tar seams (horizontal faint dark lines)
for (let y = 0; y < H; y += 180) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, y + Math.floor(Math.random() * 8), W, 2);
}

// edge lines
ctx.fillStyle = 'rgba(220,220,220,0.7)';
ctx.fillRect(W * 0.08, 0, 6, H);
ctx.fillRect(W * 0.92, 0, 6, H);

// dashed center line
ctx.fillStyle = 'rgba(230,230,230,0.8)';
for (let y = 0; y < H; y += 140) {
  ctx.fillRect(W * 0.5 - 2.5, y, 5, 70);
}

// subtle cracks
ctx.strokeStyle = 'rgba(0,0,0,0.25)';
ctx.lineWidth = 1;
for (let i = 0; i < 40; i++) {
  const x = Math.random() * W;
  const y = Math.random() * H;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.random() * 60 - 30, y + Math.random() * 30 - 15);
  ctx.stroke();
}

const outDir = path.join(__dirname, '../public/textures');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'road.png');
PImage.encodePNGToStream(canvas, fs.createWriteStream(outPath))
  .then(() => console.log('Generated', outPath))
  .catch((err) => console.error(err));
