/**
 * HUB.js — API oficial que os aplicativos internos (VCP, LIP, 5S, VTP,
 * Versatilidade, Rotativa, Smart Flow, Monitor KPI) usam para conversar
 * com o HUB, em vez de ler localStorage diretamente (item 17 do escopo).
 *
 * Protocolo: postMessage com envelope { type, version, requestId, payload },
 * validado contra a origem do HUB pai. Ver docs/APP_INTEGRATION.md.
 *
 * Uso dentro de um app (ex.: vcp-monitor.html):
 *   <script src="/services/hub-client.js"></script>
 *   const operators = await HUB.getOperators();
 */
(function (global) {
  const API_VERSION = '1.0';
  const pending = new Map();
  let requestSeq = 0;

  function send(type, payload) {
    return new Promise((resolve, reject) => {
      if (!global.parent || global.parent === global) {
        return reject(new Error('HUB.js: este app não está rodando dentro de um iframe do HUB.'));
      }
      const requestId = `req_${++requestSeq}_${Date.now()}`;
      pending.set(requestId, { resolve, reject });

      global.parent.postMessage(
        { source: 'hub-app', type, version: API_VERSION, requestId, payload },
        '*' // o HUB (pai) valida a origem do lado dele antes de aceitar comandos de volta
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
    const msg = event.data;
    if (!msg || msg.source !== 'hub-response' || !msg.requestId) return;
    const handler = pending.get(msg.requestId);
    if (!handler) return;
    pending.delete(msg.requestId);
    if (msg.error) handler.reject(new Error(msg.error));
    else handler.resolve(msg.payload);
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
