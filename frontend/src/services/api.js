/**
 * API Service Client for Ticket Backend
 */

import axios from 'axios';

const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 300000 // 5 minutes timeout for large file uploads
});

export async function fetchTickets(params = {}) {
  const response = await apiClient.get('/tickets', { params });
  return response.data;
}

export async function fetchStats() {
  const response = await apiClient.get('/tickets/stats');
  return response.data;
}

export async function clearDatabase() {
  const response = await apiClient.delete('/tickets/clear');
  return response.data;
}

export async function uploadCSV(file, onUploadProgress) {
  const formData = new FormData();
  formData.append('csvFile', file);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    }
  });
  return response.data;
}

export async function processServerFile(filePath) {
  const response = await apiClient.post('/upload/process-path', { filePath });
  return response.data;
}

export function subscribeToProgress(onMessage, onError) {
  const eventSource = new EventSource(`${API_BASE}/upload/events`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    } catch (err) {
      console.error('SSE JSON parse error:', err);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}
