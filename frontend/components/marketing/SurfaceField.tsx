'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

export type SurfaceFieldState = 'rest' | 'focus' | 'valid' | 'submit';

interface Node {
  bx: number;
  by: number;
  radius: number;
  x: number;
  y: number;
}

const MAX_EDGE_DISTANCE = 0.18;
const TEXT_HALF_WIDTH = 320;
const TEXT_FADE_MARGIN = 120;

function densityFor(width: number): number {
  if (width < 640) return 10;
  if (width < 1024) return 18;
  return 28;
}

function readVar(el: HTMLElement, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * Decorative background grid — static & subtle, zero battery or CPU draw.
 */
export function SurfaceField({ state }: { state: SurfaceFieldState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const strokeColor = readVar(canvas, '--color-text-primary') || '#12151f';
    const baseAlpha = resolvedTheme === 'dark' ? 0.08 : 0.05;

    function buildAndDraw(): void {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = densityFor(width);
      // Deterministic node positions based on index seed
      const nodes: Node[] = Array.from({ length: count }, (_, i) => {
        const seedX = (Math.sin(i * 9999 + 1) + 1) / 2;
        const seedY = (Math.cos(i * 9999 + 1) + 1) / 2;
        return {
          bx: seedX,
          by: seedY,
          radius: 1.5,
          x: seedX * width,
          y: seedY * height,
        };
      });

      ctx.clearRect(0, 0, width, height);

      function columnAlpha(x: number): number {
        const distance = Math.abs(x - width / 2);
        if (distance >= TEXT_HALF_WIDTH + TEXT_FADE_MARGIN) return 1;
        if (distance <= TEXT_HALF_WIDTH) return 0;
        return (distance - TEXT_HALF_WIDTH) / TEXT_FADE_MARGIN;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        if (!a) continue;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          if (!b) continue;
          const dx = (a.x - b.x) / width;
          const dy = (a.y - b.y) / height;
          const distance = Math.hypot(dx, dy);
          if (distance > MAX_EDGE_DISTANCE) continue;
          const falloff = 1 - distance / MAX_EDGE_DISTANCE;
          const edgeAlpha = baseAlpha * falloff * Math.min(columnAlpha(a.x), columnAlpha(b.x));
          if (edgeAlpha <= 0.001) continue;
          ctx.globalAlpha = edgeAlpha;
          ctx.strokeStyle = strokeColor;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      nodes.forEach((node) => {
        const nodeAlpha = baseAlpha * columnAlpha(node.x) * 2;
        if (nodeAlpha <= 0.001) return;
        ctx.globalAlpha = nodeAlpha;
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
    }

    buildAndDraw();

    const resizeObserver = new ResizeObserver(() => {
      buildAndDraw();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [resolvedTheme, state]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

