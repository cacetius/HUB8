/**
 * Acesso ao DB2 pelo driver oficial `ibm_db`.
 * O driver só é carregado quando o projeto está configurado para usar DB2.
 */
class Db2Adapter {
  constructor(config) {
    this.connectionString =
      `DATABASE=${config.database};HOSTNAME=${config.host};PORT=${config.port};` +
      `PROTOCOL=TCPIP;UID=${config.user};PWD={${String(config.password).replace(/}/g, '}}')}};`;
  }

  async connect() {
    const ibmDb = require('ibm_db');
    this.pool = new ibmDb.Pool();

    await new Promise((resolve, reject) => {
      this.pool.open(this.connectionString, (error, connection) => {
        if (error) return reject(error);
        this.pool.close(connection, resolve);
      });
    });
  }

  async disconnect() {
    if (!this.pool?.closeAll) return;
    await new Promise((resolve) => this.pool.closeAll(resolve));
  }

  async healthCheck() {
    try {
      await this.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
      return true;
    } catch {
      return false;
    }
  }

  withConnection(callback) {
    return new Promise((resolve, reject) => {
      this.pool.open(this.connectionString, async (error, connection) => {
        if (error) return reject(error);

        try {
          const result = await callback(connection);
          this.pool.close(connection, () => resolve(result));
        } catch (queryError) {
          this.pool.close(connection, () => reject(queryError));
        }
      });
    });
  }

  async query(sql, params = []) {
    return this.withConnection((connection) =>
      new Promise((resolve, reject) => {
        connection.query(sql, params, (error, rows) => {
          if (error) return reject(error);
          resolve({ rows, rowCount: rows.length });
        });
      })
    );
  }

  async execute(sql, params = []) {
    return this.withConnection((connection) =>
      new Promise((resolve, reject) => {
        connection.query(sql, params, (error, result) => {
          if (error) return reject(error);
          resolve({ affectedRows: Array.isArray(result) ? result.length : 1 });
        });
      })
    );
  }

  async insert(sql, params = []) {
    return this.withConnection((connection) =>
      new Promise((resolve, reject) => {
        connection.query(sql, params, (error, result) => {
          if (error) return reject(error);

          connection.query(
            'SELECT IDENTITY_VAL_LOCAL() AS ID FROM SYSIBM.SYSDUMMY1',
            [],
            (identityError, rows) => {
              if (identityError) return reject(identityError);
              const insertId = Number(rows[0]?.ID);
              if (!Number.isSafeInteger(insertId) || insertId < 1) {
                return reject(new Error('O DB2 não retornou o ID do registro criado.'));
              }
              resolve({
                affectedRows: Array.isArray(result) ? result.length : 1,
                insertId,
              });
            }
          );
        });
      })
    );
  }

  async paginate(baseSql, params, page, pageSize, orderBy) {
    const offset = (page - 1) * pageSize;
    // O DB2 usa OFFSET junto de FETCH FIRST para devolver uma página.
    const pageSql =
      `${baseSql} ORDER BY ${orderBy} OFFSET ${offset} ROWS FETCH FIRST ${pageSize} ROWS ONLY`;
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
    return this.withConnection(
      (connection) =>
        new Promise((resolve, reject) => {
          connection.beginTransaction(async (error) => {
            if (error) return reject(error);

            const transactionAdapter = {
              ...this,
              query: (sql, params = []) =>
                new Promise((done, fail) => {
                  connection.query(sql, params, (queryError, rows) => {
                    if (queryError) return fail(queryError);
                    done({ rows, rowCount: rows.length });
                  });
                }),
              execute: (sql, params = []) =>
                new Promise((done, fail) => {
                  connection.query(sql, params, (queryError) => {
                    if (queryError) return fail(queryError);
                    done({ affectedRows: 1 });
                  });
                }),
            };

            try {
              const result = await callback(transactionAdapter);
              connection.commitTransaction((commitError) => {
                if (commitError) return reject(commitError);
                resolve(result);
              });
            } catch (transactionError) {
              connection.rollbackTransaction(() => reject(transactionError));
            }
          });
        })
    );
  }
}

module.exports = { Db2Adapter };
