/**
 * API que os aplicativos internos usam para pedir dados ao HUB.
 * As mensagens seguem o protocolo descrito em docs/APP_INTEGRATION.md.
 *
 * Inclua este arquivo no aplicativo e use, por exemplo:
 *   const operators = await HUB.getOperators();
 */
(function (global) {
  const API_VERSION = '1.0';
  const pending = new Map();
  let requestSequence = 0;

  function send(type, payload) {
    return new Promise((resolve, reject) => {
      if (!global.parent || global.parent === global) {
        return reject(new Error('HUB.js: este app não está rodando dentro de um iframe do HUB.'));
      }
      const requestId = `req_${++requestSequence}_${Date.now()}`;
      pending.set(requestId, { resolve, reject });

      global.parent.postMessage(
        { source: 'hub-app', type, version: API_VERSION, requestId, payload },
        '*'
      );

      setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId);
          reject(new Error(`HUB.js: timeout aguardando resposta de "${type}".`));
        }
      }, 8000);
    });
  }

  global.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.source !== 'hub-response' || !message.requestId) return;
    const request = pending.get(message.requestId);
    if (!request) return;
    pending.delete(message.requestId);
    if (message.error) request.reject(new Error(message.error));
    else request.resolve(message.payload);
  });

  global.HUB = {
    getOperators: () => send('GET_OPERATORS'),
    getOperations: () => send('GET_OPERATIONS'),
    getCurrentShift: () => send('GET_CURRENT_SHIFT'),
    getCurrentUser: () => send('GET_CURRENT_USER'),
    getConfig: () => send('GET_CONFIG'),
    notify: (message, level = 'info') => send('NOTIFY', { message, level }),
  };
})(window);
