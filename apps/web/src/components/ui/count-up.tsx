"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up to `to` when scrolled into view, then ticks upward slowly. */
export function CountUp({ to, live = false, className }: { to: number; live?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1400;
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
        else if (live) interval = setInterval(() => setN((v) => v + 1), 2600);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      if (interval) clearInterval(interval);
    };
  }, [to, live]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {n.toLocaleString("en-US")}
    </span>
  );
}
