/**
 * High-Speed CSV Generator for Machine Test Evaluation
 * Generates up to 800,000 realistic ticket records using buffered streaming
 * 
 * Usage:
 *   node scripts/generate-csv.js [recordCount] [outputFileName]
 * Examples:
 *   node scripts/generate-csv.js 800000 data/tickets_800k.csv
 *   node scripts/generate-csv.js 10000 data/tickets_10k.csv
 *   node scripts/generate-csv.js 1000 data/tickets_1k.csv
 */

const fs = require('fs');
const path = require('path');

const RECORD_COUNT = parseInt(process.argv[2], 10) || 800000;
const OUTPUT_FILE = process.argv[3] || `data/tickets_${RECORD_COUNT >= 1000 ? `${RECORD_COUNT / 1000}k` : RECORD_COUNT}.csv`;

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Sam', 'Chris', 'Pat', 'Jamie', 'Robin', 'Sayan', 'Narottam', 'Priya', 'Amit', 'Rohit', 'Elena', 'Lucas', 'Liam', 'Emma', 'Olivia'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Sarkar', 'Dutta', 'Patel', 'Sharma', 'Chatterjee', 'Banerjee', 'Ghosh', 'Mukherjee'];
const DOMAINS = ['example.com', 'techcorp.io', 'mailservice.net', 'company.org', 'cloudhub.dev'];
const SUBJECTS = [
  'Login authentication failure with SSO',
  'Payment transaction failed on checkout',
  'Slow database query response in dashboard',
  'Account password reset link expired',
  'Unable to download monthly PDF invoice',
  'Webhook integration returning 500 error',
  'Mobile app crash on ticket submission',
  'Feature request: dark mode toggle',
  'API rate limit reached unexpectedly',
  'Incorrect billing calculation on renewal',
  'Two-factor authentication code not received',
  'CSV bulk export timing out'
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

async function generateCSV() {
  const fullPath = path.resolve(process.cwd(), OUTPUT_FILE);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`====================================================`);
  console.log(`  Generating ${RECORD_COUNT.toLocaleString()} Ticket Records`);
  console.log(`  Destination: ${fullPath}`);
  console.log(`====================================================`);

  const startTime = Date.now();
  const writeStream = fs.createWriteStream(fullPath, {
    highWaterMark: 1024 * 1024 // 1MB buffer for extreme write speed
  });

  // CSV Header
  writeStream.write('ticketId,customerName,customerEmail,subject,priority,status,createdAt\n');

  let i = 0;

  function write() {
    let ok = true;
    while (i < RECORD_COUNT && ok) {
      i++;
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i % 997}@${DOMAINS[i % DOMAINS.length]}`;
      const subject = SUBJECTS[i % SUBJECTS.length];
      const priority = PRIORITIES[i % PRIORITIES.length];
      const status = STATUSES[i % STATUSES.length];
      const date = new Date(Date.now() - (i % 30) * 86400000).toISOString().split('T')[0];

      const row = `TCK-${String(i).padStart(7, '0')},"${name}","${email}","${subject}",${priority},${status},${date}\n`;

      if (i === RECORD_COUNT) {
        writeStream.write(row);
      } else {
        ok = writeStream.write(row);
      }

      if (i % 100000 === 0) {
        process.stdout.write(`\rGenerated: ${i.toLocaleString()} / ${RECORD_COUNT.toLocaleString()} rows...`);
      }
    }

    if (i < RECORD_COUNT) {
      writeStream.once('drain', write);
    } else {
      writeStream.end();
    }
  }

  write();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      const fileSizeMB = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);
      console.log(`\nDone! Created ${RECORD_COUNT.toLocaleString()} records in ${durationSec}s (${fileSizeMB} MB).`);
      resolve(fullPath);
    });
    writeStream.on('error', reject);
  });
}

if (require.main === module) {
  generateCSV().catch((err) => {
    console.error('Generation error:', err);
    process.exit(1);
  });
}

module.exports = { generateCSV };
