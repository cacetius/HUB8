/**
 * SQL for APPS stays in the repository; services only handle business rules.
 */
class AppRepository {
  constructor(db) {
    this.db = db;
  }

  async findAll(page, pageSize, search) {
    let sql = 'SELECT * FROM APPS WHERE ACTIVE = 1';
    const params = [];

    if (search) {
      sql += ' AND (NAME LIKE ? OR CATEGORY LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    return this.db.paginate(sql, params, page, pageSize, 'SORT_ORDER, NAME');
  }

  async findById(id) {
    const { rows } = await this.db.query(
      'SELECT * FROM APPS WHERE ID = ? AND ACTIVE = 1',
      [id]
    );
    return rows[0] ?? null;
  }

  async create(input, userId) {
    const result = await this.db.execute(
      `INSERT INTO APPS (NAME, SUBTITLE, DESCRIPTION, CATEGORY, ICON, URL, STATUS, SORT_ORDER, MIN_ROLE_ID, CREATED_BY, UPDATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.subtitle ?? null,
        input.description ?? null,
        input.category ?? null,
        input.icon ?? null,
        input.url,
        input.status ?? 'ATIVO',
        input.sortOrder ?? 0,
        input.minRoleId ?? null,
        userId,
        userId,
      ]
    );
    return Number(result.insertId);
  }

  async update(id, input, userId) {
    const columns = {
      name: 'NAME',
      subtitle: 'SUBTITLE',
      description: 'DESCRIPTION',
      category: 'CATEGORY',
      icon: 'ICON',
      url: 'URL',
      status: 'STATUS',
      sortOrder: 'SORT_ORDER',
      minRoleId: 'MIN_ROLE_ID',
    };
    const fields = [];
    const params = [];

    for (const [key, column] of Object.entries(columns)) {
      if (input[key] === undefined) continue;
      fields.push(`${column} = ?`);
      params.push(input[key]);
    }

    if (fields.length === 0) return;

    fields.push('UPDATED_BY = ?', 'UPDATED_AT = CURRENT_TIMESTAMP');
    params.push(userId, id);
    await this.db.execute(`UPDATE APPS SET ${fields.join(', ')} WHERE ID = ?`, params);
  }

  async softDelete(id, userId) {
    await this.db.execute(
      'UPDATE APPS SET ACTIVE = 0, UPDATED_BY = ?, UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = ?',
      [userId, id]
    );
  }

  async restore(id, userId) {
    await this.db.execute(
      'UPDATE APPS SET ACTIVE = 1, UPDATED_BY = ?, UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = ?',
      [userId, id]
    );
  }
}

module.exports = { AppRepository };
