'use strict';

const { airlabsRequest } = require('./airlabs');

const cache = new Map();

/**
 * Look up an airport by IATA code. Returns null instead of throwing when the
 * code is unknown or the lookup fails — airport names are decoration here, and
 * a failed decoration should not sink the flight lookup itself.
 *
 * @param {string} iata
 */
async function lookupAirport(iata) {
  if (!iata) return null;
  const code = String(iata).toUpperCase();
  if (cache.has(code)) return cache.get(code);

  let airport = null;
  try {
    const response = await airlabsRequest('airports', { iata_code: code });
    const list = Array.isArray(response) ? response : [response];
    airport = list[0] || null;
  } catch {
    airport = null;
  }

  cache.set(code, airport);
  return airport;
}

/**
 * "SYD — Sydney Kingsford Smith (Sydney, AU)", degrading to just the code.
 */
function formatAirport(iata, airport) {
  const code = iata ? String(iata).toUpperCase() : 'unknown';
  if (!airport) return code;

  const place = [airport.city, airport.country_code].filter(Boolean).join(', ');
  const name = airport.name || null;
  if (name && place) return `${code} — ${name} (${place})`;
  if (name) return `${code} — ${name}`;
  if (place) return `${code} — ${place}`;
  return code;
}

module.exports = { lookupAirport, formatAirport };
