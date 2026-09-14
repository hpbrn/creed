"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { DownloadButton } from "@/components/marketing/download-button";
import { Button } from "@/components/ui/button";
import { CompassIcon, type CompassIconHandle } from "@/components/ui/compass";

type Artwork = { rows: string[]; width: number; height: number };

async function createArtwork(): Promise<Artwork | null> {
  const font = '700 360px "Geist Variable"';
  await document.fonts.load(font, "404");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.font = font;
  const metrics = context.measureText("404");
  const columns = Math.ceil(metrics.width / 6) + 4;
  const lines =
    Math.ceil(
      (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / 10,
    ) + 4;
  canvas.width = columns * 6;
  canvas.height = lines * 10;
  context.font = font;
  context.fillText("404", 12, 20 + metrics.actualBoundingBoxAscent);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const shades = ".:-=+*#%@";
  const rows = Array.from({ length: lines }, (_, y) =>
    Array.from({ length: columns }, (_, x) => {
      let coverage = 0;
      for (let dy = 0; dy < 10; dy++) {
        for (let dx = 0; dx < 6; dx++) {
          coverage += data[((y * 10 + dy) * canvas.width + x * 6 + dx) * 4 + 3];
        }
      }
      coverage /= 60 * 255;
      if (coverage < 0.08) return " ";
      const light = 0.56 + 0.23 * Math.cos(x * 0.045 - y * 0.09);
      const grain = (((x * 13 + y * 7) % 17) / 17) * 0.2;
      return shades[
        Math.min(
          shades.length - 1,
          Math.floor(coverage * (light + grain) * shades.length),
        )
      ];
    }).join(""),
  );
  return { rows, width: canvas.width, height: canvas.height };
}

export default function NotFound() {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const compassRef = useRef<CompassIconHandle>(null);
  const reducedMotion = useReducedMotion();
  const animateCompass = () => {
    if (!reducedMotion) compassRef.current?.startAnimation();
  };
  const resetCompass = () => compassRef.current?.stopAnimation();
  useEffect(() => {
    let active = true;
    void createArtwork().then((result) => {
      if (active) setArtwork(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="grid min-h-svh place-items-center p-8">
      <h1 className="sr-only">404</h1>
      <div className="flex w-full max-w-[680px] flex-col items-center gap-8 sm:gap-10">
        {artwork ? (
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${artwork.width} ${artwork.height}`}
            className="h-auto w-full max-w-[680px] text-[var(--creed-accent)]"
          >
            <text
              fill="currentColor"
              fontFamily="var(--font-geist-mono), monospace"
              fontSize="10"
              xmlSpace="preserve"
            >
              {artwork.rows.map((row, index) => (
                <tspan
                  key={index}
                  x="0"
                  y={index * 10 + 9}
                  textLength={artwork.width}
                  lengthAdjust="spacingAndGlyphs"
                  className="scroll-ascii-row"
                  style={{ animationDelay: `${index * -0.12}s` }}
                >
                  {row}
                </tspan>
              ))}
            </text>
          </svg>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <DownloadButton />
          <Button
            asChild
            variant="outline"
            className="rounded-sm border-[var(--creed-border)]"
          >
            <Link
              href="/"
              onMouseEnter={animateCompass}
              onMouseLeave={resetCompass}
              onFocus={animateCompass}
              onBlur={resetCompass}
            >
              <CompassIcon
                ref={compassRef}
                size={16}
                aria-hidden="true"
                className="size-4 shrink-0"
              />
              View Site
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
