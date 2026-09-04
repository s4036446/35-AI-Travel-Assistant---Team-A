'use strict';

const HH_MM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Parse "HH:MM" into minutes past midnight. Throws on anything else. */
function parseClockTime(value) {
  const match = HH_MM.exec(String(value).trim());
  if (!match) {
    throw new Error(`"${value}" is not a time in HH:MM form (e.g. 09:05 or 21:40).`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Minutes past midnight for an Airlabs timestamp ("YYYY-MM-DD HH:MM" or
 * "HH:MM"), or null when the value is missing or unparseable.
 */
function minutesFromTimestamp(value) {
  if (!value) return null;
  const match = /(\d{1,2}):(\d{2})/.exec(String(value));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Distance in minutes between two times of day, taking the shorter way round
 * the clock — 23:50 is 20 minutes from 00:10, not 1420.
 */
function clockDistance(a, b) {
  const raw = Math.abs(a - b);
  return Math.min(raw, 1440 - raw);
}

/** 95 -> "1h 35m", 40 -> "40m", 0 -> "on time". */
function formatOffset(minutes) {
  if (minutes === 0) return 'exact match';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const magnitude = hours ? `${hours}h ${rest}m` : `${rest}m`;
  return `${magnitude} away`;
}

/**
 * True when an Airlabs unix timestamp (seconds) is already in the past.
 *
 * Airlabs' `dep_time` is local *airport* time, so it cannot be compared against
 * the clock on this machine without knowing the airport's zone — parsing it with
 * `new Date()` silently assumes the machine's own offset and is wrong for every
 * airport outside it. `dep_time_ts` is an absolute unix timestamp, so use that.
 *
 * Unknown or malformed values return false: a row we cannot place in time is
 * kept rather than silently dropped.
 */
function isPastUnix(seconds, now = Date.now()) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return false;
  return seconds * 1000 < now;
}

module.exports = {
  parseClockTime,
  minutesFromTimestamp,
  clockDistance,
  formatOffset,
  isPastUnix,
};
