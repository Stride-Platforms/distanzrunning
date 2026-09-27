"use client";

import React, { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { SiGoogleadsense } from "react-icons/si";
import { Section } from "../ContentWithTOC";
import {
  useShikiHighlighter,
  getTokenStyle,
  type DualThemeToken,
} from "@/components/ui/useShikiHighlighter";
import { useToast } from "@/components/ui/Toast";
import { Note } from "@/components/ui/Note";
import { AdSlot } from "@/components/ui/AdSlot";
import { Button } from "@/components/ui/Button";

// ============================================================================
// Section header + copy-link (matches other DS pages)
// ============================================================================

const HEADER_HEIGHT = 112;
const SECTION_PADDING = 48;

function LinkIcon() {
  return (
    <svg
      height="16"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width="16"
      style={{ width: 14, height: 14, color: "currentcolor" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.46968 1.46968C10.1433 -0.203925 12.8567 -0.203923 14.5303 1.46968C16.2039 3.14329 16.2039 5.85674 14.5303 7.53034L12.0303 10.0303L10.9697 8.96968L13.4697 6.46968C14.5575 5.38186 14.5575 3.61816 13.4697 2.53034C12.3819 1.44252 10.6182 1.44252 9.53034 2.53034L7.03034 5.03034L5.96968 3.96968L8.46968 1.46968ZM11.5303 5.53034L5.53034 11.5303L4.46968 10.4697L10.4697 4.46968L11.5303 5.53034ZM1.46968 14.5303C3.14329 16.2039 5.85673 16.204 7.53034 14.5303L10.0303 12.0303L8.96968 10.9697L6.46968 13.4697C5.38186 14.5575 3.61816 14.5575 2.53034 13.4697C1.44252 12.3819 1.44252 10.6182 2.53034 9.53034L5.03034 7.03034L3.96968 5.96968L1.46968 8.46968C-0.203923 10.1433 -0.203925 12.8567 1.46968 14.5303Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SectionHeader({
  id,
  children,
  onCopyLink,
}: {
  id: string;
  children: React.ReactNode;
  onCopyLink?: (message: string) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    onCopyLink?.("Copied link to clipboard");
    window.history.pushState(null, "", `#${id}`);
    const element = document.getElementById(id);
    if (element) {
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.scrollY;
      const scrollTarget = absoluteElementTop - HEADER_HEIGHT - SECTION_PADDING;
      window.scrollTo({ top: scrollTarget, behavior: "smooth" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative -ml-5 inline-block pl-5 no-underline outline-none text-inherit text-left cursor-pointer bg-transparent border-none"
      id={id}
      style={{ scrollMarginTop: 32 }}
    >
      <h2 className="text-heading-24 text-textDefault">
        <div className="absolute left-0 top-[8px] opacity-0 outline-none group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
          <LinkIcon />
        </div>
        {children}
      </h2>
    </button>
  );
}

// ============================================================================
// Code preview
// ============================================================================

function RenderShikiToken({ token }: { token: DualThemeToken }) {
  const style = getTokenStyle(token);
  return <span style={style}>{token.content}</span>;
}

function CopyIcon() {
  return (
    <svg
      height="16"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width="16"
      style={{ color: "currentcolor" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.75 0.5C1.7835 0.5 1 1.2835 1 2.25V9.75C1 10.7165 1.7835 11.5 2.75 11.5H3.75H4.5V10H3.75H2.75C2.61193 10 2.5 9.88807 2.5 9.75V2.25C2.5 2.11193 2.61193 2 2.75 2H8.25C8.38807 2 8.5 2.11193 8.5 2.25V3H10V2.25C10 1.2835 9.2165 0.5 8.25 0.5H2.75ZM7.75 4.5C6.7835 4.5 6 5.2835 6 6.25V13.75C6 14.7165 6.7835 15.5 7.75 15.5H13.25C14.2165 15.5 15 14.7165 15 13.75V6.25C15 5.2835 14.2165 4.5 13.25 4.5H7.75ZM7.5 6.25C7.5 6.11193 7.61193 6 7.75 6H13.25C13.3881 6 13.5 6.11193 13.5 6.25V13.75C13.5 13.8881 13.3881 14 13.25 14H7.75C7.61193 14 7.5 13.8881 7.5 13.75V6.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      height="16"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width="16"
      style={{ color: "currentcolor" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.5607 3.99999L15.0303 4.53032L6.23744 13.3232C5.55403 14.0066 4.44599 14.0066 3.76257 13.3232L4.2929 12.7929L3.76257 13.3232L0.969676 10.5303L0.439346 9.99999L1.50001 8.93933L2.03034 9.46966L4.82323 12.2626C4.92086 12.3602 5.07915 12.3602 5.17678 12.2626L13.9697 3.46966L14.5 2.93933L15.5607 3.99999Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CopyIconButton({ copied }: { copied: boolean }) {
  return (
    <div className="relative w-4 h-4">
      <span
        className={`absolute inset-0 transition-all duration-150 ease-out ${copied ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}
      >
        <CopyIcon />
      </span>
      <span
        className={`absolute inset-0 transition-all duration-150 ease-out ${copied ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
      >
        <CheckIcon />
      </span>
    </div>
  );
}

interface CodePreviewProps {
  children: React.ReactNode;
  componentCode: string;
  minHeight?: number;
}

function CodePreview({ children, componentCode, minHeight = 200 }: CodePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tokenizedLines = useShikiHighlighter(componentCode, "tsx", undefined, isOpen);
  const lines: DualThemeToken[][] =
    tokenizedLines ||
    componentCode.split("\n").map(
      (line) =>
        [
          {
            content: line,
            color: "hsl(var(--color-textDefault))",
            darkColor: "hsl(var(--color-textDefault))",
          },
        ] as DualThemeToken[],
    );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(componentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, [componentCode]);

  return (
    <div className="border border-borderDefault rounded-lg w-full min-w-0 overflow-hidden">
      <div
        className="p-6 flex items-center justify-center"
        style={{ background: "hsl(var(--color-surface))", minHeight }}
      >
        {children}
      </div>
      <div style={{ background: "hsl(var(--color-canvas))" }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-12 w-full cursor-pointer items-center gap-3 px-4 text-left text-sm text-textDefault border-t border-borderDefault"
        >
          <ChevronDown size={16} className={isOpen ? "" : "-rotate-90"} />
          {isOpen ? "Hide code" : "Show code"}
        </button>
        {isOpen && (
          <div
            className="border-t border-borderDefault overflow-x-auto font-mono text-copy-13"
            style={{ background: "hsl(var(--color-surface))" }}
          >
            <div className="relative group">
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 rounded border border-borderDefault opacity-0 group-hover:opacity-100 transition-opacity z-10 text-textSubtle hover:text-textDefault bg-canvas hover:bg-[var(--ds-gray-100)]"
                aria-label="Copy code"
              >
                <CopyIconButton copied={copied} />
              </button>
              <pre className="overflow-x-auto py-4" data-code-block>
                <code className="block text-copy-13 leading-[20px] font-mono">
                  {lines.map((lineTokens, index) => (
                    <div
                      key={index}
                      className="flex px-4"
                      style={{ fontFeatureSettings: '"liga" off' }}
                    >
                      <span className="select-none w-[32px] min-w-[32px] text-right pr-4 text-textSubtler">
                        {index + 1}
                      </span>
                      <span className="flex-1 pr-4">
                        {lineTokens.map((token, i) => (
                          <RenderShikiToken key={i} token={token} />
                        ))}
                        {lineTokens.length === 0 && " "}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Code snippets
// ============================================================================

const mpuCode = `import { AdSlot } from '@/components/ui/AdSlot';

<AdSlot slot="1234567890" size="mpu" />`;

const leaderboardCode = `import { AdSlot } from '@/components/ui/AdSlot';

<AdSlot slot="1234567890" size="leaderboard" />`;

const billboardCode = `import { AdSlot } from '@/components/ui/AdSlot';

<AdSlot slot="1234567890" size="billboard" />`;

const skyscraperCode = `import { AdSlot } from '@/components/ui/AdSlot';

<AdSlot slot="1234567890" size="skyscraper" />`;

const mobileBannerCode = `import { AdSlot } from '@/components/ui/AdSlot';

<AdSlot slot="1234567890" size="mobile-banner" />`;

const customFallbackCode = `import { AdSlot } from '@/components/ui/AdSlot';
import { NewsletterSignup } from '@/components/ui/NewsletterSignup';

<AdSlot
  slot="1234567890"
  size="mpu"
  fallback={<NewsletterSignup variant="compact" />}
/>`;

const disclaimerCode = `import { AdSlot } from '@/components/ui/AdSlot';

// Every filled unit carries the disclaimer row on the frame:
//   ADVERTISEMENT · GO AD FREE
<AdSlot slot="1234567890" size="leaderboard" />

// Point the upsell at your signup route, or hide it:
<AdSlot slot="..." size="leaderboard" upsellHref="/signup" />
<AdSlot slot="..." size="leaderboard" showUpsell={false} />`;

const houseFallbackCode = `import { AdSlot } from '@/components/ui/AdSlot';

// When no ad fills, the slot falls back to the Shakeout newsletter
// house ad automatically — no extra props needed.
<AdSlot slot="1234567890" size="mpu" />`;

const dismissibleCode = `import { AdSlot } from '@/components/ui/AdSlot';

// Sticky footer unit the reader can dismiss. dismissKey persists the
// "Hide" choice in localStorage so it stays hidden across visits.
<AdSlot
  slot="1234567890"
  size="leaderboard"
  dismissible
  dismissKey="footer"
/>`;

const halfPageCode = `import { AdSlot } from '@/components/ui/AdSlot';

<AdSlot slot="1234567890" size="half-page" />`;

const stickyCode = `import { AdSlot } from '@/components/ui/AdSlot';

// Full-bleed bar pinned to the bottom of the viewport (404's ad-fixed).
// Always dismissible; dismissKey persists the Hide across visits.
<AdSlot
  slot="1234567890"
  size="super-leaderboard"
  sticky
  dismissKey="footer"
/>`;

// ============================================================================
// Main component
// ============================================================================

export default function AdSlotComponent() {
  const { showToast } = useToast();
  const [showSticky, setShowSticky] = useState(false);

  return (
    <div>
      {/* Intro */}
      <Section>
        <SectionHeader id="intro" onCopyLink={showToast}>
          Intro
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 xl:mt-7 mb-6">
          The ad slot is how Distanz Running embeds advertising without
          breaking the layout or the design language. It renders a Google
          AdSense unit at a standard IAB size, reserves the exact pixel space
          before any network call (no layout shift), and lazy-loads only when
          the slot enters the viewport. Every filled unit carries a labelled
          disclaimer row &mdash;{" "}
          <code className="inline-code">Advertisement &middot; Go ad free</code>{" "}
          &mdash; with an optional{" "}
          <code className="inline-code">Hide</code> control for dismissible
          placements (modelled on 404 Media), generous breathing room from the
          surrounding content, and the Shakeout newsletter house ad when the ad
          doesn&apos;t fill.
        </p>

        <Note type="default" label={false}>
          <span className="flex items-center gap-3">
            <SiGoogleadsense
              size={20}
              style={{ color: "#4285F4", flexShrink: 0 }}
            />
            <span>
              Distanz Running is set up under AdSense publisher{" "}
              <code className="inline-code">
                ca-pub-5946985206431333
              </code>
              . The AdSense script is injected once in{" "}
              <code className="inline-code">
                layout.tsx
              </code>
              ; every{" "}
              <code className="inline-code">
                AdSlot
              </code>{" "}
              just passes the ad-unit slot ID it received from the AdSense
              dashboard. No script duplication, no CLS.
            </span>
          </span>
        </Note>
      </Section>

      {/* Disclaimer & controls */}
      <Section>
        <SectionHeader id="disclaimer" onCopyLink={showToast}>
          Disclaimer &amp; controls
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          Above every filled unit sits a small disclaimer row:{" "}
          <code className="inline-code">Advertisement</code> labels the space,{" "}
          <code className="inline-code">Go ad free</code> is the membership
          upsell (the <code className="inline-code">link</code> token,
          dot-separated), and dismissible placements add a{" "}
          <code className="inline-code">Hide</code> control. Hide the upsell
          with <code className="inline-code">showUpsell=&#123;false&#125;</code>{" "}
          or repoint it with <code className="inline-code">upsellHref</code>. On
          small units, lower{" "}
          <code className="inline-code">disclaimerSize</code> so the row stays
          narrower than the creative and the frame margins stay even.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={disclaimerCode} minHeight={200}>
            <AdSlot slot="preview-disclaimer" size="leaderboard" mockAd />
          </CodePreview>
        </div>
      </Section>

      {/* Dismissible */}
      <Section>
        <SectionHeader id="dismissible" onCopyLink={showToast}>
          Dismissible
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          Sticky placements (a fixed footer, an interstitial) add{" "}
          <code className="inline-code">dismissible</code> so the reader can{" "}
          <code className="inline-code">Hide</code> them; pair with{" "}
          <code className="inline-code">dismissKey</code> to remember the choice
          across visits. Try the{" "}
          <strong className="font-medium text-textDefault">Hide</strong> link
          below &mdash; the unit removes itself.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={dismissibleCode} minHeight={200}>
            <AdSlot
              slot="preview-dismissible"
              size="leaderboard"
              mockAd
              dismissible
            />
          </CodePreview>
        </div>
      </Section>

      {/* Sticky footer */}
      <Section>
        <SectionHeader id="sticky-footer" onCopyLink={showToast}>
          Sticky footer
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          The <code className="inline-code">sticky</code> variant renders a
          full-bleed bar fixed to the bottom of the viewport (404 Media&apos;s{" "}
          <code className="inline-code">ad-fixed</code>): a top rule, the centred
          ad, and the disclaimer with{" "}
          <code className="inline-code">Hide</code>. It slides up on appear,
          reserves body space so it never covers content, and is always
          dismissible (pair with{" "}
          <code className="inline-code">dismissKey</code> to persist). On a real
          page, set <code className="inline-code">appearAfter</code> to reveal it
          after a scroll distance, and{" "}
          <code className="inline-code">hideWhenUnfilled</code> to drop it when no
          ad fills. Trigger the live bar:
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={stickyCode} minHeight={120}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowSticky(true)}
            >
              Show sticky footer
            </Button>
          </CodePreview>
        </div>
      </Section>

      {/* MPU */}
      <Section>
        <SectionHeader id="mpu" onCopyLink={showToast}>
          MPU &mdash; 300&times;250
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          The default in-article and sidebar unit. Fits beside editorial
          copy, inside race guides, and at the end of gear reviews.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={mpuCode} minHeight={340}>
            <AdSlot slot="preview-mpu" size="mpu" mockAd />
          </CodePreview>
        </div>
      </Section>

      {/* Leaderboard */}
      <Section>
        <SectionHeader id="leaderboard" onCopyLink={showToast}>
          Leaderboard &mdash; 728&times;90
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          Horizontal top-of-page unit for desktop. Paired below the nav or
          between content sections.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={leaderboardCode} minHeight={200}>
            <AdSlot slot="preview-leaderboard" size="leaderboard" mockAd />
          </CodePreview>
        </div>
      </Section>

      {/* Billboard */}
      <Section>
        <SectionHeader id="billboard" onCopyLink={showToast}>
          Billboard &mdash; 970&times;250
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          Premium above-the-fold unit on wide desktop layouts. Reserve for
          homepage and landing pages.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={billboardCode} minHeight={340}>
            <AdSlot slot="preview-billboard" size="billboard" mockAd />
          </CodePreview>
        </div>
      </Section>

      {/* Skyscraper */}
      <Section>
        <SectionHeader id="skyscraper" onCopyLink={showToast}>
          Skyscraper &mdash; 160&times;600
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          Vertical sidebar unit. Good for long-form article pages with a
          sticky rail.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={skyscraperCode} minHeight={680}>
            <AdSlot slot="preview-skyscraper" size="skyscraper" mockAd />
          </CodePreview>
        </div>
      </Section>

      {/* Half-page */}
      <Section>
        <SectionHeader id="half-page" onCopyLink={showToast}>
          Half-page &mdash; 300&times;600
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          The wider sidebar rail unit (404 Media&apos;s sidebar size). More
          presence than the skyscraper for long-form article and race pages.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={halfPageCode} minHeight={680}>
            <AdSlot slot="preview-half-page" size="half-page" mockAd />
          </CodePreview>
        </div>
      </Section>

      {/* Mobile banner */}
      <Section>
        <SectionHeader id="mobile-banner" onCopyLink={showToast}>
          Mobile banner &mdash; 320&times;50
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          Compact bottom-of-screen unit for mobile. Sits above the nav bar
          or at the end of a mobile feed.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={mobileBannerCode} minHeight={140}>
            <AdSlot slot="preview-mobile" size="mobile-banner" mockAd />
          </CodePreview>
        </div>
      </Section>

      {/* House fallback — Shakeout */}
      <Section>
        <SectionHeader id="house-fallback" onCopyLink={showToast}>
          House fallback &mdash; Shakeout
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          When AdSense returns no fill, the slot doesn&apos;t collapse or sit
          empty &mdash; it shows the{" "}
          <strong className="font-medium text-textDefault">Shakeout</strong>{" "}
          newsletter house ad, adapted to the slot&apos;s shape. No disclaimer
          row (it isn&apos;t a paid ad), and the reserved space stays fixed so
          the layout never shifts.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={houseFallbackCode} minHeight={340}>
            <AdSlot slot="preview-house" size="mpu" preview />
          </CodePreview>
        </div>
      </Section>

      {/* Custom fallback */}
      <Section>
        <SectionHeader id="custom-fallback" onCopyLink={showToast}>
          Custom fallback
        </SectionHeader>
        <p className="text-copy-16 text-textSubtle mt-4 mb-6">
          To override the default Shakeout house ad &mdash; a different
          newsletter CTA, a related race, an affiliate product &mdash; pass
          any React node to{" "}
          <code className="inline-code">
            fallback
          </code>
          . The dimensions stay fixed so the layout never shifts whether an
          ad fills or not.
        </p>
        <div className="mt-4 xl:mt-7">
          <CodePreview componentCode={customFallbackCode} minHeight={340}>
            <AdSlot
              slot="preview-custom"
              size="mpu"
              preview
              fallback={
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-md bg-canvas p-6 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-link">
                    Race guide
                  </span>
                  <h4 className="text-heading-16 text-textDefault">
                    London Marathon 2025
                  </h4>
                  <p className="text-copy-13 leading-snug text-textSubtle">
                    Route, times, and the full elevation profile.
                  </p>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md font-sans text-copy-13 font-semibold no-underline"
                    style={{
                      background: "hsl(var(--color-textDefault))",
                      color: "hsl(var(--color-textInverted))",
                    }}
                  >
                    View guide
                  </a>
                </div>
              }
            />
          </CodePreview>
        </div>
      </Section>

      {/* Live sticky footer, triggered from the Sticky footer section. mockAd
          shows a placeholder creative; Hide (or the slide-out) resets it. */}
      {showSticky && (
        <AdSlot
          slot="preview-sticky"
          size="super-leaderboard"
          sticky
          mockAd
          onDismiss={() => setShowSticky(false)}
        />
      )}
    </div>
  );
}
