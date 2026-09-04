'use strict';

const { airlabsRequest } = require('./airlabs');

const cache = new Map();

/**
 * Resolve an airline IATA code to its name, or null if unknown. Like the
 * airport lookup this never throws: the code alone is still a usable answer.
 *
 * @param {string} iata
 * @returns {Promise<string|null>}
 */
async function lookupAirlineName(iata) {
  if (!iata) return null;
  const code = String(iata).toUpperCase();
  if (cache.has(code)) return cache.get(code);

  let name = null;
  try {
    const response = await airlabsRequest('airlines', { iata_code: code });
    const list = Array.isArray(response) ? response : [response];
    name = (list[0] && list[0].name) || null;
  } catch {
    name = null;
  }

  cache.set(code, name);
  return name;
}

/** Resolve many codes at once, returning a Map of code -> name|null. */
async function lookupAirlineNames(codes) {
  const unique = [...new Set(codes.filter(Boolean).map((c) => String(c).toUpperCase()))];
  const names = await Promise.all(unique.map(lookupAirlineName));
  return new Map(unique.map((code, i) => [code, names[i]]));
}

module.exports = { lookupAirlineName, lookupAirlineNames };
