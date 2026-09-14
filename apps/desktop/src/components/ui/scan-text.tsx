import { forwardRef, useImperativeHandle } from "react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { AnimatedIconHandle } from "@/components/creed/animated-icon-controls";

export const ScanTextIcon = forwardRef<AnimatedIconHandle, { size?: number; className?: string }>(
  function ScanTextIcon({ size = 14, className }, ref) {
    const controls = useAnimation();
    const reduced = useReducedMotion();
    useImperativeHandle(ref, () => ({
      startAnimation: () => {
        if (!reduced) void controls.start((index: number) => ({
          pathLength: [1, 0, 1], opacity: [1, 0, 1],
          transition: { duration: 1, delay: index * 0.14, ease: "easeInOut" },
        }));
      },
      stopAnimation: () => { controls.stop(); controls.set({ pathLength: 1, opacity: 1 }); },
    }), [controls, reduced]);
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
        {["M7 8h8", "M7 12h10", "M7 16h6"].map((d, index) => (
          <motion.path key={d} d={d} custom={index} animate={controls} />
        ))}
      </svg>
    );
  },
);
