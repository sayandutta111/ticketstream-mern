/**
 * Code Generator & Sequence Engine for Tickets
 * 
 * Requirement 2: Unique Ticket Code Generation
 * - Generate and assign a unique alphanumeric code to each ticket.
 * - Ensure no duplicate ticket codes are generated.
 * 
 * Requirement 3: Ticket Sorting
 * - Sequence: AA00000, AB00001, AC00002, AD00003, AE00004, AA00002, AB00002, AC00002, AD00002, AE00002, AA00003, ...
 * - Works efficiently for 800,000+ records with zero duplicates.
 */

const DEFAULT_PREFIXES = ['AA', 'AB', 'AC', 'AD', 'AE'];

// Explicit prompt sequence tokens specified in the problem statement
const INITIAL_SEQUENCE = [
  'AA00000',
  'AB00001',
  'AC00002',
  'AD00003',
  'AE00004'
];

/**
 * Generates a unique ticket code for a given 0-based sequence index.
 * Strictly adheres to the problem statement:
 * Index 0..4: AA00000, AB00001, AC00002, AD00003, AE00004
 * Index 5..9: AA00002, AB00002, AC00002 (de-duplicated), AD00002, AE00002
 * Index 10:   AA00003, ...
 * 
 * De-duplication guarantee:
 * If a generated code would collide with an already assigned initial code
 * (e.g. AC00002 was assigned at index 2), an offset is deterministically
 * applied for that slot so that all 800,000 records have 100% UNIQUE codes.
 *
 * @param {number} index - 0-based sequential record index
 * @param {string[]} prefixes - Array of prefix letters (defaults to ['AA', 'AB', 'AC', 'AD', 'AE'])
 * @returns {string} Unique alphanumeric ticket code
 */
function generateTicketCode(index, prefixes = DEFAULT_PREFIXES) {
  if (index < INITIAL_SEQUENCE.length) {
    return INITIAL_SEQUENCE[index];
  }

  const offsetIndex = index - INITIAL_SEQUENCE.length; // index starting from 0 for the continuation
  const prefixIndex = offsetIndex % prefixes.length;
  const prefix = prefixes[prefixIndex];
  
  // Round number starts at 2 (since index 5 is AA00002, AB00002...)
  let roundNum = Math.floor(offsetIndex / prefixes.length) + 2;

  // Format code with 5-digit zero padding (expands if roundNum exceeds 99999)
  let code = `${prefix}${String(roundNum).padStart(5, '0')}`;

  // De-duplication check against initial sequence
  // If this code was already assigned in the initial sequence (e.g. AC00002 or AD00003 or AE00004),
  // append an alphanumeric discriminator (e.g. 'A') so it is guaranteed 100% unique
  // and will never collide with any 5-digit sequential number.
  if (INITIAL_SEQUENCE.includes(code)) {
    code = `${code}A`;
  }

  return code;
}

/**
 * Standard Interleaved Round-Robin code generator:
 * Round 0: AA00000, AB00000, AC00000, AD00000, AE00000
 * Round 1: AA00001, AB00001, AC00001, AD00001, AE00001
 * Round 2: AA00002, AB00002, AC00002, AD00002, AE00002
 * Round 3: AA00003, AB00003, AC00003, AD00003, AE00003
 */
function generateRoundRobinCode(index, prefixes = DEFAULT_PREFIXES) {
  const prefix = prefixes[index % prefixes.length];
  const roundNum = Math.floor(index / prefixes.length);
  return `${prefix}${String(roundNum).padStart(5, '0')}`;
}

/**
 * Parses a ticket code into its prefix and numeric components
 * e.g. "AA00002" -> { prefix: "AA", number: 2, rawNumber: "00002" }
 */
function parseTicketCode(code) {
  if (!code || typeof code !== 'string') {
    return { prefix: '', number: 0, rawNumber: '' };
  }
  const match = code.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return { prefix: code, number: 0, rawNumber: '' };
  }
  return {
    prefix: match[1],
    number: parseInt(match[2], 10),
    rawNumber: match[2]
  };
}

/**
 * Sequence comparator for sorting an array of ticket objects
 * Sorts according to sequenceIndex first; if absent, computes sequence order.
 */
function compareTicketsBySequence(a, b) {
  // If sequenceIndex is stored, compare directly (O(1) comparison)
  if (typeof a.sequenceIndex === 'number' && typeof b.sequenceIndex === 'number') {
    return a.sequenceIndex - b.sequenceIndex;
  }

  const codeA = a.ticketCode || '';
  const codeB = b.ticketCode || '';

  // Check initial sequence membership
  const initIdxA = INITIAL_SEQUENCE.indexOf(codeA);
  const initIdxB = INITIAL_SEQUENCE.indexOf(codeB);

  if (initIdxA !== -1 && initIdxB !== -1) {
    return initIdxA - initIdxB;
  }
  if (initIdxA !== -1) return -1;
  if (initIdxB !== -1) return 1;

  // Otherwise sort by round number, then by prefix order
  const parsedA = parseTicketCode(codeA);
  const parsedB = parseTicketCode(codeB);

  if (parsedA.number !== parsedB.number) {
    return parsedA.number - parsedB.number;
  }

  const pIndexA = DEFAULT_PREFIXES.indexOf(parsedA.prefix);
  const pIndexB = DEFAULT_PREFIXES.indexOf(parsedB.prefix);

  if (pIndexA !== -1 && pIndexB !== -1 && pIndexA !== pIndexB) {
    return pIndexA - pIndexB;
  }

  return parsedA.prefix.localeCompare(parsedB.prefix);
}

module.exports = {
  DEFAULT_PREFIXES,
  INITIAL_SEQUENCE,
  generateTicketCode,
  generateRoundRobinCode,
  parseTicketCode,
  compareTicketsBySequence
};
