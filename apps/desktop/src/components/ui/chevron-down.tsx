import type { HTMLAttributes } from "react";

import { cn } from "@/components/ui/utils";

interface ChevronDownIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

function ChevronDownIcon({
  className,
  size = 16,
  ...props
}: ChevronDownIconProps) {
  return (
    <div className={cn("inline-flex", className)} {...props}>
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
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export { ChevronDownIcon };
