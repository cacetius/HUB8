import { IDatabaseAdapter, QueryResult, PaginatedResult } from '../DatabaseAdapter';

/**
 * Adapter para IBM DB2 usando o driver `ibm_db` (binding oficial do
 * IBM Data Server Driver for ODBC and CLI).
 *
 * Requer as bibliotecas cliente do DB2 instaladas no host (ou o pacote
 * `ibm_db` já as inclui via node-gyp em builds recentes — ver docs/DEPLOYMENT.md).
 *
 * NÃO TESTADO CONTRA INSTÂNCIA REAL neste ambiente — validar em dev antes de produção.
 */
export class Db2Adapter implements IDatabaseAdapter {
  private pool: any;
  private connStr: string;

  constructor(config: { host: string; port: string | number; database: string; user: string; password: string }) {
    this.connStr =
      `DATABASE=${config.database};HOSTNAME=${config.host};PORT=${config.port};` +
      `PROTOCOL=TCPIP;UID=${config.user};PWD=${config.password};`;
  }

  async connect(): Promise<void> {
    // Import tardio: evita exigir o driver nativo quando DATABASE_PROVIDER=sqlserver
    const ibmdb = require('ibm_db');
    this.pool = new ibmdb.Pool();
    // valida que a pool consegue abrir/fechar uma conexão
    await new Promise<void>((resolve, reject) => {
      this.pool.open(this.connStr, (err: any, conn: any) => {
        if (err) return reject(err);
        this.pool.close(conn, () => resolve());
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.pool?.closeAll) {
      await new Promise<void>((resolve) => this.pool.closeAll(() => resolve()));
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
      return true;
    } catch {
      return false;
    }
  }

  private withConnection<T>(fn: (conn: any) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pool.open(this.connStr, async (err: any, conn: any) => {
        if (err) return reject(err);
        try {
          const result = await fn(conn);
          this.pool.close(conn, () => resolve(result));
        } catch (e) {
          this.pool.close(conn, () => reject(e));
        }
      });
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return this.withConnection((conn) => {
      return new Promise<QueryResult<T>>((resolve, reject) => {
        conn.query(sql, params, (err: any, rows: any) => {
          if (err) return reject(err);
          resolve({ rows: rows as T[], rowCount: rows.length });
        });
      });
    });
  }

  async execute(sql: string, params: any[] = []): Promise<{ affectedRows: number; insertId?: number | string }> {
    return this.withConnection((conn) => {
      return new Promise((resolve, reject) => {
        conn.query(sql, params, (err: any, result: any) => {
          if (err) return reject(err);
          // Para INSERT com IDENTITY, buscar via IDENTITY_VAL_LOCAL() é responsabilidade do Repository
          resolve({ affectedRows: Array.isArray(result) ? result.length : 1 });
        });
      });
    });
  }

  async paginate<T = any>(
    baseSql: string,
    params: any[],
    page: number,
    pageSize: number,
    orderBy: string
  ): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * pageSize;
    // DB2 (LUW >= 11.1) suporta OFFSET ... FETCH FIRST n ROWS ONLY
    const pagedSql = `${baseSql} ORDER BY ${orderBy} OFFSET ${offset} ROWS FETCH FIRST ${pageSize} ROWS ONLY`;
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
    return this.withConnection(async (conn) => {
      return new Promise<T>((resolve, reject) => {
        conn.beginTransaction(async (err: any) => {
          if (err) return reject(err);
          try {
            // trx compartilha a mesma conexão física — wrapper simplificado
            const trxAdapter: IDatabaseAdapter = {
              ...this,
              query: (sql: string, p: any[] = []) =>
                new Promise((res, rej) =>
                  conn.query(sql, p, (e: any, rows: any) => (e ? rej(e) : res({ rows, rowCount: rows.length })))
                ),
              execute: (sql: string, p: any[] = []) =>
                new Promise((res, rej) =>
                  conn.query(sql, p, (e: any) => (e ? rej(e) : res({ affectedRows: 1 })))
                ),
            } as IDatabaseAdapter;

            const result = await fn(trxAdapter);
            conn.commitTransaction((cErr: any) => (cErr ? reject(cErr) : resolve(result)));
          } catch (e) {
            conn.rollbackTransaction(() => reject(e));
          }
        });
      });
    });
  }
}
