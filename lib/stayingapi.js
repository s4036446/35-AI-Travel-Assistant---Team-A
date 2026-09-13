'use strict';

require('dotenv').config({ quiet: true });

const BASE_URL = 'https://api.stayingapi.com/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_WAIT_MS = 300_000;
const POLL_INTERVAL_MS = 3_000;

class StayingApiError extends Error {
  constructor(message, status = null, code = null) {
    super(message);
    this.name = 'StayingApiError';
    this.status = status;
    this.code = code;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestJson(path, params = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const apiKey = process.env.STAYINGAPI_KEY;

  if (!apiKey) {
    throw new StayingApiError(
      'STAYINGAPI_KEY is missing. Add it to your .env file.'
    );
  }

  const url = new URL(`${BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    let body;

    try {
      body = await response.json();
    } catch {
      throw new StayingApiError(
        `StayingAPI returned an unreadable response.`,
        response.status
      );
    }

    if (!response.ok && response.status !== 202) {
      const message =
        body?.error?.message ||
        body?.message ||
        `Request failed with HTTP ${response.status}.`;

      throw new StayingApiError(
        message,
        response.status,
        body?.error?.code || null
      );
    }

    return {
      status: response.status,
      body,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new StayingApiError(
        `StayingAPI request timed out after ${timeoutMs / 1000} seconds.`
      );
    }

    if (error instanceof StayingApiError) {
      throw error;
    }

    throw new StayingApiError(`Unable to contact StayingAPI: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForJob(jobId, maxWaitMs = DEFAULT_MAX_WAIT_MS) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    await sleep(POLL_INTERVAL_MS);

    const { body } = await requestJson(`/jobs/${encodeURIComponent(jobId)}`);
    const status = body?.data?.status;

    if (status === 'completed') {
      return {
        data: body.data.result,
        meta: body.meta || {},
      };
    }

    if (status === 'failed') {
      throw new StayingApiError(
        body?.data?.error?.message ||
          body?.error?.message ||
          'The StayingAPI search job failed.'
      );
    }

    if (status !== 'pending' && status !== 'running') {
      throw new StayingApiError(
        `Unexpected StayingAPI job status: ${status || 'missing'}.`
      );
    }
  }

  throw new StayingApiError(
    `StayingAPI did not finish within ${maxWaitMs / 1000} seconds.`
  );
}

async function searchHotels(location, options = {}) {
  const { status, body } = await requestJson('/search', {
    location,
    platforms: 'booking',
    limit: options.limit || 3,
    currency: options.currency || 'AUD',
  });

  if (status === 202) {
    const jobId = body?.data?.jobId;

    if (!jobId) {
      throw new StayingApiError(
        'StayingAPI returned 202 without a job ID.'
      );
    }

    console.error('Search is still processing. Waiting for results...');
    return waitForJob(jobId);
  }

  return body;
}

module.exports = {
  searchHotels,
  StayingApiError,
};