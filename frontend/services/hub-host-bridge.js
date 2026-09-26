/**
 * Contraparte de hub-client.js, roda no HUB (página que contém o <iframe>
 * do app). Valida origem, tipo e payload antes de responder — nunca aceita
 * mensagens arbitrárias (item 18 do escopo).
 *
 * Uso no HUB:
 *   import { createHubBridge } from './services/hub-host-bridge.js';
 *   createHubBridge({
 *     allowedOrigins: ['https://apps.seudominio.local'],
 *     getApiToken: () => currentSessionToken,
 *     apiBaseUrl: '/api/v1',
 *   });
 */
export function createHubBridge({ allowedOrigins, getApiToken, apiBaseUrl }) {
  async function authedFetch(path) {
    const res = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Authorization: `Bearer ${getApiToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
  }

  const handlers = {
    GET_OPERATORS: () => authedFetch('/operators?pageSize=100'),
    GET_OPERATIONS: () => authedFetch('/operations?pageSize=100'),
    GET_CURRENT_SHIFT: () => authedFetch('/shifts/current'),
    GET_CURRENT_USER: () => authedFetch('/auth/me'),
    GET_CONFIG: () => authedFetch('/dashboard/summary'),
    NOTIFY: async (payload) => {
      // eslint-disable-next-line no-console
      console.info('[HUB notify from app]', payload);
      return { received: true };
    },
  };

  function respond(sourceWindow, targetOrigin, requestId, payload, error) {
    sourceWindow.postMessage({ source: 'hub-response', requestId, payload, error }, targetOrigin);
  }

  window.addEventListener('message', async (event) => {
    if (!allowedOrigins.includes(event.origin)) return; // descarta silenciosamente origem não confiável
    const msg = event.data;
    if (!msg || msg.source !== 'hub-app' || !msg.type || !msg.requestId) return;

    const handler = handlers[msg.type];
    if (!handler) {
      return respond(event.source, event.origin, msg.requestId, null, `Tipo de mensagem desconhecido: ${msg.type}`);
    }

    try {
      const payload = await handler(msg.payload);
      respond(event.source, event.origin, msg.requestId, payload, null);
    } catch (e) {
      respond(event.source, event.origin, msg.requestId, null, 'Falha ao processar solicitação.');
    }
  });
}
