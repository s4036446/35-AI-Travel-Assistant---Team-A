# Research Findings: Hotel/Booking Provider Options

**AI Travel Assistant for Accessible Aviation**
**Project:** AI Travel Assistant for Accessible Aviation (Your Accessible Flight)
**Prepared by:** Wen Bin Liang (BA)

## 1. Purpose

This document identifies and compares hotel/booking providers capable of returning price, availability, and accessibility information for a given destination, which is the second external data source in the AI Travel Assistant's core flow, following the flight-data lookup (see the separate Flight-Data API Access document). It records the comparison, sign-up/access requirements, the recommended provider with rationale, and a compatibility check against the chosen flight-data provider.

## 2. Provider Comparison

Providers were compared on coverage/data available (accessibility info, price, availability), and access model.

| Criteria                 | StayingAPI                                                                               | Booking.com (official Demand API)                                                                                     | Hotelbeds                                                                                                   | Travelpayouts (Booking.com affiliate route)                                                         | Google Places API                                                                     |
| :----------------------- | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Data available**       | Search, live availability, price, cross-OTA comparison, canonical amenities per property | Full price, availability and content — access could not realistically be obtained (Section 6)                         | Static content (descriptions, photos, address) and dynamic data (price, availability) — B2B, contract-based | Same underlying Booking.com data, via an affiliate application route                                | Place listing, rating, accessibility fields only — no price, availability, or booking |
| **Accessibility info**   | Yes                                                                                      | N/A — not accessible                                                                                                  | Unconfirmed — not tested, contract required first                                                           | Same as Booking.com official, if approved                                                           | Yes — structured accessibilityOptions: entrance, parking, restroom, seating           |
| **Price / availability** | Yes, live, confirmed                                                                     | Yes, but gated                                                                                                        | Yes, but gated                                                                                              | Yes, but gated behind the same approval process                                                     | Not provided — a places directory, not a booking system                               |
| **Sign-up / access**     | Free key, instant. A stay*test* sandbox key needs no signup at all                       | Not self-serve — approved partner only, must maintain 9% search-to-buy / 5% buy-to-purchase conversion to keep access | Not self-serve — typically requires a business contract/sales process                                       | Requires an affiliate application: project URL, prototype, and description reviewed before approval | Free tier via Google Cloud account, standard API key signup                           |

## 3. Chosen Provider: StayingAPI

**Rationale:** every other option in the comparison above is either gated behind a partner application/contract (Booking.com official, Hotelbeds, Travelpayouts), or missing price/availability entirely (Google Places). StayingAPI is the only option that is genuinely self-serve, free, and confirmed through live testing, not just documentation that it returns all three required data points: price, availability, and accessibility-relevant amenities.

## 4. How StayingAPI Works

StayingAPI is a multi-source aggregator, not a single hotel database. Its `GET /v1/search` endpoint accepts:

- `location` (required) — a plain destination string (city, region, or address)
- `platforms` (optional) — comma-separated source names to query, e.g. `platforms=booking,airbnb`. If omitted, defaults to all sources enabled on the account
- `checkIn`, `checkOut`, `adults`, `children`, `rooms`, `currency`, `limit` — standard search parameters

A single request such as `GET /v1/search?location=Sibu, MY&platforms=booking,airbnb` fans out to each named source in parallel, queries them independently, and returns every result under one unified Property schema, regardless of which source it came from. Each result in the response includes:

- `name`, `platform`, `url` — the property name, which source it came from, and a direct link to it
- `location` — lat, lng, city, region, country, address
- `propertyType` — hotel, apartment, house, villa, cottage, or other
- `amenities` — an array of standardized values, including `wheelchair_accessible`, from a fixed enum shared across all sources
- `price` — nightlyPrice, totalPrice, currency, fees, and a direct url to book
- `starRating`, `guestRating`, `reviewCount`, `images`

This is a fundamentally different model to Booking.com's own official API: Booking.com's API has no `platforms` parameter, because it only ever queries Booking.com itself — there is nothing to select. StayingAPI's value is specifically that one request, with one schema, can reach multiple sources; the trade-off, covered in Section 6, is that not every source it can reach is equally reliable.

## 5. Testing Findings

A live (non-sandbox) key was used to test `GET /v1/search` with `location=Sibu, MY` (the destination resolved directly from the AeroDataBox flight-data test). The `platforms` parameter was left unspecified, so the API searched whichever sources are available on the account by default: vrbo, booking, airbnb, and google.

**Query:** `https://api.stayingapi.com/v1/search?location=Sibu,%20MY&checkIn=2026-09-20&checkOut=2026-09-22&adults=1&limit=5`

**Results:**

| Source      | Result                                                                                                                                                                                                                                                                       |
| :---------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **booking** | 5 results, all correctly located in Sibu, Sarawak, Malaysia, verified addresses and coordinates. Two of the five (RH Hotel Sibu, The Orchid Hotel) include wheelchair_accessible in their amenities. Each result includes a direct, working booking url.                     |
| **airbnb**  | 5 results returned, but all located in Tokyo (Shibuya/Shinjuku/Ebisu area, based on returned coordinates), not Sibu, Malaysia. Flagged as unreliable for this destination, likely a location-matching issue between “Sibu” and “Shibuya” somewhere in the underlying search. |
| **vrbo**    | 1 result returned. Its structured location fields (lat, lng, city, region, address, country) are all null, though the listing's own URL confirms the correct destination (Sibu, Sarawak, Malaysia). Usable as a link, not reliable as structured data.                       |
| **google**  | Returned no results, the request failed with “All actors failed for google.search” (marked retryable). No credits were charged for the failure.                                                                                                                              |

Only these four sources appeared in the response; the API's own platform list includes others (expedia, hotels, tripadvisor) that did not appear here, suggesting they may not be available on the current account tier.
Confirmed cost per result: booking 1 credit, airbnb 2 credits, vrbo 1 credit (with an apparent minimum charge); failed platforms are not charged.

### 5.1 Limitations From Testing, and Suggestions

Across the four sources tested, only booking returned consistently accurate results for the requested destination: airbnb returned properties in the wrong city entirely, vrbo returned results with incomplete location data, and google failed to return results at all. Even booking, while the most reliable, is not guaranteed to return a result on every call. Given this, the recommended approach is to query `platforms=booking` explicitly for the Sprint 2 integration rather than searching all available sources, and to design the AI Assistant to handle an empty or missing result gracefully, rather than assuming a hotel suggestion will always be returned. Broader source coverage could be considered later, but would first need a location-match filter to catch and exclude mismatched results like the ones seen from airbnb.

## 6. Blockers

The client's original proposal named three example hotel/booking providers: Amadeus, Expedia, and Booking.com as candidates for this integration. None are directly usable: Amadeus's Self-Service API shut down for new developers in July 2026, Expedia does not appear as an available source through StayingAPI, and Booking.com's own official API is not self-serve, even once approved, it requires maintaining a 9% search-to-buy and 5% buy-to-purchase conversion rate to keep access, which isn't realistic for a prototype with limited test users. This is a current access limitation, not a rejection of Booking.com as a source, if the team or client can secure partner approval later, or if the conversion-rate requirement turns out not to apply to a student project, switching to Booking.com's official API directly would be the preferred long-term option over a third-party aggregator.

StayingAPI's free allowance is 300 credits total, with no confirmed recurring refresh. At 5 credits per booking search, that's roughly 60 searches before the team would need to pay (worth the team's awareness given several members will be testing during development.)

Not every search returns results right away. If StayingAPI needs more time to complete a search, it responds immediately with a "still working on it" status and a job ID, instead of the actual results. The app then has to check back with that job ID a few seconds later to get the real results. Dev needs to be aware of this, it can't assume every search returns its answer straight away.

How StayingAPI actually sources its data is unconfirmed. Its marketing describes itself as different from a plain "scraper," which suggests it isn't working through official data-sharing partnerships with every source it covers. This could carry some compliance/policy risk, but isn't a concern for a prototype like this one. Worth a closer look only if the project were ever taken toward real-world or production use.

## 7. Cross-Check Against Flight-Data Provider (AeroDataBox)

AeroDataBox's flight-status response returns the arrival airport's municipality name and country code (e.g. “Sibu”, “MY”). This was used directly as StayingAPI's location parameter with no reformatting: AeroDataBox's MH2718 test flight resolved to arrival airport “Sibu”, “MY”, which was passed straight into StayingAPI as `location=Sibu, MY` and returned real, correctly located hotel results. This confirms the two chosen providers integrate cleanly, with the flight-data output feeding directly into the hotel search input.
