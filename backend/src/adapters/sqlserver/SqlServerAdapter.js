/**
 * SQL Server adapter backed by `mssql` and its Tedious driver.
 */
class SqlServerAdapter {
  constructor(config) {
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

  async connect() {
    const sql = require('mssql');
    this.pool = await new sql.ConnectionPool(this.config).connect();
  }

  async disconnect() {
    if (this.pool) await this.pool.close();
  }

  async healthCheck() {
    try {
      await this.query('SELECT 1 AS OK');
      return true;
    } catch {
      return false;
    }
  }

  toRequest(params) {
    const request = this.pool.request();
    params.forEach((value, index) => request.input(`p${index}`, value));
    return request;
  }

  toNamedSql(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `@p${index++}`);
  }

  async query(sql, params = []) {
    const request = this.toRequest(params);
    const result = await request.query(this.toNamedSql(sql));
    return { rows: result.recordset, rowCount: result.recordset.length };
  }

  async execute(sql, params = []) {
    const request = this.toRequest(params);
    const result = await request.query(this.toNamedSql(sql));
    return {
      affectedRows: result.rowsAffected?.[0] ?? 0,
      insertId: result.recordset?.[0]?.ID,
    };
  }

  async paginate(baseSql, params, page, pageSize, orderBy) {
    const offset = (page - 1) * pageSize;
    const pageSql =
      `${baseSql} ORDER BY ${orderBy} OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
    const countSql = `SELECT COUNT(*) AS TOTAL FROM (${baseSql}) AS T`;
    const [data, count] = await Promise.all([
      this.query(pageSql, params),
      this.query(countSql, params),
    ]);

    return {
      rows: data.rows,
      total: Number(count.rows[0]?.TOTAL ?? 0),
      page,
      pageSize,
    };
  }

  async transaction(callback) {
    const sql = require('mssql');
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();

    const createRequest = (params) => {
      const request = new sql.Request(transaction);
      params.forEach((value, index) => request.input(`p${index}`, value));
      return request;
    };

    const transactionAdapter = {
      ...this,
      query: async (query, params = []) => {
        const request = createRequest(params);
        const result = await request.query(this.toNamedSql(query));
        return { rows: result.recordset, rowCount: result.recordset.length };
      },
      execute: async (query, params = []) => {
        const request = createRequest(params);
        const result = await request.query(this.toNamedSql(query));
        return { affectedRows: result.rowsAffected?.[0] ?? 0 };
      },
    };

    try {
      const result = await callback(transactionAdapter);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = { SqlServerAdapter };
