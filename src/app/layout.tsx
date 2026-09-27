// src/app/layout.tsx
//
// Root layout — the only owner of <html>/<body>. Deliberately minimal:
// fonts, metadata, and the pre-paint theme bootstrap. Everything
// section-specific lives in the route groups below it:
//   (public)/         — visitor machinery (consent, analytics, providers)
//     (site)/         — public chrome (announcement banner + Masthead)
//     (bare)/         — login + coming-soon (machinery, no chrome)
//   admin/            — lean authenticated tree (theme only)
// No headers()/pathname sniffing here — route groups pick the chrome
// statically, so pages stay eligible for static rendering.
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { EB_Garamond } from "next/font/google";

// Distanz Typography System — all fonts self-hosted
// Body/UI: Geist Sans (`geist/font/sans`)
// Mono/Data: Geist Mono (`geist/font/mono`)
// Editorial headings: EB Garamond (Google Fonts via `next/font/google`)
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});

// Explicit foundation (matches the Next default) — the place for
// viewportFit/theme-color later; any future fixed-to-edge element must
// pair viewport-fit=cover with env(safe-area-inset-*) padding.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Distanz Running",
  description:
    "The latest running news, gear reviews, and interactive race guides.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon0.svg", type: "image/svg+xml" },
      { url: "/icon1.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://distanzrunning.com"),
  alternates: {
    canonical: "https://distanzrunning.com",
  },
  verification: {
    other: {
      "google-adsense-account": "ca-pub-5946985206431333",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`bg-canvas ${GeistSans.variable} ${GeistMono.variable} ${ebGaramond.variable}`}
    >
      <head>
        {/* Theme bootstrap — runs synchronously before first paint so
            users on system/dark don't see a flash of light. Reads
            localStorage for an explicit preference; if none (the
            default for new visitors) or set to "system", honours the
            OS via prefers-color-scheme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Mirrors --ds-background-200 in globals.css per
                // theme — the same token body uses for its
                // background-color. Setting it inline on <html>
                // before paint stops the browser-default white
                // canvas from flashing through on dark-mode reloads
                // (it'd otherwise paint white until the stylesheet
                // loaded the body bg rule).
                var darkBg = '#000000';
                var lightBg = '#FAFAFA';
                try {
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia
                    && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark'
                    || ((!stored || stored === 'system') && prefersDark);
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                    root.style.backgroundColor = darkBg;
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                    root.style.backgroundColor = lightBg;
                  }
                } catch (e) {
                  var fallbackDark = window.matchMedia
                    && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var fallbackRoot = document.documentElement;
                  if (fallbackDark) {
                    fallbackRoot.classList.add('dark');
                    fallbackRoot.style.colorScheme = 'dark';
                    fallbackRoot.style.backgroundColor = darkBg;
                  } else {
                    fallbackRoot.style.backgroundColor = lightBg;
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-canvas text-textDefault min-h-[100dvh] flex flex-col distanz-font-features">
        {children}
      </body>
    </html>
  );
}
