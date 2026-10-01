import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';
import { renderConnector } from './prepare-connector.mjs';

const templatePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'hub-api.swagger.yaml');
const template = await readFile(templatePath, 'utf8');
const configuration = {
  template,
  apiBaseUrl: 'https://hub-api.factory.example',
  tenantId: '12345678-1234-1234-1234-123456789abc',
  apiClientId: 'abcdefab-cdef-abcd-efab-cdefabcdefab',
};

test('renders a tenant-specific connector without placeholders', () => {
  const result = renderConnector(configuration);

  assert.match(result, /^host: hub-api\.factory\.example$/m);
  assert.match(result, /login\.microsoftonline\.com\/12345678-1234-1234-1234-123456789abc\/oauth2\/v2\.0\/authorize/);
  assert.match(result, /api:\/\/abcdefab-cdef-abcd-efab-cdefabcdefab\/user_impersonation/);
  assert.doesNotMatch(result, /api\.example\.com|\{tenant-id\}|\{api-client-id\}/);
});

test('rejects non-HTTPS URLs, URL paths, and invalid Entra identifiers', () => {
  assert.throws(() => renderConnector({ ...configuration, apiBaseUrl: 'http://hub-api.factory.example' }));
  assert.throws(() => renderConnector({ ...configuration, apiBaseUrl: 'https://hub-api.factory.example/api' }));
  assert.throws(() => renderConnector({ ...configuration, tenantId: 'tenant-name' }));
  assert.throws(() => renderConnector({ ...configuration, apiClientId: 'client-name' }));
});
