jest.mock('../../backend/src/config/database', () => ({
  getDatabaseAdapter: jest.fn(),
}));

const { getDatabaseAdapter } = require('../../backend/src/config/database');
const { createApp } = require('../../backend/src/app');

describe('rotas de saúde', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
      server = undefined;
    }
  });

  async function get(path) {
    if (!server) {
      server = createApp().listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
    }
    return fetch(`http://127.0.0.1:${server.address().port}${path}`);
  }

  it('mantém health como liveness e readiness depende do banco', async () => {
    getDatabaseAdapter.mockReturnValue({ healthCheck: jest.fn().mockResolvedValue(true) });
    const health = await get('/health');
    const ready = await get('/ready');

    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok' });
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ status: 'ok' });
  });

  it('retorna 503 quando o banco não está pronto', async () => {
    getDatabaseAdapter.mockReturnValue({ healthCheck: jest.fn().mockResolvedValue(false) });
    const ready = await get('/ready');

    expect(ready.status).toBe(503);
    expect(await ready.json()).toEqual({ status: 'unavailable' });
  });
});
