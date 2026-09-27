"use client";

import { Children, isValidElement, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface HoverEffectProps {
  children: ReactNode;
  className?: string;
}

const highlightClassName =
  "absolute inset-0 h-full w-full rounded-3xl bg-brand-blue-light/45 shadow-[0_8px_30px_rgba(64,70,149,0.16)]";

export function HoverEffect({ children, className }: HoverEffectProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const items = Children.toArray(children);

  return (
    <div className={cn("grid", className)}>
      {items.map((child, index) => (
        <div
          key={isValidElement(child) && child.key != null ? child.key : index}
          className="group relative block h-full w-full p-2"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onFocusCapture={() => setHoveredIndex(index)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setHoveredIndex(null);
            }
          }}
        >
          <AnimatePresence>
            {hoveredIndex === index &&
              (shouldReduceMotion ? (
                <span className={highlightClassName} />
              ) : (
                <motion.span
                  layoutId="hoverBackground"
                  className={highlightClassName}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.15 } }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, delay: 0.2 },
                  }}
                />
              ))}
          </AnimatePresence>
          <div className="relative z-20 h-full">{child}</div>
        </div>
      ))}
    </div>
  );
}
