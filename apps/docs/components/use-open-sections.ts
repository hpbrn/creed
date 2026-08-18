"use client";

import { useState } from "react";

export function useOpenSections(initial: string | null) {
  const [open, setOpen] = useState<string | null>(initial);

  return {
    isOpen: (key: string) => open === key,
    toggle: (key: string) => {
      setOpen((current) => (current === key ? null : key));
    },
  };
}
