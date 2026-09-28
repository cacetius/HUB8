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

O padrão é `http://localhost:3000/api/v1`. A API deve estar executando, com
banco configurado, usuário criado e a permissão `apps.view` atribuída. Entre
com uma conta real da API; não há credenciais de demonstração.

## Build e testes

```powershell
npm test
npm run build
```

`VITE_API_BASE_URL` também pode ser informado no ambiente antes do build. Não
coloque segredos nessa variável: valores Vite são públicos no bundle.
