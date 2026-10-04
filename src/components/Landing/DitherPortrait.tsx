'use client';

import { useEffect, useRef } from 'react';
import { useMousePosition } from '@/hooks/useMousePosition';

const DITHER_SIZE = 4;

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

function orderedDither(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bias: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const gray = data[i]; // already gray
      const threshold =
        ((BAYER_4X4[(y % 4) * 4 + (x % 4)] / 16) * 255) + bias;
      const value = gray < threshold ? 0 : 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function DitherPortrait() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { rawX, rawY } = useMousePosition();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return rawX.on('change', (x) => (mouseRef.current.x = x));
  }, [rawX]);

  useEffect(() => {
    return rawY.on('change', (y) => (mouseRef.current.y = y));
  }, [rawY]);

  useEffect(() => {
    const img = new Image();
    img.src = '/images/tanay-headshot.jpg';
    img.onload = () => {
      imageRef.current = img;
      sourceRef.current = document.createElement('canvas');
      const cols = Math.ceil(img.width / DITHER_SIZE);
      const rows = Math.ceil(img.height / DITHER_SIZE);
      sourceRef.current.width = cols * DITHER_SIZE;
      sourceRef.current.height = rows * DITHER_SIZE;
      const sCtx = sourceRef.current.getContext('2d', {
        willReadFrequently: true,
      });
      if (!sCtx) return;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);

      const ctx = canvas.getContext('2d');
      const source = sourceRef.current;
      if (!ctx || !source) return;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const sCtx = source.getContext('2d');
      if (!sCtx) return;

      const w = source.width;
      const h = source.height;

      sCtx.drawImage(imageRef.current!, 0, 0, w, h);
      sCtx.filter = 'grayscale(100%) contrast(1.15)';
      sCtx.drawImage(imageRef.current!, 0, 0, w, h);
      sCtx.filter = 'none';

      const time = performance.now() * 0.001;
      const noise = Math.sin(time) * 10 + Math.sin(time * 2.3) * 5;
      const mouseParallax =
        (mouseRef.current.x / window.innerWidth - 0.5) * 40;
      const mouseParallaxY =
        (mouseRef.current.y / window.innerHeight - 0.5) * 40;

      orderedDither(sCtx, w, h, noise);

      const scale = Math.max(canvas.width / w, canvas.height / h);
      const dw = w * scale;
      const dh = h * scale;
      const dx = (canvas.width - dw) / 2 + mouseParallax;
      const dy = (canvas.height - dh) / 2 + mouseParallaxY;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 0, 0, w, h, dx, dy, dw, dh);

      // scanline effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.08)';
      const lineY = ((time * 60) % canvas.height);
      ctx.fillRect(0, lineY, canvas.width, 2);

      // subtle vignette
      const grad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.3,
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.8
      );
      grad.addColorStop(0, 'rgba(10,10,10,0)');
      grad.addColorStop(1, 'rgba(10,10,10,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
