/**
 * Ticket API Routes
 * Endpoints for querying, paginating, searching, and managing ticket records
 */

const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { getFallbackStore } = require('../services/csvProcessor');
const { getDBStatus } = require('../config/db');

/**
 * GET /api/tickets
 * Query paginated tickets with filtering, searching, and sequence sorting
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { search, priority, status, sortBy = 'sequenceIndex', order = 'asc' } = req.query;

    const dbStatus = getDBStatus();

    if (dbStatus.connected) {
      // Build MongoDB query
      const query = {};

      if (priority && priority !== 'All') {
        query.priority = priority;
      }

      if (status && status !== 'All') {
        query.status = status;
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { ticketCode: regex },
          { customerName: regex },
          { customerEmail: regex },
          { subject: regex },
          { originalTicketId: regex }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;

      const [tickets, total] = await Promise.all([
        Ticket.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        Ticket.countDocuments(query).exec()
      ]);

      return res.json({
        success: true,
        data: tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        source: 'MongoDB'
      });
    }

    // In-memory fallback
    const fallbackStore = getFallbackStore();
    let filtered = [...fallbackStore.tickets];

    if (priority && priority !== 'All') {
      filtered = filtered.filter((t) => t.priority === priority);
    }
    if (status && status !== 'All') {
      filtered = filtered.filter((t) => t.status === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.ticketCode && t.ticketCode.toLowerCase().includes(q)) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          (t.customerEmail && t.customerEmail.toLowerCase().includes(q)) ||
          (t.subject && t.subject.toLowerCase().includes(q))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'desc' ? valB - valA : valA - valB;
      }
      return order === 'desc'
        ? String(valB).localeCompare(String(valA))
        : String(valA).localeCompare(String(valB));
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return res.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      source: 'In-Memory Fallback Store'
    });
  } catch (error) {
    console.error('[Ticket API] Query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tickets/stats
 * Aggregate metrics and health status
 */
router.get('/stats', async (req, res) => {
  try {
    const dbStatus = getDBStatus();

    if (dbStatus.connected) {
      const [totalCount, priorityAgg, statusAgg, firstSequence] = await Promise.all([
        Ticket.estimatedDocumentCount().exec(),
        Ticket.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
        Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Ticket.find({}, { ticketCode: 1, sequenceIndex: 1, customerName: 1 })
          .sort({ sequenceIndex: 1 })
          .limit(10)
          .lean()
          .exec()
      ]);

      const priorityCounts = {};
      priorityAgg.forEach((item) => {
        priorityCounts[item._id] = item.count;
      });

      const statusCounts = {};
      statusAgg.forEach((item) => {
        statusCounts[item._id] = item.count;
      });

      return res.json({
        success: true,
        totalTickets: totalCount,
        priorityCounts,
        statusCounts,
        sequencePreview: firstSequence,
        database: dbStatus
      });
    }

    // In-memory fallback
    const fallbackStore = getFallbackStore();
    const tickets = fallbackStore.tickets;

    const priorityCounts = {};
    const statusCounts = {};

    tickets.forEach((t) => {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    return res.json({
      success: true,
      totalTickets: tickets.length,
      priorityCounts,
      statusCounts,
      sequencePreview: tickets.slice(0, 10).map((t) => ({
        ticketCode: t.ticketCode,
        sequenceIndex: t.sequenceIndex,
        customerName: t.customerName
      })),
      database: dbStatus
    });
  } catch (error) {
    console.error('[Ticket API] Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/tickets/clear
 * Purges tickets collection instantly via dropCollection (O(1)) and recreates indexes
 */
router.delete('/clear', async (req, res) => {
  try {
    const dbStatus = getDBStatus();
    let deletedCount = 0;

    if (dbStatus.connected) {
      try {
        deletedCount = await Ticket.estimatedDocumentCount();
        await Ticket.collection.drop();
      } catch (dropErr) {
        // If collection doesn't exist (NamespaceNotFound code 26), ignore
        if (dropErr.code !== 26) {
          const delRes = await Ticket.deleteMany({});
          deletedCount = delRes.deletedCount;
        }
      }
      // Re-create collection and indexes immediately for next ingestion
      await Ticket.createCollection();
      await Ticket.syncIndexes();
    } else {
      const fallback = getFallbackStore();
      deletedCount = fallback.tickets.length;
      fallback.tickets = [];
    }

    // Reset SSE progress
    const sseService = require('../services/sseService');
    sseService.reset();

    res.json({
      success: true,
      message: `Cleared ${deletedCount.toLocaleString()} ticket records.`,
      deletedCount
    });
  } catch (error) {
    console.error('[Ticket API] Clear error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

