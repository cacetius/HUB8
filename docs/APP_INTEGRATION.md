# Integração de aplicativos internos com o HUB.js

O `frontend/services/hub-client.js` disponibiliza a API `HUB` para aplicativos
internos. Ela oferece chamadas assíncronas ao HUB e a fachada síncrona de
armazenamento local `HUB.storage`.

## Armazenamento legado

`HUB.storage` implementa a interface Web Storage (`getItem`, `setItem`,
`removeItem`, `clear`, `key` e `length`) sobre o `localStorage` do próprio
iframe. As operações são síncronas e mantêm os mesmos nomes de chave e os
mesmos valores já existentes no navegador. Não há cópia remota, importação,
limpeza automática nem alteração de esquema de banco de dados.

Use a fachada para ler e gravar dados persistidos pelo aplicativo:

```js
const state = JSON.parse(HUB.storage.getItem('app_state') || '{}');
HUB.storage.setItem('app_state', JSON.stringify(state));
```

Chaves calculadas continuam sendo aceitas sem transformação:

```js
const key = `vw_q_${date}`;
const value = HUB.storage.getItem(key);
```

O host legado `apps/legacy/HUB_7_v3-2.html` carrega o cliente compartilhado e
injeta seu bootstrap antes do código dos dez aplicativos embutidos e dos
aplicativos HTML enviados pelo usuário. Os nove aplicativos do catálogo e o
Cartão Monitor mantêm suas chaves atuais. Versatilidade continua usando
IndexedDB; sua persistência não é redirecionada.

O armazenamento não é enviado por `postMessage`: essa ponte é assíncrona e não
pode preservar o contrato síncrono esperado pelos aplicativos. O cliente
delegará as operações à área `localStorage` já usada por cada iframe.

O host legado injeta o cliente para oferecer `HUB.storage`, mas não ativa as
chamadas remotas da ponte sem a configuração de autenticação e origens
autorizadas do ambiente. `HUB.getOperators()` e métodos semelhantes exigem que
o host configure `createHubBridge` conforme a seção abaixo.

## Chamadas assíncronas ao HUB

```html
<script src="/services/hub-client.js"></script>
<script>
  async function init() {
    const operators = await HUB.getOperators();
    const shift = await HUB.getCurrentShift();
    const user = await HUB.getCurrentUser();
    // ... renderizar
  }
  init();
</script>
```

No host, configure a ponte apenas com origens explicitamente autorizadas:

```js
import { createHubBridge } from './services/hub-host-bridge.js';

createHubBridge({
  allowedOrigins: ['https://apps.seudominio.local'],
  getApiToken: () => sessionStorage.getItem('hub_token'),
  apiBaseUrl: '/api/v1',
});
```

A ponte processa somente mensagens `hub-app` dessas origens e responde à janela
que enviou cada solicitação. Não use `'*'` em `allowedOrigins`.

## Protocolo de mensagens

```json
{
  "source": "hub-app",
  "type": "GET_OPERATORS",
  "version": "1.0",
  "requestId": "req_1_...",
  "payload": null
}
```

Resposta:

```json
{
  "source": "hub-response",
  "requestId": "req_1_...",
  "payload": [],
  "error": null
}
```
