/**
 * SPTech API Client
 */

export const API_BASE = '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('sptech_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('sptech_token', token);
}

export function removeStoredToken() {
  localStorage.removeItem('sptech_token');
  localStorage.removeItem('sptech_user');
}

export function getStoredUser() {
  const u = localStorage.getItem('sptech_user');
  return u ? JSON.parse(u) : null;
}

export function setStoredUser(user: any) {
  localStorage.setItem('sptech_user', JSON.stringify(user));
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}
