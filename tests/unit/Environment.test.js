const { loadEnv } = require('../../backend/src/config/env');

describe('configuração do ambiente', () => {
  it('recusa iniciar em produção sem segredos e banco definidos', () => {
    expect(() => loadEnv({ APP_ENV: 'production' })).toThrow('DB_HOST');
  });

  it('exige origens HTTPS explícitas em produção', () => {
    const production = {
      APP_ENV: 'production',
      DATABASE_PROVIDER: 'sqlserver',
      DB_HOST: 'db.factory.local',
      DB_PORT: '1433',
      DB_NAME: 'hub8',
      DB_USER: 'hub_service',
      DB_PASSWORD: 'unique-factory-password',
      JWT_SECRET: 'a-unique-production-secret-with-more-than-32-characters',
    };

    expect(() => loadEnv(production)).toThrow('ALLOWED_APP_ORIGINS');
    expect(loadEnv({
      ...production,
      ALLOWED_APP_ORIGINS: 'https://hub.factory.local',
    }).ALLOWED_APP_ORIGINS).toEqual(['https://hub.factory.local']);
    expect(() => loadEnv({
      ...production,
      ALLOWED_APP_ORIGINS: 'http://hub.factory.local',
    })).toThrow('Origem não permitida');
  });

  it('rejeita porta de banco inválida e provedor desconhecido', () => {
    expect(() => loadEnv({ DATABASE_PROVIDER: 'oracle' })).toThrow('DATABASE_PROVIDER');
    expect(() => loadEnv({ DB_PORT: 'abc' })).toThrow('DB_PORT');
  });
});
