import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import type { Metadata } from "next";
import "./globals.css";
import "./site.css";
import { ThemeProvider } from "@/components/creed/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { CREED_DESCRIPTION, CREED_META_TITLE, CREED_TAGLINE } from "@/lib/marketing/brand";
export const metadata: Metadata = {
  metadataBase: new URL("https://creed.md"),
  title: CREED_META_TITLE,
  description: CREED_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Creed",
    images: [
      {
        url: "/opengraph.png",
        width: 2200,
        height: 1240,
        alt: `Creed · ${CREED_TAGLINE}. Shown in the Mac app.`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "/opengraph.png",
        alt: `Creed · ${CREED_TAGLINE}. Shown in the Mac app.`,
      },
    ],
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.classList.toggle('dark',(localStorage.getItem('creed:theme')|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))==='dark')}catch{}",
          }}
        />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
