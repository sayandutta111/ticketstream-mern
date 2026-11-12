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
      trim: true,
      index: true
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Unknown'
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    subject: {
      type: String,
      trim: true,
      default: 'General Inquiry'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    importedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound indexes for common queries
ticketSchema.index({ sequenceIndex: 1, ticketCode: 1 });
ticketSchema.index({ priority: 1, status: 1 });
ticketSchema.index({ importedAt: -1, sequenceIndex: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;

