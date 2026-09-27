"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type AdSize =
  | "mpu"
  | "leaderboard"
  | "super-leaderboard"
  | "billboard"
  | "skyscraper"
  | "half-page"
  | "mobile-banner"
  | "native-strip"
  | "square";

export interface Dimensions {
  width: number;
  height: number;
}

export const SIZE_PRESETS: Record<AdSize, Dimensions> = {
  mpu: { width: 300, height: 250 },
  leaderboard: { width: 728, height: 90 },
  "super-leaderboard": { width: 970, height: 90 }, // 404's fixed-footer size
  billboard: { width: 970, height: 250 },
  skyscraper: { width: 160, height: 600 },
  "half-page": { width: 300, height: 600 }, // 404-style sidebar unit
  "mobile-banner": { width: 320, height: 50 },
  // 404-style fluid native strip — width is the CAP; the slot renders w-full
  // up to it (see the fluid handling below). Live = official AdSense
  // responsive horizontal unit (data-full-width-responsive), dynamically
  // served — the height reserve is a MIN (small CLS possible when a taller
  // ad serves; accepted tradeoff, user call 2026-07-16). Preview keeps the
  // fixed 64px house strip.
  "native-strip": { width: 720, height: 64 },
  square: { width: 300, height: 300 },
};

/** Newsletter signup route — used by the upsell and the house Shakeout ad. */
const SIGNUP_HREF = "/signup";

export interface AdSlotProps {
  /** AdSense `data-ad-slot` ID from your AdSense dashboard. */
  slot: string;
  /** Size preset or explicit dimensions. */
  size: AdSize | Dimensions;
  /**
   * Show the "Advertisement" disclaimer row on the frame over a filled ad.
   * Default true. (No disclaimer over the house fallback — it isn't an ad.)
   */
  label?: boolean;
  /** Show the "Go ad free" upsell in the disclaimer row. Default true. */
  showUpsell?: boolean;
  /** Destination for "Go ad free". Default `/signup`. */
  upsellHref?: string;
  /**
   * Disclaimer text size in px. Default 11. Drop it on small units so the
   * "ADVERTISEMENT · GO AD FREE" row stays narrower than the creative and the
   * frame margins stay even all round.
   */
  disclaimerSize?: number;
  /**
   * Stack the disclaimer parts vertically instead of the dot-separated row.
   * Default auto: stacked when the creative is narrower than ~260px (e.g.
   * skyscraper) so the row never forces the frame wider than the ad.
   */
  disclaimerStacked?: boolean;
  /**
   * Show a "Hide" control in the disclaimer that dismisses the unit. Pair with
   * `dismissKey` to remember the dismissal across visits (localStorage).
   */
  dismissible?: boolean;
  /** localStorage key under which a dismissal is remembered. */
  dismissKey?: string;
  /**
   * Render as a full-bleed bar fixed to the bottom of the viewport (404 Media's
   * `ad-fixed`). Always dismissible; pair with `dismissKey` to keep it hidden.
   * Slides up on appear and reserves body space so it never covers content.
   */
  sticky?: boolean;
  /**
   * For `sticky`: reveal the bar only once the viewport has scrolled this many
   * px (404 reveals its footer on scroll). Default 0 = slide in on mount.
   */
  appearAfter?: number;
  /** For `sticky`: render nothing if the ad doesn't fill (skip the house ad). */
  hideWhenUnfilled?: boolean;
  /** Called when the unit is dismissed via "Hide". */
  onDismiss?: () => void;
  /**
   * Wrap the unit in the bordered frame with the disclaimer on the top rule
   * (404-style). Default true. Turn off when the placement provides its own
   * card chrome (e.g. a custom fallback).
   */
  framed?: boolean;
  /** Vertical breathing room (margin) around the whole unit. Default true. */
  breathingRoom?: boolean;
  /**
   * Custom React content shown in place of the ad if AdSense returns no fill
   * (or the slot hasn't rendered within 1.5s). Defaults to the Shakeout
   * newsletter house ad.
   */
  fallback?: ReactNode;
  /** Lazy-load the ad script until the slot scrolls into view (default true). */
  lazy?: boolean;
  /**
   * Skip the AdSense call entirely and render the fallback immediately.
   * For placeholder pages where the slot ID isn't a real AdSense unit.
   */
  preview?: boolean;
  /**
   * Design-system demo only: render the disclaimer/frame over a neutral
   * placeholder creative (no AdSense, no house fallback).
   */
  mockAd?: boolean;
  /** Additional classes on the outer frame. */
  className?: string;
  "aria-label"?: string;
}

// ============================================================================
// Disclaimer row — "ADVERTISEMENT · GO AD FREE · HIDE"
// All caps, one size; the label/Hide are muted, the upsell is the link accent.
// ============================================================================

function AdDisclaimer({
  showUpsell,
  upsellHref,
  dismissible,
  onDismiss,
  size,
  stacked,
}: {
  showUpsell: boolean;
  upsellHref: string;
  dismissible: boolean;
  onDismiss: () => void;
  size: number;
  /** Stack the parts vertically (narrow units) instead of a dot-separated row. */
  stacked: boolean;
}) {
  const label = <span className="text-textSubtler">Advertisement</span>;
  const upsell = showUpsell ? (
    <a
      href={upsellHref}
      className="text-link transition-colors hover:text-textDefault"
    >
      Go ad free
    </a>
  ) : null;
  const hide = dismissible ? (
    <button
      type="button"
      onClick={onDismiss}
      className="cursor-pointer uppercase text-link transition-colors hover:text-textDefault"
    >
      Hide
    </button>
  ) : null;
  const base = "font-medium uppercase leading-none tracking-[0.08em]";

  if (stacked) {
    // Vertical, no dots — fits within a narrow creative without widening it.
    return (
      <span
        className={`flex flex-col items-center gap-1 ${base}`}
        style={{ fontSize: size }}
      >
        {label}
        {upsell}
        {hide}
      </span>
    );
  }

  const Dot = () => (
    <span aria-hidden className="text-textSubtler">
      &middot;
    </span>
  );
  return (
    <span
      className={`flex items-center justify-center gap-2 ${base}`}
      style={{ fontSize: size }}
    >
      {label}
      {upsell && (
        <>
          <Dot />
          {upsell}
        </>
      )}
      {hide && (
        <>
          <Dot />
          {hide}
        </>
      )}
    </span>
  );
}

// ============================================================================
// Mock creative — neutral placeholder for DS demos (mockAd).
// ============================================================================

function MockCreative({ width, height }: Dimensions) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xs bg-[var(--ds-gray-100)]">
      <span className="text-[12px] font-medium tabular-nums text-textSubtle">
        {width} &times; {height}
      </span>
    </div>
  );
}

// ============================================================================
// House fallback — the Shakeout newsletter ad. Shown when no ad fills.
// Borderless (the frame provides the border); adapts to the slot's shape.
// Creative fill is gray-100 (the component-background tone) so the unit
// reads as a filled ad box even on the canvas page background — bg-canvas
// made it vanish into the page.
// ============================================================================

export function ShakeoutAd({ width, height }: Dimensions) {
  const kicker = (
    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-link">
      The Shakeout
    </span>
  );
  const ctaStyle: React.CSSProperties = {
    background: "hsl(var(--color-textDefault))",
    color: "hsl(var(--color-textInverted))",
  };

  // 404-style native strip (fluid × 64) — full-width row; the CTA hides
  // below sm exactly as 404 hides theirs on small screens.
  if (height <= 72 && width >= 600) {
    return (
      <a
        href={SIGNUP_HREF}
        className="flex h-full w-full items-center justify-between gap-4 rounded-xs bg-[var(--ds-gray-100)] px-4 no-underline sm:px-6"
      >
        <div className="flex min-w-0 flex-col items-start gap-0.5 text-left">
          {kicker}
          <span className="truncate text-[13px] font-medium text-textDefault">
            Weekly running stories, gear, and race news.
          </span>
        </div>
        <span
          className="hidden h-9 shrink-0 items-center gap-1 rounded-sm px-3.5 font-sans text-[13px] font-semibold sm:inline-flex"
          style={ctaStyle}
        >
          Subscribe
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-textSubtle sm:hidden" />
      </a>
    );
  }

  // Very small mobile banner (≤ 60px tall) — single inline line.
  if (height <= 60) {
    return (
      <a
        href={SIGNUP_HREF}
        className="flex h-full w-full items-center justify-center gap-2 rounded-xs bg-[var(--ds-gray-100)] px-4 no-underline"
      >
        <span className="text-[12px] font-semibold text-textDefault">
          The Shakeout &mdash; our weekly running newsletter
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-textSubtle" />
      </a>
    );
  }

  // Short + wide (leaderboard 728×90) — kicker + line + CTA in a row.
  if (height < 100) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-4 rounded-xs bg-[var(--ds-gray-100)] px-6 text-center">
        <div className="flex flex-col items-start gap-0.5 text-left">
          {kicker}
          <span className="text-[13px] font-medium text-textDefault">
            Weekly running stories, gear, and race news.
          </span>
        </div>
        <a
          href={SIGNUP_HREF}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-sm px-3.5 font-sans text-[13px] font-semibold no-underline"
          style={ctaStyle}
        >
          Subscribe
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  // Tall + narrow (skyscraper / half-page) — stacked.
  if (width < 320 && height > 400) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-between rounded-xs bg-[var(--ds-gray-100)] p-5 text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          {kicker}
          <h4 className="text-[16px] font-semibold leading-tight text-textDefault">
            Don&apos;t miss a beat
          </h4>
          <p className="text-[12px] leading-snug text-textSubtle">
            Weekly running stories, gear, and race news &mdash; straight to your
            inbox.
          </p>
        </div>
        <a
          href={SIGNUP_HREF}
          className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-sm font-sans text-[12px] font-semibold no-underline"
          style={ctaStyle}
        >
          Subscribe
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  // Default — square / MPU / billboard.
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 rounded-xs bg-[var(--ds-gray-100)] p-6 text-center">
      {kicker}
      <h4 className="text-heading-16 text-textDefault">Get the Shakeout</h4>
      <p className="max-w-[85%] text-[13px] leading-snug text-textSubtle">
        Weekly running stories, gear, and race news.
      </p>
      <a
        href={SIGNUP_HREF}
        className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-sm px-3.5 font-sans text-[13px] font-semibold no-underline transition-colors"
        style={ctaStyle}
      >
        Subscribe
        <ChevronRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ============================================================================
// AdSlot
// ============================================================================

const ADSENSE_CLIENT = "ca-pub-5946985206431333";
const FILL_CHECK_DELAY_MS = 1500;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({
  slot,
  size,
  label = true,
  showUpsell = true,
  upsellHref = SIGNUP_HREF,
  disclaimerSize = 11,
  disclaimerStacked,
  dismissible = false,
  dismissKey,
  sticky = false,
  appearAfter = 0,
  hideWhenUnfilled = false,
  onDismiss,
  framed = true,
  breathingRoom = true,
  fallback,
  lazy = true,
  preview = false,
  mockAd = false,
  className = "",
  "aria-label": ariaLabel = "Advertisement",
}: AdSlotProps) {
  const dimensions: Dimensions =
    typeof size === "string" ? SIZE_PRESETS[size] : size;
  // 404-style fluid native strip — renders full width up to the preset's
  // width as a cap, instead of reserving a fixed pixel width. Height stays
  // fixed for CLS safety.
  const fluid = size === "native-strip";

  // Stack the disclaimer on narrow units so it never exceeds the creative.
  const stacked = disclaimerStacked ?? dimensions.width < 260;
  // Framed width = creative + px-4 padding (16) + 1px border, both sides.
  const FRAME_X = 34;

  const frameRef = useRef<HTMLFieldSetElement | null>(null);
  const insRef = useRef<HTMLModElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  const inert = preview || mockAd;
  // A fixed footer is always on-screen, so never lazy-gate it.
  const [inView, setInView] = useState(!lazy || sticky);
  const [filled, setFilled] = useState<boolean | null>(inert ? false : null);

  // Remembered dismissal.
  const [dismissed, setDismissed] = useState(false);
  // Sticky slide-in state (translateY 100% -> 0).
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!dismissible || !dismissKey || typeof window === "undefined") return;
    try {
      if (
        window.localStorage.getItem(`ds-ad-dismissed:${dismissKey}`) === "1"
      ) {
        setDismissed(true);
      }
    } catch {
      // localStorage unavailable — just don't persist.
    }
  }, [dismissible, dismissKey]);

  // Sticky: reveal on mount (appearAfter 0) or after scrolling past appearAfter.
  useEffect(() => {
    if (!sticky || typeof window === "undefined") return;
    if (appearAfter <= 0) {
      const id = window.requestAnimationFrame(() => setShown(true));
      return () => window.cancelAnimationFrame(id);
    }
    const onScroll = () => {
      if (window.scrollY >= appearAfter) {
        setShown(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky, appearAfter]);

  // Sticky: reserve body space while visible so the bar never covers content.
  useEffect(() => {
    if (!sticky || !shown || typeof document === "undefined") return;
    const h = stickyRef.current?.offsetHeight ?? 0;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${h}px`;
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, [sticky, shown]);

  const handleDismiss = () => {
    setDismissed(true);
    if (dismissKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(`ds-ad-dismissed:${dismissKey}`, "1");
      } catch {
        // ignore
      }
    }
    onDismiss?.();
  };

  // Sticky Hide: slide the bar down first, then unmount.
  const handleDismissSticky = () => {
    setShown(false);
    window.setTimeout(handleDismiss, 300);
  };

  // 1. IntersectionObserver for lazy loading.
  useEffect(() => {
    if (inert || sticky) return;
    if (!lazy || inView) return;
    const node = frameRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, inView, inert, sticky]);

  // 2. Push the slot to adsbygoogle once in view.
  useEffect(() => {
    if (inert) return;
    if (!inView) return;
    if (typeof window === "undefined") return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Blocker, offline, or script not yet loaded — fallback check handles it.
    }
  }, [inView, inert]);

  // 3. After a short delay, inspect the ins element for fill state.
  useEffect(() => {
    if (inert) return;
    if (!inView) return;

    const timer = setTimeout(() => {
      const ins = insRef.current;
      if (!ins) {
        setFilled(false);
        return;
      }
      const status = ins.getAttribute("data-ad-status");
      if (status === "filled" && ins.offsetHeight > 0) {
        setFilled(true);
      } else {
        setFilled(false);
      }
    }, FILL_CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [inView, inert]);

  if (dismissed) return null;

  // The disclaimer is part of the slot's frame chrome — show it whenever the
  // unit is labelled, regardless of what fills it (loading / ad / house
  // fallback), so every state reads the same.
  const showDisclaimer = label;
  const showFallback = !mockAd && filled === false;

  const creative = mockAd ? (
    <MockCreative {...dimensions} />
  ) : showFallback ? (
    (fallback ?? <ShakeoutAd {...dimensions} />)
  ) : (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={
        fluid
          ? // Responsive unit — fluid width up to the preset cap, NO height:
            // AdSense sizes the served creative itself.
            { display: "block", width: "100%", maxWidth: dimensions.width }
          : {
              display: "block",
              width: dimensions.width,
              // Fixed-size units (e.g. 320×50 mobile-banner) must never exceed
              // the content box — the homepage gutter leaves ~272px at 320px
              // viewports.
              maxWidth: "100%",
              height: dimensions.height,
            }
      }
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      {...(fluid
        ? {
            "data-ad-format": "horizontal",
            "data-full-width-responsive": "true",
          }
        : {})}
    />
  );

  // The framed unit — identical whether inline or pinned as a sticky footer.
  // Sticky only fixes its position; the frame, border, and disclaimer-on-the-
  // top-rule are the same as every other size (NOT a full-bleed bar).
  const frame = (
    <fieldset
      ref={sticky ? undefined : frameRef}
      aria-label={ariaLabel}
      className={[
        "ds-ad mx-auto",
        framed ? "rounded-xs border border-borderSubtle px-4 pb-4 pt-2.5" : "",
        !sticky && breathingRoom ? "my-8" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        minWidth: 0,
        boxSizing: "border-box",
        // Framed: pin to the creative + frame chrome so the margins stay even
        // regardless of the disclaimer width (a wide disclaimer used to stretch
        // a fit-content frame). Unframed: cap at the creative size.
        width: framed ? dimensions.width + FRAME_X : "100%",
        maxWidth: framed ? "100%" : dimensions.width,
      }}
    >
      {showDisclaimer && (
        <legend className="ds-ad__disclaimer">
          <AdDisclaimer
            showUpsell={showUpsell}
            upsellHref={upsellHref}
            dismissible={sticky ? true : dismissible}
            onDismiss={sticky ? handleDismissSticky : handleDismiss}
            size={disclaimerSize}
            stacked={stacked}
          />
        </legend>
      )}

      {/* Reserved frame — same box whether the ad fills, is loading, mock, or
          we swap in the house fallback. */}
      <div
        className="relative mx-auto"
        style={{
          width: fluid ? "100%" : dimensions.width,
          // Fluid live unit: the responsive ad sizes itself, so the reserve
          // is a floor (minHeight), not a fixed box. Preview/house keeps the
          // fixed height — the house strip is exactly the preset height.
          height:
            fluid && !mockAd && !showFallback ? "auto" : dimensions.height,
          maxWidth: fluid ? dimensions.width : "100%",
          minHeight: dimensions.height,
        }}
      >
        {creative}
      </div>
    </fieldset>
  );

  // Sticky footer — 404's ad-fixed, to spec. Full-bleed bg-surface bar with only
  // padding-top (no shadow/border); a centred max-w-1280 container; then the ad
  // block whose TOP border is the rule, with the disclaimer absolutely
  // positioned on it (its bg cuts the line). Ad sits plain underneath. Values
  // taken from 404's computed CSS: wrapper pt 14, container px 16.8, ad-block
  // padding 17.64, disclaimer on top -8.5 with px 10.6.
  if (sticky) {
    if (hideWhenUnfilled && showFallback) return null;
    return (
      <div
        ref={stickyRef}
        className="fixed inset-x-0 bottom-0 z-50 bg-surface transition-transform duration-300 ease-out"
        style={{
          transform: shown ? "translateY(0)" : "translateY(100%)",
          paddingTop: 14,
        }}
        role="region"
        aria-label={ariaLabel}
      >
        <div
          className="mx-auto w-full max-w-[1280px]"
          style={{ paddingLeft: 16.8, paddingRight: 16.8 }}
        >
          <div
            className="relative flex flex-col items-center rounded-t-[3px] border-t border-borderSubtle"
            style={{ padding: 17.64 }}
          >
            {showDisclaimer && (
              <div
                className="absolute left-1/2 -translate-x-1/2 bg-surface"
                style={{ top: -8.5, paddingLeft: 10.6, paddingRight: 10.6 }}
              >
                <AdDisclaimer
                  showUpsell={showUpsell}
                  upsellHref={upsellHref}
                  dismissible
                  onDismiss={handleDismissSticky}
                  size={disclaimerSize}
                  stacked={false}
                />
              </div>
            )}
            {/* Ad zone — 404 reserves 127px here (min-height), taller than the
                ad itself, so the bar height stays stable across footer
                creatives; the ad sits at the top. */}
            <div
              className="mx-auto"
              style={{
                width: dimensions.width,
                minHeight: 127,
                maxWidth: "100%",
              }}
            >
              <div
                className="relative"
                style={{
                  width: dimensions.width,
                  height: dimensions.height,
                  maxWidth: "100%",
                }}
              >
                {creative}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return frame;
}

export default AdSlot;
