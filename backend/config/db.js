/**
 * MongoDB Database Connection Manager
 * Optimized for high-throughput batch operations on 800,000 records
 */

const mongoose = require('mongoose');

let isConnected = false;

const DB_CONFIG = {
  maxPoolSize: 50,          // Maintain up to 50 concurrent socket connections
  minPoolSize: 5,           // Keep at least 5 connections ready
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4                 // Force IPv4 to prevent IPv6 DNS resolution lag
};

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ticket_management';

  try {
    const conn = await mongoose.connect(uri, DB_CONFIG);
    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB] Connection failed to ${uri}: ${error.message}`);
    console.warn(`[MongoDB] Running with in-memory fallback store until MongoDB is available.`);
    isConnected = false;
    return null;
  }
}

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('[MongoDB] Connection established.');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] Disconnected.');
});

function getDBStatus() {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    readyStateText: ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'][mongoose.connection.readyState] || 'Unknown',
    host: mongoose.connection.host || null,
    port: mongoose.connection.port || null,
    name: mongoose.connection.name || null
  };
}

module.exports = {
  connectDB,
  getDBStatus,
  mongoose
};
