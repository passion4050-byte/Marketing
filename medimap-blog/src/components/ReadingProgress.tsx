"use client";

import { useEffect, useState } from "react";

/**
 * Sticky reading progress bar for article pages.
 *
 * Sets the CSS variable `--scroll-progress` (0–1) on the bar element so
 * it animates smoothly via `transform: scaleX(...)` defined in globals.css.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const docEl = document.documentElement;
      const scrollTop = docEl.scrollTop || document.body.scrollTop;
      const scrollHeight = docEl.scrollHeight - docEl.clientHeight;
      const next = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      setProgress(Math.min(1, Math.max(0, next)));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="reading-progress"
      style={{ ["--scroll-progress" as string]: progress }}
      aria-hidden
    />
  );
}
