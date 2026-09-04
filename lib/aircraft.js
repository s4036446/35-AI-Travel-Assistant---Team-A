'use strict';

/**
 * Airlabs returns an ICAO aircraft type designator (e.g. "B789") on flight and
 * schedule records, but no manufacturer or marketing name. This table resolves
 * the designators for the types a travel assistant is most likely to meet.
 * Anything missing falls back to a prefix rule, then to the raw designator.
 */
const TYPES = {
  A19N: ['Airbus', 'A319neo'],
  A20N: ['Airbus', 'A320neo'],
  A21N: ['Airbus', 'A321neo'],
  A318: ['Airbus', 'A318'],
  A319: ['Airbus', 'A319'],
  A320: ['Airbus', 'A320'],
  A321: ['Airbus', 'A321'],
  A332: ['Airbus', 'A330-200'],
  A333: ['Airbus', 'A330-300'],
  A339: ['Airbus', 'A330-900neo'],
  A342: ['Airbus', 'A340-200'],
  A343: ['Airbus', 'A340-300'],
  A346: ['Airbus', 'A340-600'],
  A359: ['Airbus', 'A350-900'],
  A35K: ['Airbus', 'A350-1000'],
  A388: ['Airbus', 'A380-800'],
  AT72: ['ATR', 'ATR 72'],
  AT75: ['ATR', 'ATR 72-500'],
  AT76: ['ATR', 'ATR 72-600'],
  B38M: ['Boeing', '737 MAX 8'],
  B39M: ['Boeing', '737 MAX 9'],
  B3XM: ['Boeing', '737 MAX 10'],
  B712: ['Boeing', '717-200'],
  B733: ['Boeing', '737-300'],
  B734: ['Boeing', '737-400'],
  B737: ['Boeing', '737-700'],
  B738: ['Boeing', '737-800'],
  B739: ['Boeing', '737-900'],
  B744: ['Boeing', '747-400'],
  B748: ['Boeing', '747-8'],
  B752: ['Boeing', '757-200'],
  B763: ['Boeing', '767-300'],
  B764: ['Boeing', '767-400'],
  B772: ['Boeing', '777-200'],
  B77L: ['Boeing', '777-200LR'],
  B773: ['Boeing', '777-300'],
  B77W: ['Boeing', '777-300ER'],
  B788: ['Boeing', '787-8 Dreamliner'],
  B789: ['Boeing', '787-9 Dreamliner'],
  B78X: ['Boeing', '787-10 Dreamliner'],
  BCS1: ['Airbus', 'A220-100'],
  BCS3: ['Airbus', 'A220-300'],
  CRJ2: ['Bombardier', 'CRJ200'],
  CRJ7: ['Bombardier', 'CRJ700'],
  CRJ9: ['Bombardier', 'CRJ900'],
  DH8A: ['De Havilland Canada', 'Dash 8-100'],
  DH8C: ['De Havilland Canada', 'Dash 8-300'],
  DH8D: ['De Havilland Canada', 'Dash 8-400'],
  E170: ['Embraer', 'E170'],
  E75L: ['Embraer', 'E175'],
  E190: ['Embraer', 'E190'],
  E195: ['Embraer', 'E195'],
  E290: ['Embraer', 'E190-E2'],
  E295: ['Embraer', 'E195-E2'],
  MD11: ['Boeing', 'MD-11'],
  SB20: ['Saab', '2000'],
  SF34: ['Saab', '340'],
};

const PREFIX_MANUFACTURERS = [
  [/^A[0-9]/, 'Airbus'],
  [/^B[0-9]/, 'Boeing'],
  [/^E[0-9]/, 'Embraer'],
  [/^AT[0-9]/, 'ATR'],
  [/^CRJ/, 'Bombardier'],
  [/^DH8/, 'De Havilland Canada'],
];

/**
 * Resolve an ICAO type designator into { code, model, manufacturer }.
 * Values that cannot be resolved come back as null rather than a guess.
 *
 * @param {string|null|undefined} icaoType e.g. "B789"
 * @param {{model?: string, manufacturer?: string}} [hints]
 *   Fields Airlabs occasionally includes on the record; they win over the table.
 */
function describeAircraft(icaoType, hints = {}) {
  const code = icaoType ? String(icaoType).toUpperCase() : null;
  const [tableManufacturer, tableModel] = (code && TYPES[code]) || [];

  let manufacturer = hints.manufacturer || tableManufacturer || null;
  if (!manufacturer && code) {
    const match = PREFIX_MANUFACTURERS.find(([pattern]) => pattern.test(code));
    manufacturer = match ? match[1] : null;
  }

  return {
    code,
    model: hints.model || tableModel || null,
    manufacturer,
  };
}

module.exports = { describeAircraft, TYPES };
