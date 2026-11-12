/**
 * Ticket Document Model (Mongoose)
 * Schema optimized for high-performance indexing, sorting, and fast bulk ingestion
 */

const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    sequenceIndex: {
      type: Number,
      required: true,
      index: true
    },
    originalTicketId: {
      type: String,
      trim: true
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Unknown'
    },
    customerEmail: {
      type: String,
      trim: true,
      default: ''
    },
    subject: {
      type: String,
      trim: true,
      default: 'General'
    },
    priority: {
      type: String,
      default: 'Medium'
    },
    status: {
      type: String,
      default: 'Open'
    },
    importedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

// Only maintain primary unique & sequence indexes to stay well within free tier storage limits
const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;

