"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      className="z-40! transition-[bottom]! duration-[260ms]! ease-[cubic-bezier(0.22,1,0.36,1)]!"
      offset={{
        bottom: "calc(20px + var(--getting-started-offset, 0px))",
        right: 20,
        top: 20,
        left: 20,
      }}
      gap={10}
      duration={4000}
      visibleToasts={4}
      closeButton
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group rounded-lg! border! p-3.5! pr-10! text-[13px]! leading-5! shadow-[0_10px_30px_rgba(28,28,26,0.10)]!",
          title: "font-medium!",
          closeButton:
            "absolute! top-1/2! right-2.5! left-auto! h-7! w-7! -translate-y-1/2! transform-none! rounded-[8px]! border-0! bg-transparent! text-current! opacity-70! transition-all! hover:bg-current/[0.10]! hover:opacity-100! [&_svg]:h-4! [&_svg]:w-4!",
          success:
            "border-[#A7F3D0]! bg-[#ECFDF5]! text-[#047857]! dark:border-[#064e3b]! dark:bg-[#052e1a]! dark:text-[#4ade80]!",
          warning:
            "border-[#FCD34D]! bg-[#FFFBEB]! text-[#92400E]! dark:border-[#78350F]! dark:bg-[#451a03]! dark:text-[#fbbf24]!",
          error:
            "border-[#FCA5A5]! bg-[#FEF2F2]! text-[#B91C1C]! dark:border-[#7F1D1D]! dark:bg-[#3F1212]! dark:text-[#fca5a5]!",
          info: "border-[#BFDBFE]! bg-[#EFF6FF]! text-[var(--creed-accent-hover)]! dark:border-[#1E3A8A]! dark:bg-[#0B1F4A]! dark:text-[#93C5FD]!",
        },
      }}
    />
  );
}
