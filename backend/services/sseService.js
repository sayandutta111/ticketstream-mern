/**
 * Server-Sent Events (SSE) Progress Service
 * Provides real-time streaming progress to the React frontend
 */

class SSEService {
  constructor() {
    this.clients = new Set();
    this.latestProgress = {
      phase: 'idle',
      totalRecords: 0,
      processed: 0,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      percentage: 0,
      speed: 0,
      elapsedMs: 0,
      etaSeconds: 0,
      message: 'System ready.'
    };
  }

  addClient(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial state immediately
    res.write(`data: ${JSON.stringify({ type: 'progress', payload: this.latestProgress })}\n\n`);

    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(type, payload) {
    if (type === 'progress') {
      this.latestProgress = { ...this.latestProgress, ...payload };
    }
    const message = `data: ${JSON.stringify({ type, payload })}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getProgress() {
    return this.latestProgress;
  }

  reset() {
    this.latestProgress = {
      phase: 'idle',
      totalRecords: 0,
      processed: 0,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      percentage: 0,
      speed: 0,
      elapsedMs: 0,
      etaSeconds: 0,
      message: 'Ready for new import.'
    };
    this.broadcast('progress', this.latestProgress);
  }
}

const sseService = new SSEService();

module.exports = sseService;

