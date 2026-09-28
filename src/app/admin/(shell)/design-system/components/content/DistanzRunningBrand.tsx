"use client";

import { useState, useCallback } from "react";
import { Section } from "../ContentWithTOC";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Download, Copy, Check } from "lucide-react";

const LinkIcon = () => (
  <svg
    height="14"
    width="14"
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ color: "currentcolor" }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.46968 1.46968C10.1433 -0.203925 12.8567 -0.203923 14.5303 1.46968C16.2039 3.14329 16.2039 5.85674 14.5303 7.53034L12.0303 10.0303L10.9697 8.96968L13.4697 6.46968C14.5575 5.38186 14.5575 3.61816 13.4697 2.53034C12.3819 1.44252 10.6182 1.44252 9.53034 2.53034L7.03034 5.03034L5.96968 3.96968L8.46968 1.46968ZM11.5303 5.53034L5.53034 11.5303L4.46968 10.4697L10.4697 4.46968L11.5303 5.53034ZM1.46968 14.5303C3.14329 16.2039 5.85673 16.204 7.53034 14.5303L10.0303 12.0303L8.96968 10.9697L6.46968 13.4697C5.38186 14.5575 3.61816 14.5575 2.53034 13.4697C1.44252 12.3819 1.44252 10.6182 2.53034 9.53034L5.03034 7.03034L3.96968 5.96968L1.46968 8.46968C-0.203923 10.1433 -0.203925 12.8567 1.46968 14.5303Z"
    />
  </svg>
);

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <a
      id={id}
      href={`#${id}`}
      className="group relative -ml-5 inline-block pl-5 no-underline outline-none"
      style={{ scrollMarginTop: 32 }}
    >
      <h2 className="text-heading-24">
        <div className="absolute left-0 top-[8px] opacity-0 group-hover:opacity-100 group-focus:opacity-100">
          <LinkIcon />
        </div>
        {title}
      </h2>
    </a>
  );
}

function CopyButton({ text, variant = "light" }: { text: string; variant?: "light" | "dark" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy code"
      className={`absolute right-4 top-4 opacity-0 focus:opacity-100 group-hover:opacity-100 transition-opacity ${variant === "light" ? "ds-copy-btn-on-white" : "ds-copy-btn-on-black"}`}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

// The SVG markup that gets copied to clipboard
const blackFullLogoSvg = `<img src="/brand/logo-full-black.svg" alt="Distanz Running" height="96" />`;
const whiteFullLogoSvg = `<img src="/brand/logo-full-white.svg" alt="Distanz Running" height="96" />`;
const blackWordmarkSvg = `<img src="/brand/wordmark-black.svg" alt="Distanz Running" height="64" />`;
const whiteWordmarkSvg = `<img src="/brand/wordmark-white.svg" alt="Distanz Running" height="64" />`;
const blackMarkSvg = `<img src="/brand/icon-black.svg" alt="Distanz Running" height="32" />`;
const whiteMarkSvg = `<img src="/brand/icon-white.svg" alt="Distanz Running" height="32" />`;

export default function DistanzRunningBrand() {
  return (
    <div>
      {/* Distanz Running heading */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="distanz-running-logo" title="Distanz Running" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            The Distanz Running trademark includes the Distanz Running name &amp; logo.
            Please don&apos;t modify the trademarks or use them in an altered way,
            including suggesting sponsorship or endorsement by Distanz Running, or in a
            way that confuses Distanz Running with another brand.
          </p>
          <div className="mt-4 w-fit">
            <a
              href="/downloads/distanz-brand-assets.zip"
              download="distanz-brand-assets.zip"
              style={{ textDecoration: "none" }}
            >
              <Button
                variant="secondary"
                shape="rounded"
                shadow
                prefixIcon={<Download size={16} />}
              >
                Download Distanz Assets
              </Button>
            </a>
          </div>
        </div>
      </Section>

      {/* Full logo on white background */}
      <div
        className="group relative flex justify-center py-14 md:py-28"
        style={{
          background: "#fff",
        }}
      >
        <CopyButton text={blackFullLogoSvg} variant="light" />
        <div className="flex justify-center" style={{ maxWidth: "80%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-full-black.svg"
            alt="Distanz Running Logo - Black"
            style={{ height: 120, width: "auto" }}
          />
        </div>
      </div>

      {/* Full logo on black background */}
      <div
        className="group relative flex items-center justify-center py-14 md:py-28"
        style={{
          background: "#000",
        }}
      >
        <CopyButton text={whiteFullLogoSvg} variant="dark" />
        <div className="flex justify-center" style={{ maxWidth: "80%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-full-white.svg"
            alt="Distanz Running Logo - White"
            style={{ height: 120, width: "auto" }}
          />
        </div>
      </div>

      {/* Code block for full logo usage */}
      <div
        style={{ borderTop: "1px solid hsl(var(--color-borderDefault))", borderBottom: "1px solid hsl(var(--color-borderDefault))" }}
        className="[&>div]:border-0 [&>div]:rounded-none"
      >
        <CodeBlock
          code={`import { DistanzLogo } from '@/components/logos';\n\n<DistanzLogo height={96} />`}
          language="jsx"
          showLineNumbers={false}
        />
      </div>

      {/* Email logo heading */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="email-logo" title="Email logo" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            A variant of the full logo for emails. The black shapes carry a
            thin white outline rendered with{" "}
            <code className="inline-code">
              paint-order: stroke fill
            </code>
            , so the stroke sits outside each path. On a light email body the
            outline is invisible against the white background; on a dark
            email body it separates the black logo from the surface so it
            stays legible. One asset works in both light- and dark-mode
            email clients.
          </p>
        </div>
      </Section>

      {/* Email logo display — light + dark previews */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div
          className="flex h-[164px] items-center justify-center md:h-[200px]"
          style={{ background: "#FFFFFF" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-full-email.svg"
            alt="Distanz Running Email Logo — on white"
            style={{ height: 72, width: "auto" }}
          />
        </div>
        <div
          className="flex h-[164px] items-center justify-center md:h-[200px]"
          style={{ background: "#1A1A1A" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-full-email.svg"
            alt="Distanz Running Email Logo — on dark"
            style={{ height: 72, width: "auto" }}
          />
        </div>
      </div>

      {/* Wordmark heading */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="wordmark" title="Wordmark" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            The Distanz Running wordmark can be used as an alternative when the full logo
            would be too vertical or when a more horizontal brand presence is needed.
          </p>
        </div>
      </Section>

      {/* Wordmark on white background */}
      <div
        className="group relative flex justify-center py-14 md:py-28"
        style={{ background: "#fff" }}
      >
        <CopyButton text={blackWordmarkSvg} variant="light" />
        <div className="flex justify-center" style={{ maxWidth: "80%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wordmark-black.svg"
            alt="Distanz Running Wordmark - Black"
            style={{ height: 72, width: "auto" }}
          />
        </div>
      </div>

      {/* Wordmark on black background */}
      <div
        className="group relative flex items-center justify-center py-14 md:py-28"
        style={{ background: "#000" }}
      >
        <CopyButton text={whiteWordmarkSvg} variant="dark" />
        <div className="flex justify-center" style={{ maxWidth: "80%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wordmark-white.svg"
            alt="Distanz Running Wordmark - White"
            style={{ height: 72, width: "auto" }}
          />
        </div>
      </div>

      {/* Code block for wordmark usage */}
      <div
        style={{ borderTop: "1px solid hsl(var(--color-borderDefault))", borderBottom: "1px solid hsl(var(--color-borderDefault))" }}
        className="[&>div]:border-0 [&>div]:rounded-none"
      >
        <CodeBlock
          code={`import { DistanzWordmark } from '@/components/logos';\n\n<DistanzWordmark height={64} />`}
          language="jsx"
          showLineNumbers={false}
        />
      </div>

      {/* Symbol heading */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="symbol" title="Symbol" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            The Distanz Running symbol should only be used in places where there is not
            enough room to display the full logo, or in cases where only brand symbols
            are displayed.
          </p>
        </div>
      </Section>

      {/* Symbol display — 2 column grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2"
      >
        {/* White bg */}
        <div
          className="group relative flex h-[164px] items-center justify-center md:h-[200px]"
          style={{ background: "#fff" }}
        >
          <CopyButton text={blackMarkSvg} variant="light" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-black.svg"
            alt="Distanz Running Symbol - Black"
            style={{ height: 32 }}
          />
        </div>
        {/* Black bg */}
        <div
          className="group relative flex h-[164px] items-center justify-center md:h-[200px]"
          style={{ background: "#000" }}
        >
          <CopyButton text={whiteMarkSvg} variant="dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-white.svg"
            alt="Distanz Running Symbol - White"
            style={{ height: 32 }}
          />
        </div>
      </div>

      {/* Code block for symbol usage */}
      <div
        style={{ borderTop: "1px solid hsl(var(--color-borderDefault))", borderBottom: "1px solid hsl(var(--color-borderDefault))" }}
        className="[&>div]:border-0 [&>div]:rounded-none"
      >
        <CodeBlock
          code={`import { DistanzMark } from '@/components/logos';\n\n<DistanzMark size={32} />`}
          language="jsx"
          showLineNumbers={false}
        />
      </div>

      {/* Badge heading */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="badge" title="Badge" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            A self-contained badge version of the symbol for contexts where
            the background is unknown or can switch between light and dark —
            email signatures, user avatars, partner decks. The outlined mark
            and built-in surface mean the badge reads clearly without a
            theme swap.
          </p>
        </div>
      </Section>

      {/* Badge display — 2 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div
          className="group relative flex h-[220px] items-center justify-center md:h-[280px]"
          style={{ background: "var(--ds-gray-200)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-badge.svg"
            alt="Distanz Running Badge — Light"
            style={{ height: 140, width: 140 }}
          />
        </div>
        <div
          className="group relative flex h-[220px] items-center justify-center md:h-[280px]"
          style={{ background: "var(--ds-gray-200)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-badge-alt.svg"
            alt="Distanz Running Badge — Dark"
            style={{ height: 140, width: 140 }}
          />
        </div>
      </div>

      {/* App icon heading */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="app-icon" title="App icon" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            The app-icon master follows Apple&apos;s Human Interface Guidelines:
            a 1024×1024 square canvas with the Distanz mark centered on a
            subtly graduated black surface. The artwork ships with square
            corners — iOS and iPadOS apply a squircle mask automatically
            so the on-device shape stays consistent with every other app
            icon. For macOS, wrap the master with the platform&apos;s
            rounded-corner radius before export.
          </p>
        </div>
      </Section>

      {/* App icon display — keyline master + iOS-masked preview */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Keyline preview — master with HIG-style guide overlay */}
        <div
          className="group relative flex h-[260px] items-center justify-center md:h-[320px]"
          style={{ background: "var(--ds-gray-200)" }}
        >
          <div style={{ position: "relative", width: 200, height: 200 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-app.svg"
              alt="Distanz Running App Icon — master with guidelines"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
            {/* Guideline overlay */}
            <svg
              viewBox="0 0 1024 1024"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              {/* Outer square (full canvas edge) */}
              <rect
                x="1"
                y="1"
                width="1022"
                height="1022"
                fill="none"
                stroke="#EB377D"
                strokeWidth="3"
                strokeDasharray="14 10"
                opacity="0.7"
              />
              {/* iOS squircle mask at 22.37% */}
              <rect
                x="1"
                y="1"
                width="1022"
                height="1022"
                rx="229"
                ry="229"
                fill="none"
                stroke="#EB377D"
                strokeWidth="4"
              />
              {/* Safe-area circle — HIG suggests keeping key content inside
                  the largest inscribed circle (~80% dia) so it survives the
                  mask on every platform */}
              <circle
                cx="512"
                cy="512"
                r="410"
                fill="none"
                stroke="#EB377D"
                strokeWidth="2"
                strokeDasharray="10 8"
                opacity="0.7"
              />
              {/* Center crosshair */}
              <line
                x1="0"
                y1="512"
                x2="1024"
                y2="512"
                stroke="#EB377D"
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.6"
              />
              <line
                x1="512"
                y1="0"
                x2="512"
                y2="1024"
                stroke="#EB377D"
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.6"
              />
              {/* Centre dot */}
              <circle cx="512" cy="512" r="8" fill="#EB377D" />
            </svg>
          </div>
        </div>
        {/* iOS-masked preview — final on-device look */}
        <div
          className="group relative flex h-[260px] items-center justify-center md:h-[320px]"
          style={{ background: "var(--ds-gray-200)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-app.svg"
            alt="Distanz Running App Icon — iOS-masked preview"
            style={{
              height: 180,
              width: 180,
              borderRadius: "22.37%",
              // 1px theme-aware ring + soft drop shadow. The ring keeps the
              // icon's edge readable in dark mode when its gradient top
              // matches the panel colour.
              boxShadow:
                "0 0 0 1px hsl(var(--color-borderDefault)), 0 8px 24px rgba(0, 0, 0, 0.28)",
            }}
          />
        </div>

        {/* Inverted keyline preview */}
        <div
          className="group relative flex h-[260px] items-center justify-center md:h-[320px]"
          style={{ background: "var(--ds-gray-200)" }}
        >
          <div style={{ position: "relative", width: 200, height: 200 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-app-alt.svg"
              alt="Distanz Running App Icon — inverted master with guidelines"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
            <svg
              viewBox="0 0 1024 1024"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              <rect
                x="1"
                y="1"
                width="1022"
                height="1022"
                fill="none"
                stroke="#EB377D"
                strokeWidth="3"
                strokeDasharray="14 10"
                opacity="0.7"
              />
              <rect
                x="1"
                y="1"
                width="1022"
                height="1022"
                rx="229"
                ry="229"
                fill="none"
                stroke="#EB377D"
                strokeWidth="4"
              />
              <circle
                cx="512"
                cy="512"
                r="410"
                fill="none"
                stroke="#EB377D"
                strokeWidth="2"
                strokeDasharray="10 8"
                opacity="0.7"
              />
              <line
                x1="0"
                y1="512"
                x2="1024"
                y2="512"
                stroke="#EB377D"
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.6"
              />
              <line
                x1="512"
                y1="0"
                x2="512"
                y2="1024"
                stroke="#EB377D"
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.6"
              />
              <circle cx="512" cy="512" r="8" fill="#EB377D" />
            </svg>
          </div>
        </div>
        {/* Inverted iOS-masked preview */}
        <div
          className="group relative flex h-[260px] items-center justify-center md:h-[320px]"
          style={{ background: "var(--ds-gray-200)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-app-alt.svg"
            alt="Distanz Running App Icon — inverted iOS-masked preview"
            style={{
              height: 180,
              width: 180,
              borderRadius: "22.37%",
              boxShadow:
                "0 0 0 1px hsl(var(--color-borderDefault)), 0 8px 24px rgba(0, 0, 0, 0.28)",
            }}
          />
        </div>
      </div>

      {/* General Information */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="general-information" title="General Information" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            By using the Distanz Running trademarks you agree to the guidelines as well
            as our{" "}
            <a className="text-inherit" href="/legal/terms">
              Terms of Service
            </a>{" "}
            and all our rules and policies. Distanz Running reserves the right to cancel,
            modify, or change the permission in these guidelines at any time at its sole
            discretion. For further information about use of the Distanz Running name and
            trademarks, please contact{" "}
            <a className="text-inherit" href="mailto:brand@distanzrunning.com">
              brand@distanzrunning.com
            </a>
            .
          </p>
        </div>
      </Section>

      {/* Usage */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="usage" title="Usage" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            You may use the Distanz Running marks to truthfully describe the products,
            services, and experiences that we offer. You may also use Distanz Running
            marks to truthfully state that you are a runner or partner using a Distanz
            Running product. For example, &ldquo;Our training plan is powered by Distanz
            Running.&rdquo;
            <br />
            <br />
            All other uses of Distanz Running marks, including in connection with our
            vendors, events, or applications that utilize our content, require prior
            written permission from us. A copyright license for content does not provide
            a license to use a trademark related to the project. For inquiries, please
            contact brand@distanzrunning.com.
            <br />
            <br />
            Any advertisements, documentation, websites, or other references that include
            permitted uses of the Distanz Running marks must also include the following
            attribution statement which can be displayed at the end of the material, in
            the footer of the document, or some other clear and conspicuous location that
            can be quickly identified: Distanz Running, the Distanz Running design, and
            related marks, designs and logos are trademarks or registered trademarks of
            Stride Platforms Ltd or its affiliates.
          </p>
        </div>
      </Section>

      {/* Misuse */}
      <Section>
        <div className="flex flex-col">
          <SectionHeading id="misuse" title="Misuse" />
          <p className="text-copy-16 mt-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            Here are some examples of ways that you should not use the Distanz Running
            marks:
          </p>
          <ul className="mt-4 space-y-4" style={{ color: "hsl(var(--color-textSubtle))" }}>
            {[
              "Do not use Distanz Running marks in the name of your business, product, service, application, domain name, publication, or other offering.",
              "Do not use marks, logos, company names, slogans, domain names, or designs that are confusingly similar to any Distanz Running marks.",
              "Do not use the Distanz Running marks in any manner likely to create confusion as to the sponsorship or relationship, affiliation, or endorsement of your company, product or service by Distanz Running.",
              "Do not use the Distanz Running marks in a false or misleading manner.",
              "Do not display the Distanz Running marks more prominently than your trademarks, product, service, or company name.",
              "Do not use Distanz Running marks for commercial purposes. e.g. do not include Distanz Running marks on merchandise or marketing collateral for your commercial products or services.",
              "Do not modify the Distanz Running marks.",
              "Do not use the Distanz Running marks on or in connection with any defamatory, scandalous, pornographic, obscene or other objectionable materials.",
            ].map((item, i) => (
              <li key={i} className="flex gap-2 leading-[24px] text-copy-16">
                <span>-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </div>
  );
}
