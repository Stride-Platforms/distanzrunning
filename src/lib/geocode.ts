// src/lib/geocode.ts
//
// Server-side address forward-geocoding via Mapbox's Geocoding
// API. Used by the race detail page to turn an editor-typed
// expo address into a lng/lat the map can mark.
//
// Prefers MAPBOX_GEOCODING_TOKEN (a server-only secret token
// without URL restrictions) so the request isn't rejected as
// `Forbidden` by the public map token's allowlist. Falls back to
// NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN if the secret isn't set, which
// is fine in environments where the public token has no URL
// restrictions. The fetch caches with a 24-hour revalidate
// window: addresses change rarely, and the page's own ISR
// (revalidate = 60) means content edits surface within a minute
// regardless.

export interface GeocodeResult {
  lng: number;
  lat: number;
}

/** [minLng, minLat, maxLng, maxLat] — Mapbox feature bbox. */
export type CountryBounds = [number, number, number, number];

const MAPBOX_GEOCODE_REVALIDATE_SECONDS = 60 * 60 * 24;

export async function geocodeAddress(
  address: string | null | undefined,
): Promise<GeocodeResult | null> {
  if (!address) return null;
  const token =
    process.env.MAPBOX_GEOCODING_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) return null;
  const trimmed = address.trim();
  if (!trimmed) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json` +
      `?access_token=${token}&limit=1`;
    const res = await fetch(url, {
      next: { revalidate: MAPBOX_GEOCODE_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ center?: [number, number] }>;
    };
    const center = data.features?.[0]?.center;
    if (!center || center.length < 2) return null;
    const [lng, lat] = center;
    if (typeof lng !== "number" || typeof lat !== "number") return null;
    return { lng, lat };
  } catch {
    return null;
  }
}

export interface VenueLookup {
  /** Canonical POI name ("RAI Amsterdam Convention Centre"). */
  name: string;
  /** Full street address ("Europaplein 24, 1078 GZ Amsterdam,
   *  Netherlands"). */
  fullAddress: string;
  lng: number;
  lat: number;
}

/** Resolve a venue NAME to POI candidates (canonical name + street
 *  address + coords) via Mapbox's Search Box API — the classic v5
 *  geocoder has no POI coverage for venues ("RAI Amsterdam" there
 *  returns a locality with no street address; Search Box returns
 *  the convention centre with its full address). Used by the
 *  enrichment pipeline so an expo venue never travels without an
 *  address.
 *
 *  proximity is REQUIRED by design: an unbiased global POI search
 *  is dangerously wrong (querying "Tokyo Big Sight" returned
 *  restaurants in Indiana; "McCormick Place" a nearby hotel), while
 *  the same queries proximity-biased rank the true venue first.
 *  Callers verify the returned candidates (name similarity,
 *  distance) — only features carrying a full_address are
 *  returned. */
export async function geocodeVenue(
  query: string | null | undefined,
  proximity: GeocodeResult,
): Promise<VenueLookup[]> {
  if (!query) return [];
  const token =
    process.env.MAPBOX_GEOCODING_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) return [];
  const trimmed = query.trim();
  if (!trimmed) return [];
  try {
    const url =
      `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(trimmed)}` +
      `&access_token=${token}&limit=5&language=en&types=poi` +
      `&proximity=${proximity.lng},${proximity.lat}`;
    const res = await fetch(url, {
      next: { revalidate: MAPBOX_GEOCODE_REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: Array<{
        properties?: { name?: string; full_address?: string };
        geometry?: { coordinates?: [number, number] };
      }>;
    };
    return (data.features ?? [])
      .filter(
        (f) =>
          f.properties?.name &&
          f.properties?.full_address &&
          f.geometry?.coordinates,
      )
      .map((f) => ({
        name: f.properties!.name!,
        fullAddress: f.properties!.full_address!,
        lng: f.geometry!.coordinates![0],
        lat: f.geometry!.coordinates![1],
      }));
  } catch {
    return [];
  }
}

/** Mainland framing overrides.
 *
 *  A country's official bbox covers its whole TERRITORY, which for a
 *  few countries reaches thousands of km past the part anyone is
 *  looking at. The USA is the worst: its bbox runs [-179.9 … -66.9]
 *  (the Aleutians) by [18.8 … 71.4] (Hawaii to northern Alaska), so
 *  its centre — where fitBounds points the camera — lands at
 *  [-123.4, 45.1], in the Pacific off Oregon, ~25° west of the lower
 *  48. The frame reads as skewed sideways because it IS.
 *
 *  Note the 180°-wrap guard below doesn't catch this: the USA's span
 *  is 113°, comfortably under the threshold, so it sails through.
 *
 *  Deriving the frame instead by mirroring the bbox about Mapbox's
 *  representative `center` was tried and rejected — it fixes the USA
 *  but crops countries whose centre legitimately sits off-centre
 *  (Sweden loses Stockholm and Malmö; the Falklands collapse to a
 *  0.5°-wide sliver). So only the demonstrably-affected countries get
 *  an explicit mainland box; everything else keeps the geocoder's
 *  bbox untouched. Values are the standard mainland extents.
 *
 *  To extend: compare a country's bbox centre against its `center`
 *  from the same geocoder response — a large gap means a remote
 *  territory is dragging the box. */
const MAINLAND_BOUNDS: Record<string, CountryBounds> = {
  // Contiguous 48 — Cape Alava WA → West Quoddy Head ME, the Keys →
  // the Minnesota line. Drops Alaska and Hawaii.
  "united states": [-124.85, 24.4, -66.95, 49.38],
  // Drops the Azores (-31°) and Madeira (-17°).
  portugal: [-9.55, 36.96, -6.19, 42.16],
  // Peninsular Spain + Balearics. Drops the Canaries (-18°, 27.6°N).
  spain: [-9.3, 35.95, 4.33, 43.79],
  // Mainland + Tasmania. Drops Macquarie (-54.6°) and the Indian
  // Ocean territories.
  australia: [112.92, -43.64, 153.64, -10.69],
};

/** Alternative names editors may store for the countries above. */
const MAINLAND_ALIASES: Record<string, string> = {
  usa: "united states",
  us: "united states",
  "united states of america": "united states",
};

/** Forward-geocode a country NAME to its bounding box (types=country),
 *  for the /races map's fit-the-whole-country camera. Same token +
 *  24h caching model as geocodeAddress. Countries in MAINLAND_BOUNDS
 *  short-circuit to their mainland frame (no request needed). Returns
 *  null when the bbox is unusable — notably when it spans more than
 *  180° of longitude, which would frame the whole world; callers fall
 *  back to fitting the marker set. */
export async function geocodeCountryBounds(
  name: string | null | undefined,
): Promise<CountryBounds | null> {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  const key = trimmed.toLowerCase();
  const mainland = MAINLAND_BOUNDS[MAINLAND_ALIASES[key] ?? key];
  if (mainland) return mainland;

  const token =
    process.env.MAPBOX_GEOCODING_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json` +
      `?access_token=${token}&types=country&limit=1`;
    const res = await fetch(url, {
      next: { revalidate: MAPBOX_GEOCODE_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ bbox?: number[] }>;
    };
    const bbox = data.features?.[0]?.bbox;
    if (!bbox || bbox.length < 4 || bbox.some((n) => typeof n !== "number"))
      return null;
    if (bbox[2] - bbox[0] > 180) return null;
    return [bbox[0], bbox[1], bbox[2], bbox[3]];
  } catch {
    return null;
  }
}
