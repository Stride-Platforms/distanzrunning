// src/lib/countryFlags.ts
//
// Country-name → ISO 3166-1 alpha-2 mapping plus a helper that
// returns the matching SVG flag component from `country-flag-icons`.
// Used by the Country filter on /races and any other surface that
// needs to display a flag next to a country name. Centralised here
// so the mapping is maintained in one place — the legacy version
// kept this inline in RaceGuidesClient.tsx.

import * as flags from "country-flag-icons/react/3x2";
import type { ComponentType, SVGProps } from "react";

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** The full country-name → code table is GENERATED from
 *  Intl.DisplayNames over every code the icon set ships, so any
 *  country Sanity stores under its standard English name (Nigeria,
 *  Tanzania, Ecuador, …) resolves without maintenance. */
const INTL_NAME_TO_CODE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    const codes = Object.keys(flags).filter((c) => /^[A-Z]{2}$/.test(c));
    const named = codes
      .map((code) => [code, dn.of(code)] as const)
      .filter(([code, name]) => name && name !== code) as [string, string][];

    for (const [code, name] of named) map[name] = code;

    // ICU disambiguates a handful of regions with a trailing
    // parenthetical, and WHICH runtime you're in decides whether it's
    // there: Chrome renders FK as "Falkland Islands (Islas Malvinas)"
    // where Node renders plain "Falkland Islands". This table is built
    // in the browser (the /races filter is a client component), so a
    // Node-only check can't see the difference — that's how the
    // Falklands lost its flag. Register the stripped form too, second
    // so a real country's exact name always wins the key.
    for (const [code, name] of named) {
      const plain = name
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (plain && plain !== name && !(plain in map)) map[plain] = code;
    }
  } catch {
    // No Intl.DisplayNames → the alias table below still covers the
    // common names.
  }
  return map;
})();

/** Hand-kept ALIASES only — names Sanity/editors use that differ
 *  from Intl's English name (USA, UK, "Czech Republic" vs Czechia),
 *  plus sub-national entries ("GB-SCT") normalised to their parent
 *  in getCountryFlag — we don't carry sub-national flag assets. */
const COUNTRY_TO_CODE: Record<string, string> = {
  USA: "US",
  UK: "GB",
  UAE: "AE",
  // Intl says "Hong Kong SAR China" / "Macao SAR China" / "Türkiye";
  // race data stores the plain editorial names.
  "Hong Kong": "HK",
  Macau: "MO",
  Turkey: "TR",
  "Czech Republic": "CZ",
  Macedonia: "MK",
  "Ivory Coast": "CI",
  "Cape Verde": "CV",
  Swaziland: "SZ",
  Burma: "MM",
  "East Timor": "TL",
  Palestine: "PS",
  "DR Congo": "CD",
  "Republic of the Congo": "CG",
  Scotland: "GB-SCT",
  Wales: "GB-WLS",
  "Northern Ireland": "GB-NIR",
  England: "GB-ENG",
};

/**
 * Returns the SVG flag component for a given country name, or
 * null when the country has no mapping (e.g. a new country we
 * haven't added yet). Sub-national codes fall back to the parent
 * country's flag.
 *
 * Accepts either a country name (looked up against the mapping
 * above) or a bare 2-letter ISO 3166-1 alpha-2 code — the consent
 * dashboard stores ISO codes directly, while race data carries
 * full names from Sanity.
 */
export function getCountryFlag(input: string): FlagComponent | null {
  if (!input) return null;
  const looksLikeIso = /^[A-Za-z]{2}$/.test(input);
  const code = looksLikeIso
    ? input.toUpperCase()
    : (COUNTRY_TO_CODE[input] ?? INTL_NAME_TO_CODE[input]);
  if (!code) return null;
  const flagCode = code.includes("-") ? code.split("-")[0] : code;
  const Flag = (flags as Record<string, FlagComponent>)[flagCode];
  return Flag ?? null;
}
