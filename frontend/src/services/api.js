/**
 * Centralized API service for MATRIX Weapon Detection System.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = BASE_URL.replace(/^http/, 'ws');

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error('Backend offline');
  return res.json();
}

export async function detectImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  let res;
  try {
    res = await fetch(`${BASE_URL}/api/detect/image`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Detection timed out after 120 seconds');
    }
    throw new Error(`Cannot reach backend at ${BASE_URL}`);
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Detection failed');
  return data;
}

export function resolveImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/detect/video`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Upload failed');
  return data;
}

export async function getVideoStatus(jobId) {
  const res = await fetch(`${BASE_URL}/api/detect/video/${jobId}/status`);
  if (!res.ok) throw new Error('Failed to get job status');
  return res.json();
}

export async function getVideoResult(jobId) {
  const res = await fetch(`${BASE_URL}/api/detect/video/${jobId}/result`);
  if (!res.ok) throw new Error('Result not ready');
  return res.json();
}

export async function stopVideo(jobId) {
  const res = await fetch(`${BASE_URL}/api/detect/video/${jobId}/stop`, {
    method: 'POST',
  });
  return res.json();
}

export function getWebcamWsUrl() {
  return `${WS_BASE}/ws/detect/webcam`;
}

export { BASE_URL };
