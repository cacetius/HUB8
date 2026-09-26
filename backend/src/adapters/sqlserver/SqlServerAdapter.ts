import { IDatabaseAdapter, QueryResult, PaginatedResult } from '../DatabaseAdapter';

/**
 * Adapter para Microsoft SQL Server usando `mssql` (driver Tedious).
 * NÃO TESTADO CONTRA INSTÂNCIA REAL neste ambiente — validar em dev antes de produção.
 */
export class SqlServerAdapter implements IDatabaseAdapter {
  private pool: any;
  private config: any;

  constructor(config: { host: string; port: string | number; database: string; user: string; password: string; encrypt?: boolean }) {
    this.config = {
      server: config.host,
      port: Number(config.port),
      database: config.database,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.encrypt ?? true,
        trustServerCertificate: process.env.APP_ENV !== 'production',
      },
      pool: { min: 1, max: 10 },
    };
  }

  async connect(): Promise<void> {
    const mssql = require('mssql');
    this.pool = await new mssql.ConnectionPool(this.config).connect();
  }

  async disconnect(): Promise<void> {
    if (this.pool) await this.pool.close();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1 AS OK');
      return true;
    } catch {
      return false;
    }
  }

  private toRequest(params: any[]) {
    const req = this.pool.request();
    params.forEach((val, idx) => req.input(`p${idx}`, val));
    return req;
  }

  /** Converte SQL com placeholders `?` (padrão do projeto) para @p0, @p1... do mssql */
  private toNamedSql(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `@p${i++}`);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const req = this.toRequest(params);
    const result = await req.query(this.toNamedSql(sql));
    return { rows: result.recordset as T[], rowCount: result.recordset.length };
  }

  async execute(sql: string, params: any[] = []): Promise<{ affectedRows: number; insertId?: number | string }> {
    const req = this.toRequest(params);
    const result = await req.query(this.toNamedSql(sql));
    return {
      affectedRows: result.rowsAffected?.[0] ?? 0,
      insertId: result.recordset?.[0]?.ID,
    };
  }

  async paginate<T = any>(
    baseSql: string,
    params: any[],
    page: number,
    pageSize: number,
    orderBy: string
  ): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * pageSize;
    const pagedSql = `${baseSql} ORDER BY ${orderBy} OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
    const countSql = `SELECT COUNT(*) AS TOTAL FROM (${baseSql}) AS T`;

    const [dataResult, countResult] = await Promise.all([
      this.query<T>(pagedSql, params),
      this.query<{ TOTAL: number }>(countSql, params),
    ]);

    return {
      rows: dataResult.rows,
      total: Number(countResult.rows[0]?.TOTAL ?? 0),
      page,
      pageSize,
    };
  }

  async transaction<T>(fn: (trx: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const mssql = require('mssql');
    const trx = new mssql.Transaction(this.pool);
    await trx.begin();
    try {
      const trxAdapter: IDatabaseAdapter = {
        ...this,
        query: async (sql: string, params: any[] = []) => {
          const req = new mssql.Request(trx);
          params.forEach((v, i) => req.input(`p${i}`, v));
          const result = await req.query(this.toNamedSql(sql));
          return { rows: result.recordset, rowCount: result.recordset.length };
        },
        execute: async (sql: string, params: any[] = []) => {
          const req = new mssql.Request(trx);
          params.forEach((v, i) => req.input(`p${i}`, v));
          const result = await req.query(this.toNamedSql(sql));
          return { affectedRows: result.rowsAffected?.[0] ?? 0 };
        },
      } as IDatabaseAdapter;

      const result = await fn(trxAdapter);
      await trx.commit();
      return result;
    } catch (e) {
      await trx.rollback();
      throw e;
    }
  }
}
