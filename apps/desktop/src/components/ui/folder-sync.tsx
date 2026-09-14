import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@/components/ui/utils";

export interface FolderSyncIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface FolderSyncIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const FolderSyncIcon = forwardRef<FolderSyncIconHandle, FolderSyncIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    const animationRunRef = useRef(0);
    const isAnimatingRef = useRef(false);

    const resetAfterRun = useCallback(
      (run: number) => {
        if (animationRunRef.current !== run) return;
        controls.set("normal");
        isAnimatingRef.current = false;
      },
      [controls],
    );

    const startRotation = useCallback(() => {
      const run = ++animationRunRef.current;
      isAnimatingRef.current = true;
      void controls.start("animate").then(() => resetAfterRun(run));
    }, [controls, resetAfterRun]);

    const finishRotation = useCallback(() => {
      if (!isAnimatingRef.current) {
        controls.set("normal");
        return;
      }

      const run = ++animationRunRef.current;
      void controls.start("animate").then(() => resetAfterRun(run));
    }, [controls, resetAfterRun]);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: startRotation,
        stopAnimation: finishRotation,
      };
    }, [finishRotation, startRotation]);

    const handleMouseEnter = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) onMouseEnter?.(event);
        else startRotation();
      },
      [onMouseEnter, startRotation],
    );

    const handleMouseLeave = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) onMouseLeave?.(event);
        else finishRotation();
      },
      [finishRotation, onMouseLeave],
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5" />
          <motion.g
            animate={controls}
            style={{ transformOrigin: "17px 16px" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            variants={{
              normal: { rotate: 0 },
              animate: { rotate: -360 },
            }}
          >
            <path d="M12 10v4h4" />
            <path d="m12 14 1.535-1.605a5 5 0 0 1 8 1.5" />
            <path d="M22 22v-4h-4" />
            <path d="m22 18-1.535 1.605a5 5 0 0 1-8-1.5" />
          </motion.g>
        </svg>
      </div>
    );
  },
);

FolderSyncIcon.displayName = "FolderSyncIcon";

export { FolderSyncIcon };
