import React, { useState, useEffect } from 'react';
import { Ticket, Database, RefreshCw, Trash2, ShieldCheck, Terminal } from 'lucide-react';
import StatsOverview from './components/StatsOverview';
import FileUpload from './components/FileUpload';
import TicketTable from './components/TicketTable';
import SequenceExplainer from './components/SequenceExplainer';
import { fetchStats, clearDatabase, subscribeToProgress } from './services/api';

export default function App() {
  const [stats, setStats] = useState(null);
  const [lastBenchmark, setLastBenchmark] = useState(null);
  const [liveProgress, setLiveProgress] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('explorer'); // 'explorer' | 'sequence'

  const loadStats = async () => {
    try {
      const data = await fetchStats();
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    loadStats();

    // Subscribe to real-time Server-Sent Events (SSE)
    const unsubscribe = subscribeToProgress(
      (event) => {
        if (event.type === 'progress') {
          setLiveProgress(event.payload);
          if (event.payload.phase === 'completed') {
            loadStats();
            setRefreshTrigger((prev) => prev + 1);
          }
        }
      },
      (err) => {
        console.warn('SSE disconnected, falling back to on-demand polling.');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [refreshTrigger]);

  const handleImportCompleted = (summary) => {
    setLastBenchmark(summary);
    loadStats();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear all tickets from the database?')) {
      return;
    }
    try {
      await clearDatabase();
      loadStats();
      setRefreshTrigger((prev) => prev + 1);
      setLiveProgress(null);
    } catch (err) {
      alert(`Clear failed: ${err.message}`);
    }
  };

  const isDBConnected = stats?.database?.connected;

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Ticket size={24} />
          </div>
          <div>
            <div className="brand-title">TicketStream MERN</div>
            <div className="brand-subtitle">
              800,000 Records Streaming &bull; Unique Code Generator &bull; Custom Sequence Sorter
            </div>
          </div>
        </div>

        <div className="header-badges">
          <div className={`status-pill ${isDBConnected ? 'online' : 'fallback'}`}>
            <span className="pulse-dot" />
            <span>{isDBConnected ? 'MongoDB Connected' : 'In-Memory Fallback'}</span>
          </div>

          <button className="btn-secondary" onClick={loadStats} title="Refresh System Status">
            <RefreshCw size={14} /> Refresh
          </button>

          <button className="btn-danger" onClick={handleClearData} title="Purge all records for fresh benchmark">
            <Trash2 size={14} /> Clear Records
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <StatsOverview stats={stats} lastBenchmark={lastBenchmark} />

      {/* CSV Upload & Real-Time Ingestion */}
      <FileUpload onImportCompleted={handleImportCompleted} liveProgress={liveProgress} />

      {/* Navigation Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          <Database size={16} /> Ticket Explorer & Sequence View
        </button>
        <button
          className={`tab-btn ${activeTab === 'sequence' ? 'active' : ''}`}
          onClick={() => setActiveTab('sequence')}
        >
          <ShieldCheck size={16} /> Sequence & Algorithm Architecture
        </button>
      </div>

      {/* Sequence Explainer */}
      {activeTab === 'sequence' && (
        <SequenceExplainer sequencePreview={stats?.sequencePreview} />
      )}

      {/* Paginated Tickets Table */}
      <TicketTable refreshTrigger={refreshTrigger} />
    </div>
  );
}
