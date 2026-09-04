'use strict';

require('dotenv').config({ quiet: true });

const BASE_URL = 'https://airlabs.co/api/v9';

/**
 * Thrown when Airlabs answers with an error object instead of flight data.
 * Airlabs usually still replies HTTP 200 in that case, so the body is the
 * only place the failure shows up.
 */
class AirlabsError extends Error {
  constructor(message, { key, code, endpoint } = {}) {
    super(message);
    this.name = 'AirlabsError';
    this.key = key;
    this.code = code;
    this.endpoint = endpoint;
  }
}

function apiKey() {
  const key = process.env.AIRLABS_API_KEY;
  if (!key) {
    throw new AirlabsError(
      'AIRLABS_API_KEY is not set. Copy .env.example to .env and add your key.'
    );
  }
  return key;
}

/**
 * Call an Airlabs endpoint and return its `response` payload.
 *
 * @param {string} endpoint e.g. "flight" or "schedules"
 * @param {Record<string, string>} params query parameters, api_key excluded
 */
async function airlabsRequest(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(name, value);
    }
  }
  url.searchParams.set('api_key', apiKey());

  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (cause) {
    throw new AirlabsError(`Could not reach Airlabs: ${cause.message}`, { endpoint });
  }

  const raw = await res.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new AirlabsError(
      `Airlabs returned a non-JSON response (HTTP ${res.status}): ${raw.slice(0, 200)}`,
      { endpoint }
    );
  }

  // Airlabs signals failures with an `error` object, often alongside HTTP 200.
  if (body && body.error) {
    const { message, code, key } = body.error;
    throw new AirlabsError(message || 'Unknown Airlabs error', { key, code, endpoint });
  }

  if (!res.ok) {
    throw new AirlabsError(`Airlabs request failed with HTTP ${res.status}`, { endpoint });
  }

  if (body.response === undefined) {
    throw new AirlabsError('Airlabs response did not contain a `response` field', { endpoint });
  }

  return body.response;
}

module.exports = { airlabsRequest, AirlabsError, BASE_URL };
