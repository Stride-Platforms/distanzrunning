// src/lib/raceDiscovery.ts
//
// "Add a new race" pipeline for /admin/races/new (Plan 017, slice
// 3). Given a race name (or a direct Wikipedia URL) and optional
// city/country hints, finds the Wikipedia article, extracts the
// identity + course-record facts a fresh raceGuide document needs,
// and geocodes + climate-looks-up the venue — all read-only, no
// Sanity writes. The admin page reviews/edits the result in a form
// before createRaceDraft() (in the admin actions.ts) writes it as
// an unpublished DRAFT.
//
// Scope: this tool establishes IDENTITY via Wikipedia (title,
// location, distance, category, tags, course records, field size,
// official site) and then fills the scheduling/commercial facts
// from aggregator sources (src/lib/raceAggregators.ts — the World
// Athletics label calendar, finishers.com, ahotu.com: next event
// date, label tier, price, surface, profile, elevation gain,
// Strava route) plus deterministic geo/climate. It does NOT read
// the race's own official website (start time verification, expo)
// — that's the existing /admin/races/enrichment Scan button's job,
// which runs on drafts too once this tool prefills
// officialWebsite. Two focused tools, no duplicated site-reading
// logic.
//
// Records/field-size reuse raceEnrichment's extractFromWikitext
// verbatim (same trusted prompt, same page_is_this_race gate now
// doing double duty as this tool's identity check) rather than
// re-deriving a second course-record prompt.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "next-sanity";

import { fetchClimateNormals, fetchElevation } from "@/lib/climate";
import { geocodeAddress } from "@/lib/geocode";
import { IOC_COUNTRY_CODES } from "@/lib/iocCountries";
import { parseModelJson } from "@/lib/modelJson";
import {
  gatherAggregatorData,
  KNOWN_RACE_TAGS,
} from "@/lib/raceAggregators";
import {
  extractFromWikitext,
  normalizeRecordTime,
  RECORD_GROUPS,
  type EnrichableRace,
  type ExtractionPage,
  type RecordGroupKey,
} from "@/lib/raceEnrichment";
import { encodeRoutePolyline, fetchStravaRoute } from "@/lib/stravaRoute";
import {
  budgetWikitext,
  fetchPageCategories,
  fetchPageImages,
  fetchWikitext,
  languagesFor,
  parseWikipediaUrl,
  searchWikiLanguage,
  wikiPageUrl,
  type WikiPageCandidate,
  type WikiPageImage,
} from "@/lib/wikipedia";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const MAX_PAGE_ATTEMPTS = 2;
const MIN_CANDIDATE_SCORE = 5;

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface CourseRecordFields {
  time?: string;
  athlete?: string;
  country?: string;
}

export interface RaceDiscoveryResult {
  status: "found" | "not_found" | "already_exists";
  message?: string;

  /** Set only on status "already_exists" — link the editor to the
   *  existing doc instead of creating a duplicate. */
  existingRace?: { id: string; title: string; slug?: string };

  // Identity
  title?: string;
  wikipediaUrl?: string;
  city?: string;
  stateRegion?: string;
  country?: string;
  distance?: number;
  officialWebsite?: string;
  tags?: string[];
  /** 1–12, best-effort from the article's stated month — a
   *  scheduling HINT for the editor's own eventDate pick, not
   *  written as a fact. */
  eventMonth?: number;

  // Category match
  raceCategoryId?: string;
  raceCategoryTitle?: string;

  // Course records (same 4 groups as the schema)
  mensCourseRecord?: CourseRecordFields;
  womensCourseRecord?: CourseRecordFields;
  mensWheelchairCourseRecord?: CourseRecordFields;
  womensWheelchairCourseRecord?: CourseRecordFields;
  fieldSize?: number;

  // Geo + climate (Open-Meteo, keyless — always attempted when a
  // location resolves; Mapbox-derived fields need
  // MAPBOX_GEOCODING_TOKEN so may be absent)
  location?: { lat: number; lng: number };
  altitude?: number;
  averageTemperature?: number;
  humidity?: number;

  // Aggregator facts (World Athletics label calendar, finishers.com,
  // ahotu.com — see src/lib/raceAggregators.ts)
  eventDate?: string; // YYYY-MM-DD, next edition
  eventDateStatus?: "confirmed" | "estimated";
  startTime?: string;
  price?: number;
  currency?: string;
  surface?: "Road" | "Trail" | "Track" | "Mountain" | "Mixed";
  surfaceBreakdown?: "100% Paved" | "Unpaved" | "Mixed";
  profile?: "flat" | "rolling" | "hilly" | "mountainous";
  elevationGain?: number;
  /** Always geometry-derived (no source states it) — set alongside
   *  routePreview. */
  elevationLoss?: number;
  /** Kept for createRaceDraft: when the editor accepts the route
   *  preview, the server re-reads this URL's embed geometry and
   *  uploads it as the draft's gpxFile (GeoJSON). */
  stravaRouteUrl?: string;
  /** Course geometry summary from the Strava route embed (no auth
   *  needed) — enough for a Static Images map preview + stats in
   *  the review form without shipping thousands of points. */
  routePreview?: {
    /** Google-encoded polyline, downsampled for the Mapbox Static
     *  Images path overlay. */
    encodedPolyline: string;
    distanceKm: number;
    elevationGain: number;
    elevationLoss: number;
    pointCount: number;
    /** Route length is >15% off the race distance (likely a sibling
     *  event's course) — the attach checkbox defaults off. */
    distanceMismatch: boolean;
    /** [lng, lat] of the course's first point — altitude samples
     *  here (the start line) in preference to the city centre. */
    start: [number, number];
  };
  /** Photo candidates from the Wikipedia article (lead image
   *  first) — the editor picks one as a TEMPORARY mainImage
   *  placeholder (licence shown for their call; replace before
   *  publish). */
  imageOptions?: WikiPageImage[];

  reasoning?: string;
  /** Human-readable provenance lines ("Entry price 89 EUR from
   *  finishers.com"). */
  sourceNotes: string[];
  warnings: string[];
  candidatesConsidered: WikiPageCandidate[];
}

// ---------------------------------------------------------------------------
// Identity + facts extraction (city/country/distance/site/tags/month)
// ---------------------------------------------------------------------------

interface FactsExtraction {
  city: string | null;
  state_region: string | null;
  country: string | null;
  distance_km: number | null;
  official_website: string | null;
  event_month: number | null;
  tags: string[];
  reasoning: string;
}

async function extractFacts(
  queryTitle: string,
  canonicalTitle: string,
  wikitext: string,
): Promise<FactsExtraction> {
  const prompt = `You are extracting basic facts about a running race from its Wikipedia article, to prefill a NEW database entry. Read only what the article states.

Race searched for: "${queryTitle}"
Wikipedia article: "${canonicalTitle}"

Extract:
- "city": the city the race is held in (just the city name, e.g. "Rotterdam").
- "state_region": a state/province/region name ONLY if the article distinguishes it from the city (else null — most races don't need this).
- "country": the country name in plain English (e.g. "Netherlands", "United States").
- "distance_km": the race's exact distance in kilometers as a number (e.g. 42.195 for a marathon, 21.0975 for a half marathon). Use the precise figure if stated; if the article only names the race TYPE (marathon/half marathon/10K) without an exact figure, use the standard distance for that type.
- "official_website": the race's own official site URL, if the infobox states one (not a Wikipedia link, not a sponsor/ticket site).
- "event_month": the month the race is typically held, as a number 1–12 (e.g. article says "held annually in April" → 4). Null if not stated or the race has no fixed month.
- "tags": zero or more labels that apply, chosen ONLY from this list — do not invent new ones: ${JSON.stringify(KNOWN_RACE_TAGS)}. Base this on what the article states (e.g. "World Athletics Gold Label road race", "AIMS member"). Leave empty if none are clearly stated.

Output STRICT JSON only — no markdown fences, no prose:

{
  "city": "…" or null,
  "state_region": "…" or null,
  "country": "…" or null,
  "distance_km": 42.195 or null,
  "official_website": "https://…" or null,
  "event_month": 4 or null,
  "tags": ["…"],
  "reasoning": "one short sentence"
}

WIKITEXT:
${wikitext}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response block type");
  return parseModelJson<FactsExtraction>(block.text);
}

// ---------------------------------------------------------------------------
// Race-category matching
// ---------------------------------------------------------------------------

const KM_PER_MILE = 1.609344;

/** Parse the leading number out of a category title ("20 km" → 20,
 *  "Half Marathon" → 21.0975, "Marathon" → 42.195, "5 km" → 5,
 *  "7 Miles" → 11.265).
 *
 *  Mile-denominated categories are matched in their own right rather
 *  than converted by an editor: the classic US road distances have no
 *  round metric equivalent, and Falmouth's 7 miles (11.265 km) sits
 *  1.265 km from "10 km" — INSIDE the 2 km tolerance below, so without
 *  this it would silently auto-categorise as a 10K. */
function categoryDistanceKm(title: string): number | null {
  const lower = title.toLowerCase();
  if (lower.includes("half marathon")) return 21.0975;
  if (lower.trim() === "marathon" || lower.includes("full marathon"))
    return 42.195;
  const km = lower.match(/(\d+(?:\.\d+)?)\s*km/);
  if (km) return Number(km[1]);
  const mi = lower.match(/(\d+(?:\.\d+)?)\s*mi(?:le)?s?\b/);
  return mi ? Number(mi[1]) * KM_PER_MILE : null;
}

async function matchRaceCategory(
  distanceKm: number | undefined,
): Promise<{ id: string; title: string } | undefined> {
  if (!distanceKm) return undefined;
  const categories: { _id: string; title: string }[] = await sanityClient.fetch(
    `*[_type == "raceCategory"]{ _id, title }`,
  );
  // Ultras have no fixed distance — anything beyond the marathon
  // (plus the same 2 km tolerance the diff matcher uses) belongs to
  // the "Ultra Marathon" category, from a 50K to UTMB's 171 km.
  if (distanceKm > 44.2) {
    const ultra = categories.find((c) => /ultra/i.test(c.title));
    if (ultra) return { id: ultra._id, title: ultra.title };
  }
  let best: { id: string; title: string; diff: number } | undefined;
  for (const c of categories) {
    const km = categoryDistanceKm(c.title);
    if (km === null) continue;
    const diff = Math.abs(km - distanceKm);
    if (!best || diff < best.diff) best = { id: c._id, title: c.title, diff };
  }
  // Tolerance: within 2 km of a known category (a marathon stated
  // as "42.2 km" shouldn't miss "Marathon" at 42.195).
  return best && best.diff <= 2 ? { id: best.id, title: best.title } : undefined;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface DiscoverRaceInput {
  /** Race name to search for, OR a direct wikipedia.org article URL
   *  (pastable when the editor already knows the exact page — skips
   *  search entirely). */
  query: string;
  city?: string;
  country?: string;
}

/** WA-tier tag hygiene:
 *  - the WA label calendar's CURRENT tier (when matched) supersedes
 *    every other WA tag — a stale Wikipedia infobox saying "Elite"
 *    must not coexist with the calendar's "Gold";
 *  - otherwise, a specific tier supersedes the base "World
 *    Athletics Label" tag — never carry both. */
function finalizeTags(tags: Set<string>, waTier?: string): string[] {
  if (waTier) {
    for (const t of [...tags]) {
      if (/^World Athletics( Platinum| Gold| Elite)? Label$/.test(t)) {
        tags.delete(t);
      }
    }
    tags.add(waTier);
  } else if (
    [...tags].some((t) =>
      /^World Athletics (Platinum|Gold|Elite) Label$/.test(t),
    )
  ) {
    tags.delete("World Athletics Label");
  }
  return [...tags];
}

/** Geocode the race's city/country, then fill altitude + climate
 *  normals (±7-day window when an exact event date is known, else
 *  the typical month). Mutates `result` + `warnings` — shared by
 *  the Wikipedia path and the aggregator-only fallback. */
async function applyGeoClimate(
  result: RaceDiscoveryResult,
  warnings: string[],
): Promise<void> {
  if (!result.city && !result.country) return;
  const place = [result.city, result.country].filter(Boolean).join(", ");
  const geo = await geocodeAddress(place);
  if (!geo) {
    warnings.push(`Could not geocode "${place}" — location left unset.`);
    return;
  }
  result.location = { lat: geo.lat, lng: geo.lng };
  const eventDay = result.eventDate
    ? {
        month: Number(result.eventDate.slice(5, 7)),
        day: Number(result.eventDate.slice(8, 10)),
      }
    : result.eventMonth
      ? { month: result.eventMonth, day: undefined }
      : null;
  const [elevation, climate] = await Promise.all([
    fetchElevation(geo.lat, geo.lng),
    eventDay
      ? fetchClimateNormals(geo.lat, geo.lng, eventDay.month, eventDay.day)
      : Promise.resolve(null),
  ]);
  if (elevation !== null) result.altitude = elevation;
  if (climate) {
    result.averageTemperature = climate.averageTemperature;
    result.humidity = climate.humidity;
  } else if (!eventDay) {
    warnings.push(
      "No event date or month found — skipped average temperature/humidity lookup.",
    );
  }
}

/** When ahotu surfaced a Strava route, read its public embed
 *  geometry so the review form can show the course on a map and
 *  offer to attach it as the draft's gpxFile (GeoJSON). Mutates
 *  `result` — shared by the Wikipedia path and the aggregator-only
 *  fallback. Best-effort: a failed fetch leaves the plain Strava
 *  link (the editor can still export the GPX by hand). */
async function attachRoutePreview(
  result: RaceDiscoveryResult,
  sourceNotes: string[],
  warnings: string[],
): Promise<void> {
  if (!result.stravaRouteUrl) return;
  const route = await fetchStravaRoute(result.stravaRouteUrl);
  if (!route) {
    warnings.push(
      "Couldn't read the Strava route's embed geometry — export the GPX from Strava and upload it in Studio.",
    );
    return;
  }
  const distanceKm = Math.round(route.distanceKm * 10) / 10;
  const distanceMismatch = Boolean(
    result.distance &&
      Math.abs(route.distanceKm - result.distance) / result.distance > 0.15,
  );
  result.routePreview = {
    encodedPolyline: encodeRoutePolyline(route.coordinates),
    distanceKm,
    elevationGain: route.elevationGain,
    elevationLoss: route.elevationLoss,
    pointCount: route.coordinates.length,
    distanceMismatch,
    start: [route.coordinates[0][0], route.coordinates[0][1]],
  };
  sourceNotes.push(
    `Course route: ${route.coordinates.length} points from the Strava route embed — ${distanceKm} km, ~${route.elevationGain} m gain / ~${route.elevationLoss} m loss.`,
  );
  if (distanceMismatch) {
    // A wrong-distance route (ahotu sometimes links a sibling event's
    // course — Grandma's Marathon page carries the HALF's route) must
    // not feed elevation fields either.
    warnings.push(
      `The Strava route measures ${distanceKm} km but the race distance is ${result.distance} km — check it's the right course before attaching.`,
    );
    return;
  }
  // No source ever states elevation loss — the geometry is the only
  // provider (still editor-reviewed).
  result.elevationLoss = route.elevationLoss;
  if (result.elevationGain === undefined) {
    result.elevationGain = route.elevationGain;
    sourceNotes.push(
      `Elevation gain ~${route.elevationGain} m computed from the route geometry (no aggregator stated it).`,
    );
  }
}

/** Aggregators only state a breakdown when a page describes the
 *  actual terrain; otherwise the surface class implies one (a Road
 *  race is a paved race). Editor-reviewed like everything else. */
function defaultSurfaceBreakdown(
  result: RaceDiscoveryResult,
  sourceNotes: string[],
): void {
  if (result.surfaceBreakdown || !result.surface) return;
  const map: Record<string, "100% Paved" | "Unpaved" | "Mixed"> = {
    Road: "100% Paved",
    Track: "100% Paved",
    Trail: "Unpaved",
    Mountain: "Unpaved",
    Mixed: "Mixed",
  };
  const breakdown = map[result.surface];
  if (!breakdown) return;
  result.surfaceBreakdown = breakdown;
  sourceNotes.push(
    `Surface breakdown "${breakdown}" defaulted from the ${result.surface} surface class (no source stated the composition).`,
  );
}

/** The geocoded point is the CITY CENTRE — fine for flat coastal
 *  races, off by a valley for mountain ones. When a trusted route
 *  exists, re-sample Open-Meteo at its first point (the start
 *  line) and prefer that. Same elevation source as before, so
 *  values stay comparable across races. */
async function refineAltitudeFromRouteStart(
  result: RaceDiscoveryResult,
  sourceNotes: string[],
): Promise<void> {
  const preview = result.routePreview;
  if (!preview || preview.distanceMismatch) return;
  const [lng, lat] = preview.start;
  const elevation = await fetchElevation(lat, lng);
  if (elevation === null) return;
  if (result.altitude === undefined || elevation !== result.altitude) {
    sourceNotes.push(
      `Altitude ${elevation} m sampled at the route's start line` +
        (result.altitude !== undefined
          ? ` (city-centre point said ${result.altitude} m).`
          : "."),
    );
  }
  result.altitude = elevation;
}

/** Fallback when no Wikipedia article exists (the long tail —
 *  finishers.com lists manchester-half-marathon; Wikipedia
 *  doesn't). The aggregator matchers verify the race name
 *  themselves, so a match still establishes identity; course
 *  records and field size just stay empty. */
async function aggregatorOnlyDiscovery(
  queryTitle: string,
  input: DiscoverRaceInput,
  sourceNotes: string[],
  warnings: string[],
  candidatesConsidered: WikiPageCandidate[],
): Promise<RaceDiscoveryResult> {
  const agg = await gatherAggregatorData({
    title: queryTitle,
    city: input.city,
    country: input.country,
  });
  if (agg.matchedSources.length === 0) {
    return {
      status: "not_found",
      message:
        "No Wikipedia article or aggregator page (finishers.com, ahotu.com, World Athletics) matched this search.",
      sourceNotes,
      warnings,
      candidatesConsidered,
    };
  }

  warnings.push(
    `No Wikipedia article found — prefilled from ${agg.matchedSources.join(" + ")} only; course records and field size are not available from these sources.`,
  );
  sourceNotes.push(...agg.notes);
  warnings.push(...agg.warnings);

  const result: RaceDiscoveryResult = {
    status: "found",
    title: queryTitle,
    city: agg.city ?? input.city,
    country: agg.country ?? input.country,
    distance: agg.distanceKm,
    tags: finalizeTags(new Set(agg.labels), agg.waTier),
    eventDate: agg.eventDate,
    eventDateStatus: agg.eventDateStatus,
    startTime: agg.startTime,
    price: agg.price,
    currency: agg.currency,
    surface: agg.surface,
    surfaceBreakdown: agg.surfaceBreakdown,
    profile: agg.profile,
    elevationGain: agg.elevationGain,
    stravaRouteUrl: agg.stravaRouteUrl,
    sourceNotes,
    warnings,
    candidatesConsidered,
  };

  const category = await matchRaceCategory(result.distance);
  if (category) {
    result.raceCategoryId = category.id;
    result.raceCategoryTitle = category.title;
  }

  defaultSurfaceBreakdown(result, sourceNotes);
  await Promise.all([
    applyGeoClimate(result, warnings),
    attachRoutePreview(result, sourceNotes, warnings),
  ]);
  await refineAltitudeFromRouteStart(result, sourceNotes);
  return result;
}

export async function discoverRace(
  input: DiscoverRaceInput,
): Promise<RaceDiscoveryResult> {
  const warnings: string[] = [];
  const sourceNotes: string[] = [];
  const queryTitle = input.query.trim();

  // ── Duplicate check first — never spend API calls on a race that
  // already exists. ────────────────────────────────────────────
  const existing: { _id: string; title: string; slug?: string } | null =
    await sanityClient.fetch(
      `*[_type == "raceGuide" && lower(title) == lower($title)][0]{ _id, title, "slug": slug.current }`,
      { title: queryTitle },
    );
  if (existing) {
    return {
      status: "already_exists",
      message: `"${existing.title}" already exists.`,
      existingRace: {
        id: existing._id,
        title: existing.title,
        slug: existing.slug,
      },
      sourceNotes,
      warnings,
      candidatesConsidered: [],
    };
  }

  // ── Discovery: a pasted Wikipedia URL skips search entirely. ──
  const pinned = parseWikipediaUrl(queryTitle);
  let candidates: { lang: string; title: string }[];
  let candidatesConsidered: WikiPageCandidate[] = [];
  if (pinned) {
    candidates = [pinned];
  } else {
    const langs = languagesFor(input.country);
    const perLang = await Promise.all(
      langs.map((lang) => searchWikiLanguage(lang, queryTitle, input.city)),
    );
    const scored = perLang
      .flat()
      .filter((c) => c.score >= MIN_CANDIDATE_SCORE)
      .sort((a, b) => b.score - a.score);
    candidatesConsidered = scored.slice(0, 10);
    candidates = scored.slice(0, MAX_PAGE_ATTEMPTS);
  }

  if (candidates.length === 0) {
    // No Wikipedia article — the aggregators may still know it.
    return aggregatorOnlyDiscovery(
      queryTitle,
      input,
      sourceNotes,
      warnings,
      candidatesConsidered,
    );
  }

  // ── Fetch + identity-gate + extract, trying each candidate ────
  const minimalRace: EnrichableRace = {
    _id: "new",
    title: queryTitle,
    city: input.city,
    country: input.country,
    current: {},
  };

  for (const candidate of candidates) {
    let wikitext: string;
    let canonicalTitle: string;
    try {
      ({ wikitext, canonicalTitle } = await fetchWikitext(
        candidate.lang,
        candidate.title,
      ));
    } catch {
      continue;
    }
    const url = wikiPageUrl(candidate.lang, canonicalTitle);
    const { text } = budgetWikitext(wikitext);
    const page: ExtractionPage = {
      id: "main",
      label: "MAIN ARTICLE",
      title: canonicalTitle,
      url,
      text,
    };

    let recordExtraction;
    try {
      recordExtraction = await extractFromWikitext(minimalRace, [page]);
    } catch (err) {
      warnings.push(`Extraction failed: ${(err as Error).message}`);
      continue;
    }
    if (!recordExtraction.page_is_this_race) continue;

    // Identity confirmed — pull the rest in parallel: basic facts
    // + Wikipedia's own category labels (the reliable "World
    // Marathon Majors" signal, more trustworthy than free-text).
    const [facts, categories, pageImages] = await Promise.all([
      extractFacts(queryTitle, canonicalTitle, text).catch((err) => {
        warnings.push(`Facts extraction failed: ${(err as Error).message}`);
        return null;
      }),
      fetchPageCategories(candidate.lang, canonicalTitle),
      fetchPageImages(candidate.lang, canonicalTitle),
    ]);

    const tags = new Set(facts?.tags ?? []);
    if (categories.some((c) => c === "World Marathon Majors")) {
      tags.add("Abbott World Marathon Major");
    }

    const result: RaceDiscoveryResult = {
      status: "found",
      title: canonicalTitle,
      wikipediaUrl: url,
      city: facts?.city ?? input.city,
      stateRegion: facts?.state_region ?? undefined,
      country: facts?.country ?? input.country,
      distance: facts?.distance_km ?? undefined,
      officialWebsite: facts?.official_website ?? undefined,
      tags: [...tags],
      eventMonth: facts?.event_month ?? undefined,
      fieldSize: recordExtraction.field_size?.value ?? undefined,
      reasoning: [recordExtraction.reasoning, facts?.reasoning]
        .filter(Boolean)
        .join(" "),
      sourceNotes,
      warnings,
      candidatesConsidered,
    };
    if (pageImages.length > 0) {
      result.imageOptions = pageImages;
      sourceNotes.push(
        `${pageImages.length} photo${pageImages.length === 1 ? "" : "s"} on the Wikipedia article — offered as temporary main-image candidates.`,
      );
    }

    // ── Aggregators (WA label calendar, finishers, ahotu) ─────
    // Kicked off NOW — identity + city/country are settled — and
    // awaited before climate so an exact event date can tighten
    // the climate window from whole-month to ±7 days.
    const aggregatorsPromise = gatherAggregatorData({
      title: result.title!,
      city: result.city,
      country: result.country,
    });

    // Course records — same validation raceEnrichment applies
    // (normalize time, verify IOC code) so a bad extraction can't
    // slip a malformed value into the create form.
    const groupKeyMap: Record<RecordGroupKey, keyof typeof recordExtraction.records> = {
      mens: "mens",
      womens: "womens",
      mensWheelchair: "mens_wheelchair",
      womensWheelchair: "womens_wheelchair",
    };
    const resultKeyMap: Record<RecordGroupKey, keyof RaceDiscoveryResult> = {
      mens: "mensCourseRecord",
      womens: "womensCourseRecord",
      mensWheelchair: "mensWheelchairCourseRecord",
      womensWheelchair: "womensWheelchairCourseRecord",
    };
    for (const group of RECORD_GROUPS) {
      const rec = recordExtraction.records[groupKeyMap[group.key]];
      if (!rec || rec.confidence === "low") continue;
      const fields: CourseRecordFields = {};
      if (rec.time) {
        const normalized = normalizeRecordTime(rec.time);
        if (normalized) fields.time = normalized;
      }
      if (rec.athlete) fields.athlete = rec.athlete;
      if (rec.country && IOC_COUNTRY_CODES.has(rec.country.toUpperCase())) {
        fields.country = rec.country.toUpperCase();
      }
      if (Object.keys(fields).length > 0) {
        (result[resultKeyMap[group.key]] as CourseRecordFields) = fields;
      }
    }

    // ── Category match ───────────────────────────────────────
    const category = await matchRaceCategory(result.distance);
    if (category) {
      result.raceCategoryId = category.id;
      result.raceCategoryTitle = category.title;
    } else if (result.distance) {
      warnings.push(
        `No race category within 2 km of ${result.distance} km — pick one manually.`,
      );
    }

    // ── Merge aggregator findings ─────────────────────────────
    const agg = await aggregatorsPromise;
    if (agg.eventDate) {
      result.eventDate = agg.eventDate;
      result.eventDateStatus = agg.eventDateStatus;
    }
    if (agg.startTime) result.startTime = agg.startTime;
    if (agg.price && agg.currency) {
      result.price = agg.price;
      result.currency = agg.currency;
    }
    if (agg.surface) result.surface = agg.surface;
    if (agg.surfaceBreakdown) result.surfaceBreakdown = agg.surfaceBreakdown;
    if (agg.profile) result.profile = agg.profile;
    if (agg.elevationGain !== undefined) {
      result.elevationGain = agg.elevationGain;
    }
    if (agg.stravaRouteUrl) result.stravaRouteUrl = agg.stravaRouteUrl;
    for (const label of agg.labels) tags.add(label);
    result.tags = finalizeTags(tags, agg.waTier);
    sourceNotes.push(...agg.notes);
    warnings.push(...agg.warnings);

    defaultSurfaceBreakdown(result, sourceNotes);

    // ── Geocode + climate + route geometry (best-effort) ──────
    await Promise.all([
      applyGeoClimate(result, warnings),
      attachRoutePreview(result, sourceNotes, warnings),
    ]);
    await refineAltitudeFromRouteStart(result, sourceNotes);

    if (!result.officialWebsite) {
      warnings.push(
        "No official website found — add one to unlock the Enrichment scan for expo details.",
      );
    }

    return result;
  }

  // Wikipedia candidates existed but none passed the identity gate
  // — same fallback as having none at all.
  return aggregatorOnlyDiscovery(
    queryTitle,
    input,
    sourceNotes,
    warnings,
    candidatesConsidered,
  );
}
