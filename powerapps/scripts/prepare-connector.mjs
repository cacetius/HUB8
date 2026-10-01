import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.resolve(directory, '..', 'hub-api.swagger.yaml');
const defaultOutputPath = path.resolve(directory, '..', 'hub-api.generated.swagger.yaml');
const tenantIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function renderConnector({ template, apiBaseUrl, tenantId, apiClientId }) {
  let apiUrl;
  try {
    apiUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error('HUB_API_BASE_URL precisa ser uma URL HTTPS válida.');
  }

  if (apiUrl.protocol !== 'https:' || !apiUrl.hostname || apiUrl.username || apiUrl.password
      || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
    throw new Error('HUB_API_BASE_URL deve conter somente a origem HTTPS da API, sem caminho ou credenciais.');
  }
  if (!tenantIdPattern.test(tenantId)) {
    throw new Error('ENTRA_TENANT_ID precisa ser o GUID do tenant Microsoft Entra.');
  }
  if (!tenantIdPattern.test(apiClientId)) {
    throw new Error('ENTRA_API_CLIENT_ID precisa ser o GUID do aplicativo registrado para a API.');
  }

  const rendered = template
    .replaceAll('api.example.com', apiUrl.host)
    .replaceAll('{tenant-id}', tenantId)
    .replaceAll('{api-client-id}', apiClientId);

  if (/\{(?:tenant-id|api-client-id)\}|api\.example\.com/.test(rendered)) {
    throw new Error('O contrato ainda contém valores de exemplo não substituídos.');
  }

  const operationIds = [...rendered.matchAll(/^\s+operationId:\s*(\S+)\s*$/gm)]
    .map((match) => match[1]);
  if (operationIds.length === 0 || new Set(operationIds).size !== operationIds.length) {
    throw new Error('O contrato precisa ter operationId únicos para todas as operações.');
  }

  return rendered;
}

export async function prepareConnector({
  apiBaseUrl,
  tenantId,
  apiClientId,
  outputPath = defaultOutputPath,
}) {
  const template = await readFile(templatePath, 'utf8');
  const rendered = renderConnector({ template, apiBaseUrl, tenantId, apiClientId });
  const destination = path.resolve(outputPath);
  if (destination === templatePath) {
    throw new Error('O arquivo fonte do contrato não pode ser sobrescrito.');
  }
  await writeFile(destination, rendered, 'utf8');
  return destination;
}

async function main() {
  try {
    const output = await prepareConnector({
      apiBaseUrl: process.env.HUB_API_BASE_URL,
      tenantId: process.env.ENTRA_TENANT_ID,
      apiClientId: process.env.ENTRA_API_CLIENT_ID,
      outputPath: process.argv[2] || defaultOutputPath,
    });
    console.log(`Contrato preparado: ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
