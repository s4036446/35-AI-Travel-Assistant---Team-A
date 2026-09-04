'use strict';

/**
 * Ranking tests for schedule-lookup.js, run against a stubbed Airlabs client
 * so they need no API key and no network:
 *
 *   npm test
 *
 * The cases that matter are the ones live data will not reliably reproduce —
 * an already-departed flight, a row missing dep_time_ts, and a route where
 * everything has already left.
 */

const path = require('path');
const proj = path.join(__dirname, '..');
const airlabsPath = require.resolve(path.join(proj, 'lib/airlabs.js'));
const real = require(airlabsPath);

const NOW = Date.now() / 1000;
const past = (m) => Math.round(NOW - m * 60);
const future = (m) => Math.round(NOW + m * 60);

const SCHEDULES = [
  { flight_iata: 'QF1',   airline_iata: 'QF', dep_time: '2026-09-05 06:05', arr_time: '2026-09-05 05:30', aircraft_icao: 'A388', dep_time_ts: future(600) },
  { flight_iata: 'BA16',  airline_iata: 'BA', dep_time: '2026-09-05 09:45', arr_time: '2026-09-05 05:10', aircraft_icao: 'B77W', dep_time_ts: future(700) },
  { flight_iata: 'QF9',   airline_iata: 'QF', dep_time: '2026-09-05 09:15', arr_time: '2026-09-05 05:05', aircraft_icao: 'B789', dep_time_ts: future(650) },
  { flight_iata: 'GONE',  airline_iata: 'ZZ', dep_time: '2026-09-05 09:20', arr_time: '2026-09-05 05:00', aircraft_icao: 'A359', dep_time_ts: past(30) },
  { flight_iata: 'QF2',   airline_iata: 'QF', dep_time: '2026-09-05 11:00', arr_time: '2026-09-05 06:00', aircraft_icao: 'A388', dep_time_ts: future(800) },
  { flight_iata: 'NOTIME',airline_iata: 'XX', dep_time: null,               arr_time: null,               aircraft_icao: 'ZZZZ', dep_time_ts: future(100) },
  { flight_iata: 'NOTS',  airline_iata: 'YY', dep_time: '2026-09-05 09:25', arr_time: '2026-09-05 05:00', aircraft_icao: 'B738', dep_time_ts: null },
];

// Indirection so the test can swap the dataset after schedule-lookup.js has
// already destructured airlabsRequest at require time.
let dataset = SCHEDULES;
require.cache[airlabsPath].exports = {
  ...real,
  airlabsRequest: async (endpoint) => {
    if (endpoint === 'schedules') return dataset;
    throw new real.AirlabsError('offline');
  },
};

const { findClosestFlights } = require(path.join(proj, 'schedule-lookup.js'));
const base = { depIata: 'SYD', arrIata: 'LHR', targetMinutes: 9 * 60 + 30, limit: 5 };
let failures = 0;
const check = (label, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; };

(async () => {
  const r = await findClosestFlights(base);
  const codes = r.map((f) => f.flightIata);
  console.log('default ->', codes.join(', '), `| skippedPast=${r.skippedPast}`);
  check('departed flight GONE is dropped', !codes.includes('GONE'));
  check('row with no dep_time is dropped', !codes.includes('NOTIME'));
  check('row with no dep_time_ts is kept (not silently dropped)', codes.includes('NOTS'));
  check('skippedPast counts the one departed flight', r.skippedPast === 1);
  check('nearest-first ordering', codes[0] === 'NOTS' || codes[0] === 'QF9');

  const withPast = await findClosestFlights({ ...base, includePast: true });
  const pastCodes = withPast.map((f) => f.flightIata);
  console.log('--include-past ->', pastCodes.join(', '));
  check('GONE reappears with includePast', pastCodes.includes('GONE'));
  check('GONE is flagged past', withPast.find((f) => f.flightIata === 'GONE').past === true);

  // midnight wrap still works
  const wrap = await findClosestFlights({ ...base, targetMinutes: 10, limit: 3 });
  console.log('target 00:10 ->', wrap.map((f) => `${f.flightIata}(+${f.offsetMinutes}m)`).join(', '));
  check('clock wrap preserved (06:05 is 355m from 00:10)', wrap[0].offsetMinutes === 355);

  // all-past route
  dataset = [
    { flight_iata: 'OLD', airline_iata: 'ZZ', dep_time: '2026-09-05 09:00', dep_time_ts: past(60) },
  ];
  try {
    await findClosestFlights(base);
    check('all-past route raises a clear error', false);
  } catch (e) {
    console.log('all-past ->', e.message);
    check('all-past route raises a clear error', /already left/.test(e.message));
  }

  console.log(failures ? `\n${failures} FAILURE(S)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
