/**
 * Contrato único que Repositories usam. Nenhuma camada acima disso
 * conhece se o banco é DB2 ou SQL Server.
 *
 * IMPORTANTE sobre paginação: cada Adapter implementa `paginate` com a
 * sintaxe nativa do seu banco (DB2: FETCH FIRST n ROWS ONLY / OFFSET;
 * SQL Server: OFFSET ... FETCH NEXT ... ROWS ONLY). Repositories chamam
 * sempre `paginate`, nunca escrevem LIMIT/OFFSET/FETCH manualmente.
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface PaginatedResult<T = any> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IDatabaseAdapter {
  /** Executa SELECT parametrizado. Nunca concatenar valores na string SQL. */
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;

  /** Executa INSERT/UPDATE/DELETE parametrizado. */
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number | string }>;

  /** SELECT paginado — cada Adapter monta a cláusula de paginação nativa. */
  paginate<T = any>(
    baseSql: string,
    params: any[],
    page: number,
    pageSize: number,
    orderBy: string
  ): Promise<PaginatedResult<T>>;

  /** Executa um bloco de operações dentro de uma transação; rollback automático em erro. */
  transaction<T>(fn: (trx: IDatabaseAdapter) => Promise<T>): Promise<T>;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export type DatabaseProvider = 'db2' | 'sqlserver';
