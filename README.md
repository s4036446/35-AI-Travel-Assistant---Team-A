# 35-AI-Travel-Assistant---Team-A

Proof-of-concept flight lookups against the [Airlabs API](https://airlabs.co/api/v9) (v9).

Two command-line scripts:

| Script | Answers |
| --- | --- |
| `flight-lookup.js` | "What does flight QF9 fly, and where between?" |
| `schedule-lookup.js` | "What flies SYD → LHR around 09:30?" |

## Setup

Requires Node.js 18 or newer (the scripts use the built-in `fetch`; developed on Node 24).

```bash
npm install
cp .env.example .env
```

Put your Airlabs key in `.env`:

```
AIRLABS_API_KEY=your_api_key_here
```

Get a key by signing up at [airlabs.co](https://airlabs.co/). `.env` is gitignored — do not commit your key.

## flight-lookup.js

Looks up one flight by its IATA code via the `/flight` endpoint and reports the departure
airport, arrival airport, and aircraft type, model, and manufacturer.

```bash
node flight-lookup.js QF9
node flight-lookup.js QF9 --json     # machine-readable output
```

```
Flight QF9 (en-route)

  From: PER — Perth International (Perth, AU)
  To:   LHR — London Heathrow (London, GB)

  Departs: 2026-09-05 19:15
  Arrives: 2026-09-06 05:05

  Aircraft type: B789
  Model:         787-9 Dreamliner
  Manufacturer:  Boeing
  Registration:  VH-ZNA
```

**Note on coverage:** `/flight` only returns flights that are currently airborne or scheduled
for today. Asking for a flight that is not operating right now is not a bug — the script says
so explicitly.

## schedule-lookup.js

Takes a departure airport, an arrival airport, and an approximate local departure time, and
returns the scheduled flights closest to that time via the `/schedules` endpoint.

```bash
node schedule-lookup.js SYD LHR 09:30
node schedule-lookup.js SYD LHR 09:30 --limit 3
node schedule-lookup.js SYD LHR 09:30 --json
node schedule-lookup.js SYD LHR 09:30 --include-past   # keep departed flights
```

```
5 flight(s) on SYD → LHR closest to 09:30:

1. QF9 — Qantas (QF)
   Departs 2026-09-05 09:15 from SYD (T1)  [15m away]
   Arrives 2026-09-06 05:05 at LHR
   Aircraft Boeing 787-9 Dreamliner (B789)

2. BA16 — British Airways (BA)
   Departs 2026-09-05 09:45 from SYD  [15m away]
   Arrives 2026-09-06 05:10 at LHR
   Aircraft Boeing 777-300ER (B77W)
...
```

Options: `--limit N` (default 5), `--json`, and `--include-past`.

Closeness is measured the short way round the clock, so a 23:50 departure counts as 20 minutes
from a 00:10 target rather than 23 hours and 40 minutes.

### Departed flights and timezones

Flights that have already left are dropped before ranking, and the header says how many were
skipped. This matters because clock-face distance alone cannot tell 00:30-tonight from
00:30-an-hour-ago — without the filter, a flight that left an hour ago is reported as the
closest match to a 01:00 query.

The filter uses Airlabs' `dep_time_ts` (an absolute unix timestamp), **not** `dep_time`.
`dep_time` is local *airport* time, so parsing it with `new Date('2026-09-05 00:30')` silently
assumes your machine's offset and is wrong for every airport outside your own timezone. On a
sample of 100 DXB departures the two approaches disagreed on 48 rows. Rows with no usable
`dep_time_ts` are kept rather than guessed at.

Pass `--include-past` to see departed flights anyway; they are tagged `[DEPARTED]`.

**Note on coverage:** `/schedules` covers roughly the next 24 hours of departures, so it answers
"what's flying this route today", not "what's the timetable in three weeks".

## How it is put together

```
flight-lookup.js      CLI: one flight by IATA code
schedule-lookup.js    CLI: closest scheduled flights on a route
lib/airlabs.js        HTTP client, API key handling, Airlabs error handling
lib/aircraft.js       ICAO type designator -> manufacturer + model
lib/airports.js       IATA code -> airport name (cached, best-effort)
lib/airlines.js       IATA code -> airline name (cached, best-effort)
lib/time.js           HH:MM parsing, clock-distance maths, past-departure check
test/                 Ranking tests against a stubbed client (no API key needed)
```

Both scripts also export their lookup function (`lookupFlight`, `findClosestFlights`) so the
assistant can call them directly instead of shelling out.

### Error handling

Airlabs signals failures with an `error` object in the body, usually still under HTTP 200:

```json
{ "error": { "message": "Unknown api_key", "code": "unknown_api_key" } }
```

`lib/airlabs.js` checks for that before touching the payload and raises an `AirlabsError`, so
the scripts print a readable line and exit non-zero rather than crashing on undefined fields:

```
$ node flight-lookup.js QF9
Airlabs error: Unknown api_key (code unknown_api_key)
$ echo $?
1
```

The same path covers a missing `AIRLABS_API_KEY`, network failures, non-JSON responses, and
a response with no flight in it. Airport and airline name lookups are deliberately best-effort:
if they fail the script still prints the IATA code rather than failing the whole request.

### Aircraft manufacturer

Airlabs returns an ICAO type designator (`B789`), not a manufacturer. `lib/aircraft.js` maps the
common designators to manufacturer and model, falling back to a prefix rule (`A___` → Airbus,
`B___` → Boeing) and then to the raw code. If Airlabs does include `model` or `manufacturer` on
a record, those win over the table. Add rows to `TYPES` as more types turn up.

## Tests

```bash
npm test
```

Runs `test/schedule-ranking.test.js` against a stubbed Airlabs client — no API key or network
needed. Covers the cases live data will not reliably reproduce: an already-departed flight, a row
missing `dep_time_ts`, midnight wraparound, and a route where every departure has already left.

## Status

Proof of concept, verified against the live API.

Known gap: `/schedules` returns `aircraft_icao` as `null` on every row we have seen (0 of 84 on
SYD→MEL), so `schedule-lookup.js` prints `Aircraft unknown`. Filling that in needs a second
`/flight` call per result. `flight-lookup.js` does return aircraft details.

Also unhandled: `/schedules` is dominated by codeshares (62 of 84 rows on SYD→MEL), so several
"different" results can be one physical aircraft. Airlabs marks these with `cs_flight_iata`;
collapsing them is not yet implemented.
