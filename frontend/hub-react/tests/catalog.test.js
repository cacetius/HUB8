import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryCounts, filterApps, mapApp, normalizeText, responseData } from '../src/catalog.js';

const apps = [
  mapApp({
    ID: 1,
    NAME: 'Gestão da Operação',
    SUBTITLE: 'Acompanhar produção',
    DESCRIPTION: 'Painel de chão de fábrica',
    CATEGORY: 'Operação',
    URL: '/ops',
  }),
  mapApp({ id: 2, name: 'Auditoria', category: 'auditoria', url: 'https://example.test' }),
];

test('normalizes Portuguese diacritics and case for search', () => {
  assert.equal(normalizeText('Operação Ágil'), 'operacao agil');
  assert.deepEqual(filterApps(apps, 'operacao'), [apps[0]]);
  assert.deepEqual(filterApps(apps, 'FABRICA'), [apps[0]]);
});

test('filters by category and returns category counts', () => {
  assert.deepEqual(filterApps(apps, '', 'auditoria'), [apps[1]]);
  assert.equal(categoryCounts(apps).get('operacao'), 1);
  assert.equal(categoryCounts(apps).get('auditoria'), 1);
});

test('accepts both normalized API fields and the standard response envelope', () => {
  assert.equal(mapApp({ NAME: 'Teste', CATEGORY: 'Operação' }).categoryId, 'operacao');
  assert.deepEqual(responseData({ success: true, data: { token: 'session' } }), { token: 'session' });
  assert.throws(() => responseData({ success: false, message: 'Falha' }), /Falha/);
});
