# APP_INTEGRATION.md

Como migrar um app interno (VCP, LIP, 5S, VTP, Versatilidade, Rotativa, Smart Flow, Monitor KPI)
para parar de ler `localStorage` do HUB diretamente e passar a usar `HUB.js`.

## 1. Estrutura de pastas

Cada app vira uma pasta própria em `/apps/<nome-do-app>/`, com seu próprio HTML/JS/CSS. O HUB
continua abrindo o app num `<iframe src="/apps/vcp/index.html">`.

## 2. No app: incluir o client

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

## 3. No HUB: incluir a ponte

```js
import { createHubBridge } from './services/hub-host-bridge.js';

createHubBridge({
  allowedOrigins: ['https://apps.seudominio.local'], // NUNCA usar '*' em produção
  getApiToken: () => sessionStorage.getItem('hub_token'),
  apiBaseUrl: '/api/v1',
});
```

## 4. Protocolo de mensagens

Requisição (app → HUB):
```json
{ "source": "hub-app", "type": "GET_OPERATORS", "version": "1.0", "requestId": "req_1_...", "payload": null }
```

Resposta (HUB → app):
```json
{ "source": "hub-response", "requestId": "req_1_...", "payload": [...], "error": null }
```

Mensagens que não seguem exatamente esse formato, ou vêm de uma origem fora de `allowedOrigins`,
são descartadas silenciosamente — nunca processadas (item 18 do escopo: "não aceitar mensagens arbitrárias").

## 5. Migração incremental

Não é preciso migrar os 8 apps de uma vez. Cada app pode continuar como está até ser adaptado —
o HUB 8 não quebra apps antigos que ainda leem `localStorage` local deles mesmos (dados que são
do próprio app, não do HUB). O que muda é apenas a fonte dos dados que **vêm do HUB**
(operadores, operações, turno, usuário logado).
