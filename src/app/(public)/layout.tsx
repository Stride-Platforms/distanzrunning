// src/app/(public)/layout.tsx
//
// Public-visitor machinery — everything a visitor-facing page needs and
// the admin SPA must never load (dead third-party JS + network that
// pushes out FCP/LCP there): c15t consent + prefetch + GCM, analytics,
// Speed Insights, AdSense. Wraps both the chrome'd content pages
// ((site)) and the bare gate pages ((bare): /login, /coming-soon).
// (Bot checks are Cloudflare Turnstile, mounted per-form — no global
// provider; see components/ui/Turnstile.tsx.)
import { ReactNode } from "react";
import { C15tPrefetch } from "@c15t/nextjs";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { DarkModeProvider } from "@/components/DarkModeProvider";
import { ConsentManagerClient } from "@/components/consent/ConsentManagerClient";
import { UnitsProvider } from "@/contexts/UnitsContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { ConsentBanner } from "@/components/ui/ConsentBanner";
import { ConsentModeSync } from "@/components/consent/ConsentModeSync";
import { PostHogConsentSync } from "@/components/consent/PostHogConsentSync";
import { gcmDefaultsScript } from "@/lib/c15t/gcm";
import { ConsentedAnalytics } from "@/components/consent/ConsentedAnalytics";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Google Consent Mode v2 — an inline script, so it executes at
          parse time, before the async AdSense loader below can run and
          needs its denied baseline. ConsentModeSync fires
          gtag('consent','update',…) once the user decides. PostHog is
          not inlined here — c15t loads it after `measurement` consent
          (see ConsentManagerClient). */}
      <script
        id="gcm-defaults"
        dangerouslySetInnerHTML={{ __html: gcmDefaultsScript() }}
      />
      {/* Start the c15t /init prefetch before hydration (jurisdiction +
          policy). Static-safe: an inline script, not next/headers, so it
          doesn't deopt SSG pages. The provider auto-consumes the matched
          prefetch (same backendURL), killing the banner flash + the lazy
          client /init waterfall. c15t's recommended init flow for static
          routes. */}
      <C15tPrefetch backendURL="/api/c15t" />
      <DarkModeProvider>
        <UnitsProvider>
          <ConsentManagerClient>
            <SearchProvider>
              <ConsentModeSync />
              <PostHogConsentSync />
              {children}
              <ConsentBanner />

              <ConsentedAnalytics />
              <SpeedInsights />
            </SearchProvider>
          </ConsentManagerClient>
        </UnitsProvider>
      </DarkModeProvider>
      {/* Google AdSense — loads once for the whole public site. Individual
          ad units live in <AdSlot /> and push themselves to `adsbygoogle`
          once visible. Rendered as a raw <script> (rather than
          next/script) so AdSense doesn't log a warning about the
          data-nscript attribute. */}
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5946985206431333"
        crossOrigin="anonymous"
      />
    </>
  );
}
