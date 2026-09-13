#!/usr/bin/env node
'use strict';

/**
 * hotel-lookup.js — search Booking.com hotels through StayingAPI.
 *
 * Usage:
 *   node hotel-lookup.js "Melbourne"
 *   node hotel-lookup.js "Sydney Airport" --limit 3 --json
 */

const { searchHotels, StayingApiError } = require('./lib/stayingapi');

const DEFAULT_LIMIT = 3;

function usage() {
  return [
    'Usage: node hotel-lookup.js <destination> [--limit N] [--json]',
    '',
    'Examples:',
    '  node hotel-lookup.js "Melbourne"',
    '  node hotel-lookup.js "Sydney Airport" --limit 3',
    '  node hotel-lookup.js "Sibu" --json',
  ].join('\n');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const json = args.includes('--json');
  const positional = [];
  let limit = DEFAULT_LIMIT;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--json') continue;

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

  if (positional.length === 0) {
    throw new Error(`Please enter a city or airport.\n\n${usage()}`);
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new Error('--limit must be a whole number between 1 and 10.');
  }

  const destination = positional.join(' ').trim();

  if (destination.length < 2) {
    throw new Error('Please enter a valid destination.');
  }

  return { destination, limit, json };
}

function getHotelArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.hotels)) return response.hotels;
  return [];
}

function normaliseHotel(hotel) {
  return {
    id: hotel.id || hotel.propertyId || null,
    name: hotel.name || hotel.title || 'Unknown hotel',
    location:
      hotel.location?.name ||
      hotel.location?.address ||
      hotel.address ||
      hotel.city ||
      'Location unavailable',
    price: {
      nightly:
        hotel.price?.nightly ??
        hotel.pricePerNight ??
        hotel.nightlyPrice ??
        null,
      total:
        hotel.price?.total ??
        hotel.totalPrice ??
        null,
      currency:
        hotel.price?.currency ||
        hotel.currency ||
        'AUD',
    },
    rating: hotel.rating ?? hotel.reviewScore ?? null,
    bookingUrl: hotel.url || hotel.bookingUrl || null,
    platform: hotel.platform || 'booking',
  };
}

async function lookupHotels(destination, limit = DEFAULT_LIMIT) {
  const response = await searchHotels(destination, {
    limit,
    currency: 'AUD',
  });

  const hotels = getHotelArray(response)
    .slice(0, limit)
    .map(normaliseHotel);

  if (hotels.length === 0) {
    throw new StayingApiError(
      `No Booking.com hotels were found for "${destination}".`
    );
  }

  return {
    destination,
    provider: 'StayingAPI',
    platform: 'booking',
    hotels,
  };
}

function formatPrice(price) {
  if (price.nightly !== null) {
    return `${price.currency} ${price.nightly} per night`;
  }

  if (price.total !== null) {
    return `${price.currency} ${price.total} total`;
  }

  return 'Price unavailable';
}

function render(result) {
  const lines = [
    `Hotels near ${result.destination}`,
    `Provider: ${result.provider} (${result.platform})`,
    '',
  ];

  result.hotels.forEach((hotel, index) => {
    lines.push(
      `${index + 1}. ${hotel.name}`,
      `   Location: ${hotel.location}`,
      `   Price: ${formatPrice(hotel.price)}`,
      `   Rating: ${hotel.rating ?? 'Unavailable'}`,
      `   Link: ${hotel.bookingUrl || 'Unavailable'}`,
      ''
    );
  });

  return lines.join('\n').trimEnd();
}

async function main() {
  const options = parseArgs(process.argv);
  const result = await lookupHotels(options.destination, options.limit);

  console.log(
    options.json
      ? JSON.stringify(result, null, 2)
      : render(result)
  );
}

if (require.main === module) {
  main().catch((error) => {
    if (error instanceof StayingApiError) {
      console.error(`StayingAPI error: ${error.message}`);
    } else {
      console.error(`Error: ${error.message}`);
    }

    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  lookupHotels,
  normaliseHotel,
  render,
};