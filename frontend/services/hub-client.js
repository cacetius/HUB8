/**
 * API that internal applications use to request data from HUB.
 *
 * HUB.storage is a synchronous facade over this browsing context's native
 * localStorage. It deliberately keeps the browser storage area and keys intact;
 * storage operations cannot be proxied through postMessage without changing
 * the synchronous Web Storage contract used by legacy apps.
 */
(function (global) {
  function installHubClient(target, exposeBootstrap) {
    const API_VERSION = '1.0';
    const pending = new Map();
    let requestSequence = 0;

    function nativeStorage() {
      return target.localStorage;
    }

    const storage = {
      get length() {
        return nativeStorage().length;
      },
      key(index) {
        return nativeStorage().key(index);
      },
      getItem(key) {
        return nativeStorage().getItem(key);
      },
      setItem(key, value) {
        return nativeStorage().setItem(key, value);
      },
      removeItem(key) {
        return nativeStorage().removeItem(key);
      },
      clear() {
        return nativeStorage().clear();
      },
    };

    function send(type, payload) {
      return new Promise((resolve, reject) => {
        if (!target.parent || target.parent === target) {
          return reject(new Error('HUB.js: este app não está rodando dentro de um iframe do HUB.'));
        }

        const requestId = `req_${++requestSequence}_${Date.now()}`;
        pending.set(requestId, { resolve, reject });
        const targetOrigin = target.location.origin === 'null' ? '*' : target.location.origin;

        target.parent.postMessage(
          { source: 'hub-app', type, version: API_VERSION, requestId, payload },
          targetOrigin
        );

        setTimeout(() => {
          if (pending.has(requestId)) {
            pending.delete(requestId);
            reject(new Error(`HUB.js: timeout aguardando resposta de "${type}".`));
          }
        }, 8000);
      });
    }

    target.addEventListener('message', (event) => {
      if (event.source !== target.parent || event.origin !== target.location.origin) return;
      const message = event.data;
      if (!message || message.source !== 'hub-response' || !message.requestId) return;
      const request = pending.get(message.requestId);
      if (!request) return;
      pending.delete(message.requestId);
      if (message.error) request.reject(new Error(message.error));
      else request.resolve(message.payload);
    });

    const api = Object.assign(target.HUB || {}, { storage });

    if (target.parent && target.parent !== target) {
      Object.assign(api, {
        getOperators: () => send('GET_OPERATORS'),
        getOperations: () => send('GET_OPERATIONS'),
        getCurrentShift: () => send('GET_CURRENT_SHIFT'),
        getCurrentUser: () => send('GET_CURRENT_USER'),
        getConfig: () => send('GET_CONFIG'),
        notify: (message, level = 'info') => send('NOTIFY', { message, level }),
      });
    } else if (exposeBootstrap) {
      api.createFrameBootstrap = () => `(${installHubClient.toString()})(window, false);`;
    }

    target.HUB = api;
  }

  installHubClient(global, true);
})(window);
