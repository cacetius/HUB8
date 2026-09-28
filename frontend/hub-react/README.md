# HUB React

Frontend React isolado para o HUB 8. Usa o CSS visual existente em
`apps/legacy/hub-ui.css` sem alterar os arquivos legados.

## Desenvolvimento

```powershell
cd frontend\hub-react
npm install
Copy-Item .env.example .env
# Ajuste VITE_API_BASE_URL para a URL da API (raiz /api/v1).
npm run dev
```

O padrão é `http://localhost:3000/api/v1`. Enquanto a entrega integrada não
está concluída, a tela inicial abre automaticamente o HUB legado em modo
temporário, sem formulário de login. O React autenticado continua disponível
para sessões válidas previamente estabelecidas; a API permanece protegida.

O build também publica o HUB legado e seus recursos ao lado do frontend para
que a prévia temporária funcione em produção. Ela mantém os dados locais no
navegador e não os envia para a API.

## Build e testes

```powershell
npm test
npm run build
```

`VITE_API_BASE_URL` também pode ser informado no ambiente antes do build. Não
coloque segredos nessa variável: valores Vite são públicos no bundle.
