#!/usr/bin/env node
'use strict';

/**
 * flight-lookup.js — look up one flight by its IATA code.
 *
 *   node flight-lookup.js QF9
 *   node flight-lookup.js QF9 --json
 */

const { airlabsRequest, AirlabsError } = require('./lib/airlabs');
const { describeAircraft } = require('./lib/aircraft');
const { lookupAirport, formatAirport } = require('./lib/airports');

const FLIGHT_IATA = /^[A-Z0-9]{2}\d{1,4}$/;

function usage() {
  return [
    'Usage: node flight-lookup.js <flight-iata> [--json]',
    '',
    '  <flight-iata>  Airline IATA code plus flight number, e.g. QF9, BA15, UA1.',
    '  --json         Print the parsed result as JSON instead of text.',
  ].join('\n');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const json = args.includes('--json');
  const positional = args.filter((arg) => !arg.startsWith('--'));

  if (positional.length !== 1) {
    throw new Error(`Expected exactly one flight code.\n\n${usage()}`);
  }

  const flightIata = positional[0].toUpperCase().replace(/\s+/g, '');
  if (!FLIGHT_IATA.test(flightIata)) {
    throw new Error(`"${positional[0]}" is not a flight IATA code (expected e.g. QF9).`);
  }

  return { flightIata, json };
}

/**
 * Fetch a flight and reshape it into the fields this PoC cares about.
 * @param {string} flightIata
 */
async function lookupFlight(flightIata) {
  const response = await airlabsRequest('flight', { flight_iata: flightIata });

  // /flight returns a single object, but be tolerant of an array of matches.
  const flight = Array.isArray(response) ? response[0] : response;
  if (!flight || !flight.flight_iata) {
    throw new AirlabsError(
      `Airlabs returned no flight data for ${flightIata}. ` +
        'The /flight endpoint only covers flights that are currently airborne or scheduled today.'
    );
  }

  const [depAirport, arrAirport] = await Promise.all([
    lookupAirport(flight.dep_iata),
    lookupAirport(flight.arr_iata),
  ]);

  return {
    flightIata: flight.flight_iata,
    airlineIata: flight.airline_iata || null,
    status: flight.status || null,
    departure: {
      iata: flight.dep_iata || null,
      label: formatAirport(flight.dep_iata, depAirport),
      terminal: flight.dep_terminal || null,
      gate: flight.dep_gate || null,
      scheduled: flight.dep_time || null,
      estimated: flight.dep_estimated || null,
    },
    arrival: {
      iata: flight.arr_iata || null,
      label: formatAirport(flight.arr_iata, arrAirport),
      terminal: flight.arr_terminal || null,
      gate: flight.arr_gate || null,
      scheduled: flight.arr_time || null,
      estimated: flight.arr_estimated || null,
    },
    aircraft: {
      ...describeAircraft(flight.aircraft_icao, {
        model: flight.model,
        manufacturer: flight.manufacturer,
      }),
      registration: flight.reg_number || null,
    },
  };
}

function render(result) {
  const { departure: dep, arrival: arr, aircraft } = result;
  const lines = [
    `Flight ${result.flightIata}${result.status ? ` (${result.status})` : ''}`,
    '',
    `  From: ${dep.label}`,
    `  To:   ${arr.label}`,
  ];

  if (dep.scheduled || arr.scheduled) {
    lines.push('', `  Departs: ${dep.scheduled || 'unknown'}`, `  Arrives: ${arr.scheduled || 'unknown'}`);
  }

  lines.push(
    '',
    `  Aircraft type: ${aircraft.code || 'unknown'}`,
    `  Model:         ${aircraft.model || 'unknown'}`,
    `  Manufacturer:  ${aircraft.manufacturer || 'unknown'}`
  );

  if (aircraft.registration) {
    lines.push(`  Registration:  ${aircraft.registration}`);
  }

  return lines.join('\n');
}

async function main() {
  const { flightIata, json } = parseArgs(process.argv);
  const result = await lookupFlight(flightIata);
  console.log(json ? JSON.stringify(result, null, 2) : render(result));
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

module.exports = { lookupFlight };
