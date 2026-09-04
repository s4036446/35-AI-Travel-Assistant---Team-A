#!/usr/bin/env node
'use strict';

/**
 * schedule-lookup.js — the scheduled flights on a route closest to a given time.
 *
 *   node schedule-lookup.js SYD LHR 09:30
 *   node schedule-lookup.js SYD LHR 09:30 --limit 3 --json
 */

const { airlabsRequest, AirlabsError } = require('./lib/airlabs');
const { describeAircraft } = require('./lib/aircraft');
const { lookupAirlineNames } = require('./lib/airlines');
const {
  parseClockTime,
  minutesFromTimestamp,
  clockDistance,
  formatOffset,
  isPastUnix,
} = require('./lib/time');

const IATA = /^[A-Z]{3}$/;
const DEFAULT_LIMIT = 5;

function usage() {
  return [
    'Usage: node schedule-lookup.js <dep-iata> <arr-iata> <HH:MM> [--limit N] [--json] [--include-past]',
    '',
    '  <dep-iata>  Departure airport IATA code, e.g. SYD.',
    '  <arr-iata>  Arrival airport IATA code, e.g. LHR.',
    '  <HH:MM>     Approximate local departure time, e.g. 09:30.',
    `  --limit N   How many flights to return (default ${DEFAULT_LIMIT}).`,
    '  --json      Print the parsed results as JSON instead of text.',
    '  --include-past  Keep departures that have already left (dropped by default).',
  ].join('\n');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const json = args.includes('--json');
  const includePast = args.includes('--include-past');

  let limit = DEFAULT_LIMIT;
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json' || arg === '--include-past') continue;
    if (arg === '--limit') {
      limit = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      limit = Number(arg.slice('--limit='.length));
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option "${arg}".\n\n${usage()}`);
    }
    positional.push(arg);
  }

  if (positional.length !== 3) {
    throw new Error(`Expected departure IATA, arrival IATA and a time.\n\n${usage()}`);
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('--limit must be a positive whole number.');
  }

  const [depRaw, arrRaw, timeRaw] = positional;
  const depIata = depRaw.toUpperCase();
  const arrIata = arrRaw.toUpperCase();

  for (const [label, code] of [['Departure', depIata], ['Arrival', arrIata]]) {
    if (!IATA.test(code)) {
      throw new Error(`${label} "${code}" is not a 3-letter airport IATA code (e.g. SYD).`);
    }
  }

  return {
    depIata,
    arrIata,
    targetMinutes: parseClockTime(timeRaw),
    targetLabel: timeRaw,
    limit,
    json,
    includePast,
  };
}

/**
 * Fetch the route's schedule and return the `limit` flights whose departure
 * time sits closest to `targetMinutes`, nearest first.
 *
 * Departures that have already left are dropped unless `includePast` is set:
 * a clock-face match alone cannot tell 00:30-tonight from 00:30-an-hour-ago.
 */
async function findClosestFlights({ depIata, arrIata, targetMinutes, limit, includePast = false }) {
  const response = await airlabsRequest('schedules', {
    dep_iata: depIata,
    arr_iata: arrIata,
  });

  const schedules = Array.isArray(response) ? response : [];
  if (schedules.length === 0) {
    throw new AirlabsError(
      `Airlabs has no scheduled flights for ${depIata} → ${arrIata}. ` +
        'The /schedules endpoint only covers roughly the next 24 hours of departures.'
    );
  }

  const now = Date.now();
  const timed = schedules
    .map((flight) => {
      const depMinutes = minutesFromTimestamp(flight.dep_time);
      return {
        flight,
        depMinutes,
        // Absolute instant; the only sound basis for "has this already gone?".
        depTs: typeof flight.dep_time_ts === 'number' ? flight.dep_time_ts : null,
        past: isPastUnix(flight.dep_time_ts, now),
        // Clock-face distance: the user asked for a time of day, not an instant.
        offset: depMinutes === null ? null : clockDistance(depMinutes, targetMinutes),
      };
    })
    // A schedule row with no usable departure time cannot be ranked by time.
    .filter((entry) => entry.offset !== null);

  if (timed.length === 0) {
    throw new AirlabsError(
      `Airlabs returned ${schedules.length} row(s) for ${depIata} → ${arrIata}, ` +
        'but none carried a readable departure time.'
    );
  }

  const upcoming = includePast ? timed : timed.filter((entry) => !entry.past);
  const skippedPast = timed.length - upcoming.length;

  if (upcoming.length === 0) {
    throw new AirlabsError(
      `All ${skippedPast} scheduled departure(s) for ${depIata} → ${arrIata} have already left. ` +
        'Pass --include-past to see them anyway.'
    );
  }

  const ranked = upcoming
    // Ties on clock distance break toward the earlier actual departure.
    .sort((a, b) => a.offset - b.offset || (a.depTs ?? Infinity) - (b.depTs ?? Infinity))
    .slice(0, limit);

  const airlineNames = await lookupAirlineNames(ranked.map((entry) => entry.flight.airline_iata));

  const results = ranked.map(({ flight, offset, past }) => ({
    flightIata: flight.flight_iata || flight.flight_number || 'unknown',
    airline: {
      iata: flight.airline_iata || null,
      name: airlineNames.get((flight.airline_iata || '').toUpperCase()) || null,
    },
    departure: {
      iata: flight.dep_iata || depIata,
      time: flight.dep_time || null,
      terminal: flight.dep_terminal || null,
      gate: flight.dep_gate || null,
    },
    arrival: {
      iata: flight.arr_iata || arrIata,
      time: flight.arr_time || null,
      terminal: flight.arr_terminal || null,
    },
    aircraft: describeAircraft(flight.aircraft_icao, {
      model: flight.model,
      manufacturer: flight.manufacturer,
    }),
    status: flight.status || null,
    offsetMinutes: offset,
    past,
  }));

  results.skippedPast = skippedPast;
  return results;
}

function render(results, { depIata, arrIata, targetLabel }) {
  const skipped = results.skippedPast
    ? ` (${results.skippedPast} already-departed flight(s) skipped)`
    : '';
  const lines = [
    `${results.length} flight(s) on ${depIata} → ${arrIata} closest to ${targetLabel}${skipped}:`,
    '',
  ];

  results.forEach((result, index) => {
    const airline = result.airline.name
      ? `${result.airline.name} (${result.airline.iata})`
      : result.airline.iata || 'unknown airline';
    const aircraft = [result.aircraft.manufacturer, result.aircraft.model]
      .filter(Boolean)
      .join(' ');

    lines.push(
      `${index + 1}. ${result.flightIata} — ${airline}${result.past ? '  [DEPARTED]' : ''}`,
      `   Departs ${result.departure.time || 'unknown'} from ${result.departure.iata}` +
        `${result.departure.terminal ? ` (T${result.departure.terminal})` : ''}` +
        `  [${formatOffset(result.offsetMinutes)}]`,
      `   Arrives ${result.arrival.time || 'unknown'} at ${result.arrival.iata}`,
      `   Aircraft ${aircraft || result.aircraft.code || 'unknown'}` +
        `${aircraft && result.aircraft.code ? ` (${result.aircraft.code})` : ''}`,
      ''
    );
  });

  return lines.join('\n').trimEnd();
}

async function main() {
  const options = parseArgs(process.argv);
  const results = await findClosestFlights(options);
  console.log(options.json ? JSON.stringify(results, null, 2) : render(results, options));
}

if (require.main === module) {
  main().catch((error) => {
    if (error instanceof AirlabsError) {
      console.error(`Airlabs error: ${error.message}${error.code ? ` (code ${error.code})` : ''}`);
    } else {
      console.error(error.message);
    }
    process.exitCode = 1;
  });
}

module.exports = { findClosestFlights };
