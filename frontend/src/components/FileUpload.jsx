import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Play, RefreshCw, Cpu } from 'lucide-react';
import { uploadCSV, processServerFile } from '../services/api';

export default function FileUpload({ onImportCompleted, liveProgress }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [summary, setSummary] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setStatusMessage(null);
      } else {
        setStatusMessage({ type: 'error', text: 'Please select a valid CSV file (.csv).' });
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setStatusMessage(null);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: `Uploading and streaming "${selectedFile.name}"...` });
    setSummary(null);

    try {
      const res = await uploadCSV(selectedFile);
      setIsProcessing(false);
      setSummary(res.summary);
      setStatusMessage({
        type: 'success',
        text: `Success! ${res.summary.totalProcessed.toLocaleString()} records processed in ${res.summary.totalDurationSec} (${res.summary.averageSpeed}).`
      });
      if (onImportCompleted) onImportCompleted(res.summary);
    } catch (err) {
      setIsProcessing(false);
      setStatusMessage({
        type: 'error',
        text: `Import failed: ${err.response?.data?.error || err.message}`
      });
    }
  };

  const handleProcessServerPreset = async (fileName, label) => {
    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: `Streaming preset "${label}" into MongoDB...` });
    setSummary(null);

    try {
      const fullPath = `data/${fileName}`;
      const res = await processServerFile(fullPath);
      setIsProcessing(false);
      setSummary(res.summary);
      setStatusMessage({
        type: 'success',
        text: `Success! ${res.summary.totalProcessed.toLocaleString()} records processed in ${res.summary.totalDurationSec} (${res.summary.averageSpeed})!`
      });
      if (onImportCompleted) onImportCompleted(res.summary);
    } catch (err) {
      setIsProcessing(false);
      setStatusMessage({
        type: 'error',
        text: `Server preset processing failed: ${err.response?.data?.error || err.message}`
      });
    }
  };

  // Determine active progress display
  const progressPercent = liveProgress?.percentage || 0;
  const isStreamingLive = liveProgress && liveProgress.phase && liveProgress.phase !== 'idle' && liveProgress.phase !== 'completed';

  return (
    <div className="upload-card">
      <div
        className={`dropzone ${isDragging ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv"
          style={{ display: 'none' }}
        />
        <UploadCloud className="dropzone-icon" />
        <div className="dropzone-title">
          {selectedFile ? selectedFile.name : 'Upload Tickets CSV (Supports 800,000 records)'}
        </div>
        <div className="dropzone-desc">
          {selectedFile
            ? `File size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click "Start Processing" below`
            : 'Drag & drop your CSV file here, or click to browse from your computer'}
        </div>

        {selectedFile && (
          <div style={{ marginTop: 12 }}>
            <button
              className="btn-primary"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                handleUploadAndProcess();
              }}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={16} className="spin" /> Processing CSV...
                </>
              ) : (
                <>
                  <Play size={16} /> Start Processing & Import
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Real-time Progress Bar */}
      {(isProcessing || isStreamingLive) && (
        <div className="progress-card">
          <div className="progress-header">
            <span className="progress-title">
              <Cpu size={18} color="#06b6d4" />
              {liveProgress?.message || 'Processing and inserting records...'}
            </span>
            <span className="progress-percentage">{progressPercent}%</span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="progress-stats-row">
            <div className="stat-item">
              <span className="stat-label">Processed</span>
              <span className="stat-val">{(liveProgress?.processed || 0).toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Inserted</span>
              <span className="stat-val" style={{ color: '#34d399' }}>
                {(liveProgress?.inserted || 0).toLocaleString()}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Throughput</span>
              <span className="stat-val" style={{ color: '#38bdf8' }}>
                {(liveProgress?.speed || 0).toLocaleString()} rec/sec
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Elapsed / ETA</span>
              <span className="stat-val">
                {Math.round((liveProgress?.elapsedMs || 0) / 1000)}s / {liveProgress?.etaSeconds || 0}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div
          style={{
            marginTop: 18,
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
            fontWeight: 600,
            backgroundColor:
              statusMessage.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : statusMessage.type === 'error'
                ? 'rgba(244, 63, 94, 0.15)'
                : 'rgba(99, 102, 241, 0.15)',
            border:
              statusMessage.type === 'success'
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : statusMessage.type === 'error'
                ? '1px solid rgba(244, 63, 94, 0.3)'
                : '1px solid rgba(99, 102, 241, 0.3)',
            color:
              statusMessage.type === 'success'
                ? '#34d399'
                : statusMessage.type === 'error'
                ? '#fb7185'
                : '#a5b4fc'
          }}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle size={18} />
          ) : statusMessage.type === 'error' ? (
            <AlertTriangle size={18} />
          ) : (
            <RefreshCw size={18} className="spin" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Fast Presets for Machine Test Demonstration */}
      <div className="presets-container">
        <div>
          <div className="preset-title">Instant Machine Test Evaluation Presets:</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Direct streaming from pre-generated datasets without browser network upload overhead
          </div>
        </div>
        <div className="preset-buttons">
          <button
            className="btn-secondary"
            disabled={isProcessing}
            onClick={() => handleProcessServerPreset('tickets_1k.csv', '1,000 Records')}
          >
            <FileText size={14} /> 1,000 Rows (Sample)
          </button>
          <button
            className="btn-secondary"
            disabled={isProcessing}
            onClick={() => handleProcessServerPreset('tickets_10k.csv', '10,000 Records')}
          >
            <FileText size={14} /> 10,000 Rows (Fast)
          </button>
          <button
            className="btn-primary"
            style={{ backgroundColor: '#4f46e5' }}
            disabled={isProcessing}
            onClick={() => handleProcessServerPreset('tickets_800k.csv', '800,000 Records')}
          >
            <Zap size={14} color="#38bdf8" /> Full 800,000 Records Stress Test
          </button>
        </div>
      </div>
    </div>
  );
}
