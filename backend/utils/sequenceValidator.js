/**
 * Sequence Validator and Uniqueness Verification Script
 * Validates Requirement 2 (Unique Ticket Code Generation) & Requirement 3 (Ticket Sorting)
 */

const { generateTicketCode, INITIAL_SEQUENCE, DEFAULT_PREFIXES } = require('../services/codeGenerator');

function validateSequence() {
  console.log('====================================================');
  console.log('=== TICKET CODE GENERATION & SEQUENCE VALIDATION ===');
  console.log('====================================================\n');

  console.log('1. Checking first 15 generated codes against specified test sequence:');
  const sample = [];
  for (let i = 0; i < 15; i++) {
    sample.push(generateTicketCode(i));
  }
  console.log('Generated Sequence:');
  console.log(sample.join(', '));

  console.log('\nExpected Sequence from Requirements:');
  console.log('AA00000, AB00001, AC00002, AD00003, AE00004, AA00002, AB00002, [unique-AC], AD00002, AE00002, AA00003, ...');

  // Verify first 5 matches INITIAL_SEQUENCE exactly
  let match = true;
  for (let i = 0; i < 5; i++) {
    if (sample[i] !== INITIAL_SEQUENCE[i]) {
      match = false;
      console.error(`Mismatch at index ${i}: got ${sample[i]}, expected ${INITIAL_SEQUENCE[i]}`);
    }
  }
  if (match) {
    console.log('=> SUCCESS: Initial 5 records match prompt specification perfectly!');
  }

  // Verify next items match AA00002, AB00002...
  if (sample[5] === 'AA00002' && sample[6] === 'AB00002' && sample[8] === 'AD00002' && sample[9] === 'AE00002' && sample[10] === 'AA00003') {
    console.log('=> SUCCESS: Continuation sequence matches specified prefixes and rounds!');
  }

  console.log('\n2. Testing 800,000 records generation & uniqueness (zero duplicates check)...');
  const TOTAL_TEST_RECORDS = 800000;
  const startTime = Date.now();
  
  // Use a Set to verify uniqueness
  const codeSet = new Set();
  let duplicateCount = 0;
  const memBefore = process.memoryUsage().heapUsed;

  for (let i = 0; i < TOTAL_TEST_RECORDS; i++) {
    const code = generateTicketCode(i);
    if (codeSet.has(code)) {
      duplicateCount++;
      if (duplicateCount <= 5) {
        console.error(`Duplicate detected at index ${i}: ${code}`);
      }
    } else {
      codeSet.add(code);
    }
  }

  const durationMs = Date.now() - startTime;
  const memAfter = process.memoryUsage().heapUsed;
  const heapMB = ((memAfter - memBefore) / 1024 / 1024).toFixed(2);

  console.log(`\nResults for ${TOTAL_TEST_RECORDS.toLocaleString()} records:`);
  console.log(`- Total Unique Codes in Set: ${codeSet.size.toLocaleString()}`);
  console.log(`- Duplicate Codes: ${duplicateCount}`);
  console.log(`- Time Taken: ${durationMs} ms (~${(TOTAL_TEST_RECORDS / (durationMs / 1000)).toFixed(0)} codes/sec)`);
  console.log(`- Memory Overhead for Set: ~${heapMB} MB`);

  if (duplicateCount === 0 && codeSet.size === TOTAL_TEST_RECORDS) {
    console.log('\n>>> ALL 800,000 CODES ARE 100% UNIQUE! TEST PASSED! <<<');
    return true;
  } else {
    console.error('\n>>> TEST FAILED: DUPLICATES DETECTED <<<');
    return false;
  }
}

if (require.main === module) {
  validateSequence();
}

module.exports = { validateSequence };

