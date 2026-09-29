"use client";

import { useEffect, useRef } from "react";

// 4×4 Bayer matrix for ordered dithering
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/**
 * Ordered-dither glow that eases toward the pointer — the textured light
 * in Cloudflare's hero panel, re-coloured for ember red.
 */
export function DitherGlow({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const CELL = 5;
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;
    const target = { x: 0.5, y: 1.05 };
    const pos = { x: 0.5, y: 1.05 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.ceil(r.width / CELL);
      h = Math.ceil(r.height / CELL);
      canvas.width = w;
      canvas.height = h;
    };

    const draw = (t: number) => {
      // Hidden or not laid out yet (e.g. display:none below a breakpoint); the ResizeObserver redraws once it has a size.
      if (!w || !h) return;
      pos.x += (target.x - pos.x) * 0.06;
      pos.y += (target.y - pos.y) * 0.06;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      const cx = pos.x * w;
      const cy = pos.y * h;
      const rad = Math.max(w, h) * 0.55;
      const wobble = reduced ? 0 : Math.sin(t / 1400) * 0.06;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (x - cx) / rad;
          const dy = (y - cy) / (rad * 0.8);
          const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)) ** 1.6;
          const scan = 0.05 + 0.035 * Math.sin(y * 0.9 + t / 900);
          const v = Math.min(1, glow * (0.95 + wobble) + scan * (1 - glow));
          if (v > BAYER[(y & 3) * 4 + (x & 3)]!) {
            const i = (y * w + x) * 4;
            const hot = glow > 0.55;
            d[i] = 255;
            d[i + 1] = hot ? 236 : 180;
            d[i + 2] = hot ? 200 : 150;
            d[i + 3] = Math.round(30 + v * 175);
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      if (visible && !reduced) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = Math.min(1.1, (e.clientY - r.top) / r.height + 0.25);
    };
    const onLeave = () => {
      target.x = 0.5;
      target.y = 1.05;
    };

    resize();
    draw(0);
    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduced) raf = requestAnimationFrame(draw);
    });
    io.observe(canvas);
    const host = canvas.parentElement!;
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 size-full [image-rendering:pixelated] ${className}`} />;
}
