import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, ArrowUpDown } from 'lucide-react';
import { fetchTickets } from '../services/api';

export default function TicketTable({ refreshTrigger }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('All');
  const [status, setStatus] = useState('All');
  const [order, setOrder] = useState('asc');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchTickets({
        page,
        limit,
        search,
        priority,
        status,
        sortBy: 'sequenceIndex',
        order
      });

      if (res.success) {
        setTickets(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit, priority, status, order]);

  useEffect(() => {
    setPage(1);
    loadData();
  }, [refreshTrigger]);

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleSortOrder = () => {
    setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="table-card">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by code, customer, email, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <Filter size={14} /> Priority:
          </div>
          <select
            className="select-filter"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            className="select-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <button className="btn-secondary" onClick={toggleSortOrder} title="Toggle Sequence Sort Direction">
            <ArrowUpDown size={14} /> Sequence: {order.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Seq #</th>
              <th>Generated Ticket Code</th>
              <th>Original ID</th>
              <th>Customer Name</th>
              <th>Customer Email</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  Loading ticket sequence data...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No tickets found. Upload a CSV file or load a preset above to populate records.
                </td>
              </tr>
            ) : (
              tickets.map((t, idx) => {
                const prefix = t.ticketCode?.substring(0, 2);
                const rest = t.ticketCode?.substring(2);
                const priorityClass = `badge-priority-${(t.priority || 'medium').toLowerCase()}`;
                const statusClass = `badge-status-${(t.status || 'open').toLowerCase().replace(/\s+/g, '')}`;
                const seqNumber = t.sequenceIndex != null ? t.sequenceIndex + 1 : (page - 1) * limit + idx + 1;

                return (
                  <tr key={t.ticketCode || t._id}>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>
                      #{seqNumber}
                    </td>
                    <td>
                      <span className="code-badge mono">
                        <span className="code-prefix">{prefix}</span>
                        <span className="code-num">{rest}</span>
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12.5, color: '#94a3b8' }}>
                      {t.originalTicketId || 'N/A'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.customerName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.customerEmail}</td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.subject}>
                      {t.subject}
                    </td>
                    <td>
                      <span className={`badge ${priorityClass}`}>{t.priority}</span>
                    </td>
                    <td>
                      <span className={`badge ${statusClass}`}>{t.status}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="pagination-bar">
        <div>
          Showing{' '}
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            {total > 0 ? (page - 1) * limit + 1 : 0}
          </span>{' '}
          to{' '}
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            {Math.min(page * limit, total)}
          </span>{' '}
          of{' '}
          <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>
            {total.toLocaleString()}
          </span>{' '}
          tickets in sequence
        </div>

        <div className="pagination-controls">
          <select
            className="select-filter"
            style={{ padding: '4px 8px', fontSize: 12 }}
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <button
            className="page-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage(1)}
            title="First Page"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            className="page-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>

          <span className="page-indicator">
            Page {page} of {totalPages || 1}
          </span>

          <button
            className="page-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            title="Next Page"
          >
            <ChevronRight size={14} />
          </button>
          <button
            className="page-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(totalPages)}
            title="Last Page"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

