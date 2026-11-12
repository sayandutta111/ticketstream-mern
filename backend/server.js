/**
 * Express Application Server
 * Entrypoint for MERN Stack Ticket Management System
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB, getDBStatus } = require('./config/db');
const ticketRoutes = require('./routes/ticketRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: getDBStatus(),
    memoryUsage: process.memoryUsage(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// API Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/upload', uploadRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server & Connect Database
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  Ticket Management Backend running on port ${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`  Tickets API:  http://localhost:${PORT}/api/tickets`);
    console.log(`  Upload API:   http://localhost:${PORT}/api/upload`);
    console.log(`=================================================`);
  });
}

startServer();

module.exports = app;

