# Research Findings: Flight-Data API Access

**AI Travel Assistant for Accessible Aviation**
**Project:** AI Travel Assistant for Accessible Aviation (Your Accessible Flight)
**Prepared by:** Wen Bin Liang (BA)

## 1. Purpose

This document identifies and compares flight-data providers capable of returning a flight's route, destination, and aircraft type given a flight number (the first step in the AI Travel Assistant's core flow).  
This records the comparison, the recommended provider with rationale, and the access details needed before Dev begins integration work.

## 2. Provider Comparison

Four providers were compared on coverage, aircraft-type detail, cost/free-tier limits, and access model.

| Criteria                  | AeroDataBox                                                                  | Aviationstack                                                                           | FlightAware AeroAPI                                                       | Flightradar24                                                                                            |
| :------------------------ | :--------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------- |
| **Coverage**              | Global, “best-effort” e.g. ~100% schedule coverage in the US, ~92% in France | Global, standard REST; real-time flight, airport, and airline data                      | Global, ADS-B-powered. Generally the highest-confidence data of the three | Largest independent ADS-B network in the world. Very strong live coverage                                |
| **Aircraft-type detail**  | Yes. Flight status endpoint returns aircraft registration and model directly | Yes. Flights endpoint includes aircraft info, plus a dedicated aircraft-types reference | Yes. Included in flight tracking data                                     | Yes. Included                                                                                            |
| **Free tier**             | 600 API units/month                                                          | 100 requests/month                                                                      | $5/month free query credit (not a fixed call count)                       | Sandbox environment only, free for testing, not for production use                                       |
| **Rate limit (free)**     | 1 request/second                                                             | 1 request per 60 seconds                                                                | ~10 result sets/minute (Personal tier)                                    | Not published for sandbox tier                                                                           |
| **Cost beyond free tier** | Pro $5.35/mo up to Mega $160/mo                                              | Basic $49.99/mo up to Business $499.99/mo                                               | Standard tier has a $200/month minimum                                    | Requires a paid Silver/Gold/Business subscription for any real usage; 7-day free trial only              |
| **Access model**          | Self-serve via RapidAPI, instant                                             | Self-serve, instant, no card required                                                   | Self-serve, but cost scales quickly with polling frequency                | Self-serve signup, but genuinely free access is sandbox/testing only. Not usable for a running prototype |

## 3. Recommendation

**Recommended provider:** AeroDataBox
**Rationale:** AeroDataBox was selected because it returns aircraft type directly from a single flight-number lookup, exactly what our flow needs, with the most generous free tier of the options compared (600 calls/month), no approval wait, and no cost for the life of this project. Its main trade-off, "best-effort" rather than guaranteed data accuracy, is acceptable for a prototype.

Flightradar24 was the provider named in the original task scope, but was not selected: its free tier is sandbox/testing-only, and any real, ongoing usage requires a paid subscription plan. This makes it impractical for a student project with no budget. However, if the client already holds a Flightradar24 subscription or API key, this could be revisited. Aviationstack is a reasonable fallback, but its tighter free-tier limits (100 requests/month, 1 request per 60 seconds) would be restrictive with the whole team testing against it. FlightAware was considered but not selected as primary, due to its cost model scaling poorly for any polling-based usage.

## 4. Example Usage (Confirmed Test Call)

The chosen provider, AeroDataBox, was tested directly via its RapidAPI console using a real, live commercial flight.

**Request:** `GET Flight status (nearest day), searchBy = number, searchParameter = MH2718`

**Result:** `200 OK`. Key fields returned:

- **Flight number:** MH 2718 (Malaysia Airlines)
- **Departure:** Kuala Lumpur (KUL) | **Arrival:** Sibu (SBW)
- **Status:** Departed
- **Aircraft:** Boeing 737-800, registration 9M-MLV

## 5. Rate Limits and Costs

AeroDataBox free tier: 600 API units/month, 1 request/second, sufficient for individual development and testing, but the team should be mindful of shared usage if multiple members test against the same key.
No cost is expected for this project's scope; upgrading to a paid tier is not anticipated to be necessary for a prototype.
If usage needs exceed the free tier at any point, Pro is $5.35/month for the next tier up.

## 6. Integration Compatibility

AeroDataBox's flight-status response includes the arrival airport's municipality name and country code (e.g. "Sibu", "MY"). This maps directly to the location parameter expected by StayingAPI (the recommended hotel/booking provider, see the separate Hotel/Booking Provider Research document), with no reformatting required.

---
