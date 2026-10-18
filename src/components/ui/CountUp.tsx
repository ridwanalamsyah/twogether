"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Number that counts up from 0 the first time it shows, then eases to any
 * new value. Respects reduced motion (jumps straight to the value).
 */
export function CountUp({
  value,
  duration = 0.9,
  format = (n) => Math.round(n).toLocaleString("id-ID"),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span className={className}>{format(shown)}</span>;
}
