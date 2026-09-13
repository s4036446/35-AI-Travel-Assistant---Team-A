'use strict';

const assert = require('node:assert/strict');
const {
  parseArgs,
  normaliseHotel,
  render,
} = require('../hotel-lookup');

function runTests() {
  const options = parseArgs([
    'node',
    'hotel-lookup.js',
    'Sydney',
    'Airport',
    '--limit',
    '3',
    '--json',
  ]);

  assert.deepEqual(options, {
    destination: 'Sydney Airport',
    limit: 3,
    json: true,
  });

  assert.throws(
    () => parseArgs(['node', 'hotel-lookup.js']),
    /Please enter a city or airport/
  );

  assert.throws(
    () =>
      parseArgs([
        'node',
        'hotel-lookup.js',
        'Melbourne',
        '--limit',
        '0',
      ]),
    /between 1 and 10/
  );

  const hotel = normaliseHotel({
    id: 'hotel-1',
    name: 'Accessible Test Hotel',
    address: 'Melbourne, Australia',
    price: {
      nightly: 180,
      currency: 'AUD',
    },
    rating: 8.5,
    url: 'https://www.booking.com/test',
    platform: 'booking',
  });

  assert.deepEqual(hotel, {
    id: 'hotel-1',
    name: 'Accessible Test Hotel',
    location: 'Melbourne, Australia',
    price: {
      nightly: 180,
      total: null,
      currency: 'AUD',
    },
    rating: 8.5,
    bookingUrl: 'https://www.booking.com/test',
    platform: 'booking',
  });

  const output = render({
    destination: 'Melbourne',
    provider: 'StayingAPI',
    platform: 'booking',
    hotels: [hotel],
  });

  assert.match(output, /Accessible Test Hotel/);
  assert.match(output, /AUD 180 per night/);
  assert.match(output, /booking/);

  console.log('All hotel lookup tests passed.');
}

runTests();