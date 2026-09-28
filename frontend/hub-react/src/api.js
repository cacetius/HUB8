import { mapApp, responseData } from './catalog.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1')
  .trim()
  .replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(path, { token, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(`Não foi possível conectar à API (${API_BASE_URL}).`, 0);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(`Resposta inválida da API (HTTP ${response.status}).`, response.status);
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || `Falha na solicitação (HTTP ${response.status}).`,
      response.status,
    );
  }
  return responseData(payload);
}

export async function fetchApps(token) {
  const apps = [];
  let page = 1;
  let total = Infinity;

  while (apps.length < total) {
    const result = await apiRequest(`/apps?page=${page}&pageSize=100`, { token });
    const rows = Array.isArray(result) ? result : result?.rows;
    if (!Array.isArray(rows)) throw new ApiError('Formato inesperado na lista de aplicativos.', 200);
    apps.push(...rows.map(mapApp));
    total = Number(result?.total ?? apps.length);
    if (!rows.length || page * 100 >= total) break;
    page += 1;
  }
  return apps;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
