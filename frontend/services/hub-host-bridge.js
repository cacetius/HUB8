/**
 * Recebe no HUB as solicitações enviadas pelos aplicativos internos.
 * Só processa mensagens vindas de origens autorizadas. O armazenamento legado
 * não passa por esta ponte: HUB.storage precisa permanecer síncrono e usa o
 * localStorage do próprio iframe, preservando os mesmos dados e chaves.
 */
export function createHubBridge({ allowedOrigins, getApiToken, apiBaseUrl }) {
  async function fetchFromApi(path) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Authorization: `Bearer ${getApiToken()}` },
    });
    const body = await response.json();
    if (!body.success) throw new Error(body.message);
    return body.data;
  }

  const handlers = {
    GET_OPERATORS: () => fetchFromApi('/operators?pageSize=100'),
    GET_OPERATIONS: () => fetchFromApi('/operations?pageSize=100'),
    GET_CURRENT_SHIFT: () => fetchFromApi('/shifts/current'),
    GET_CURRENT_USER: () => fetchFromApi('/auth/me'),
    GET_CONFIG: () => fetchFromApi('/dashboard/summary'),
    NOTIFY: async (payload) => {
      console.info('[HUB notify from app]', payload);
      return { received: true };
    },
  };

  function respond(sourceWindow, targetOrigin, requestId, payload, error) {
    sourceWindow.postMessage({ source: 'hub-response', requestId, payload, error }, targetOrigin);
  }

  window.addEventListener('message', async (event) => {
    if (!event.source || !allowedOrigins.includes(event.origin)) return;
    const message = event.data;
    if (
      !message ||
      message.source !== 'hub-app' ||
      typeof message.type !== 'string' ||
      typeof message.requestId !== 'string'
    ) {
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(handlers, message.type)) {
      return respond(
        event.source,
        event.origin,
        message.requestId,
        null,
        `Tipo de mensagem desconhecido: ${message.type}`
      );
    }

    try {
      const handleRequest = handlers[message.type];
      const payload = await handleRequest(message.payload);
      respond(event.source, event.origin, message.requestId, payload, null);
    } catch {
      respond(
        event.source,
        event.origin,
        message.requestId,
        null,
        'Falha ao processar solicitação.'
      );
    }
  });
}
