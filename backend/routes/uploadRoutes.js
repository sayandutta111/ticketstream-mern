/**
 * Upload & Streaming Ingestion Routes
 * Handles multipart file uploads, Server-Sent Events progress, and batch processing
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processCSVFile } = require('../services/csvProcessor');
const sseService = require('../services/sseService');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `tickets-${uniqueSuffix}.csv`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // Allow up to 500MB CSV files
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are supported.'));
    }
  }
});

/**
 * GET /api/upload/events
 * Real-time Server-Sent Events stream for live progress tracking
 */
router.get('/events', (req, res) => {
  sseService.addClient(res);
});

/**
 * GET /api/upload/progress
 * JSON polling fallback for progress
 */
router.get('/progress', (req, res) => {
  res.json({
    success: true,
    progress: sseService.getProgress()
  });
});

/**
 * POST /api/upload
 * Primary endpoint for uploading and streaming CSV records
 */
router.post('/', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No CSV file uploaded.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  try {
    console.log(`[Upload] Received CSV file: ${originalName} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Asynchronously begin streaming processing
    // We respond immediately or await depending on client preference,
    // but returning promise resolution ensures full audit report
    const summary = await processCSVFile(filePath);

    res.json({
      success: true,
      message: `File "${originalName}" successfully processed!`,
      summary
    });
  } catch (error) {
    console.error('[Upload] Error processing CSV:', error);
    // Cleanup on error
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
    res.status(500).json({
      success: false,
      error: `Processing error: ${error.message}`
    });
  }
});

/**
 * POST /api/upload/process-path
 * Process a file already present on the local filesystem (useful for 800,000 CLI generated files)
 */
router.post('/process-path', async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'File path is required.' });
  }

  // Resolve file path across project directory structures
  const candidatePaths = [
    filePath,
    path.resolve(process.cwd(), filePath),
    path.resolve(__dirname, '../..', filePath),
    path.resolve(__dirname, '../..', 'data', path.basename(filePath)),
    path.resolve(process.cwd(), 'data', path.basename(filePath)),
    path.resolve(process.cwd(), '..', 'data', path.basename(filePath))
  ];

  let resolvedPath = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      resolvedPath = p;
      break;
    }
  }

  if (!resolvedPath) {
    return res.status(400).json({
      success: false,
      error: `File path does not exist on server: ${filePath}`
    });
  }

  try {
    console.log(`[Upload] Processing direct path: ${resolvedPath}`);

    // Exact count hint for preset files
    let estimatedTotal = undefined;
    if (resolvedPath.includes('1k')) estimatedTotal = 1000;
    else if (resolvedPath.includes('10k')) estimatedTotal = 10000;
    else if (resolvedPath.includes('800k')) estimatedTotal = 800000;

    const summary = await processCSVFile(resolvedPath, { estimatedTotal });
    res.json({
      success: true,
      message: `Direct path processed successfully!`,
      summary
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/upload/preset/:type
 * Instant preset processing (1k, 10k, 800k) with automatic generation fallback
 */
router.post('/preset/:type', async (req, res) => {
  const { type } = req.params;
  const fileName = `tickets_${type}.csv`;

  const searchLocations = [
    path.join(__dirname, '../data', fileName),
    path.join(__dirname, '../../data', fileName),
    path.resolve(process.cwd(), 'data', fileName),
    path.resolve(process.cwd(), '../data', fileName)
  ];

  let targetPath = searchLocations.find((p) => fs.existsSync(p));

  try {
    const count = type === '800k' ? 800000 : type === '10k' ? 10000 : 1000;

    if (!targetPath) {
      const dest = path.resolve(__dirname, '../../data', fileName);
      const { generateCSV } = require('../../scripts/generate-csv');
      targetPath = await generateCSV(count, dest);
    }

    console.log(`[Upload] Processing preset "${type}": ${targetPath}`);
    const summary = await processCSVFile(targetPath, { estimatedTotal: count });
    res.json({
      success: true,
      message: `Preset "${type}" processed successfully!`,
      summary
    });
  } catch (error) {
    console.error(`[Upload] Preset error for ${type}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

