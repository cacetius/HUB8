const CATALOGS = {
  operators: {
    table: 'OPERATORS',
    audited: true,
    fields: {
      name: { column: 'NAME', type: 'text', required: true, max: 160 },
      registration: { column: 'REGISTRATION', type: 'text', nullable: true, max: 40 },
      roleLabel: { column: 'ROLE_LABEL', type: 'text', nullable: true, max: 80 },
      operationId: { column: 'OPERATION_ID', type: 'id', nullable: true },
      status: { column: 'STATUS', type: 'text', max: 20 },
    },
  },
  operations: {
    table: 'OPERATIONS',
    audited: true,
    fields: {
      name: { column: 'NAME', type: 'text', required: true, max: 160 },
      description: { column: 'DESCRIPTION', type: 'text', nullable: true, max: 500 },
    },
  },
  shifts: {
    table: 'SHIFTS',
    audited: false,
    fields: {
      name: { column: 'NAME', type: 'text', required: true, max: 80 },
      startTime: { column: 'START_TIME', type: 'time', required: true },
      endTime: { column: 'END_TIME', type: 'time', required: true },
    },
  },
};

class FactoryCatalogRepository {
  constructor(db) {
    this.db = db;
  }

  catalog(resource) {
    const definition = CATALOGS[resource];
    if (!definition) throw new Error(`Recurso de fábrica desconhecido: ${resource}`);
    return definition;
  }

  async findAll(resource, page, pageSize, search) {
    const { table } = this.catalog(resource);
    const params = [];
    let sql = `SELECT * FROM ${table} WHERE ACTIVE = 1`;
    if (search) {
      sql += ' AND NAME LIKE ?';
      params.push(`%${search}%`);
    }
    const order = resource === 'shifts' ? 'START_TIME, NAME' : 'NAME';
    return this.db.paginate(sql, params, page, pageSize, order);
  }

  async findById(resource, id, includeInactive = false) {
    const { table } = this.catalog(resource);
    const activeFilter = includeInactive ? '' : ' AND ACTIVE = 1';
    const { rows } = await this.db.query(
      `SELECT * FROM ${table} WHERE ID = ?${activeFilter}`,
      [id]
    );
    return rows[0] ?? null;
  }

  async findActiveShifts() {
    const { rows } = await this.db.query(
      'SELECT * FROM SHIFTS WHERE ACTIVE = 1 ORDER BY START_TIME'
    );
    return rows;
  }

  async create(resource, input, userId) {
    const definition = this.catalog(resource);
    const fields = Object.keys(input);
    const columns = fields.map((field) => definition.fields[field].column);
    const values = fields.map((field) => input[field]);
    if (definition.audited) {
      columns.push('CREATED_BY', 'UPDATED_BY');
      values.push(userId, userId);
    }
    const placeholders = values.map(() => '?').join(', ');
    const result = await this.db.insert(
      `INSERT INTO ${definition.table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return Number(result.insertId);
  }

  async update(resource, id, input, userId) {
    const definition = this.catalog(resource);
    const fields = Object.keys(input).map((field) => `${definition.fields[field].column} = ?`);
    const params = Object.keys(input).map((field) => input[field]);
    if (definition.audited) {
      fields.push('UPDATED_BY = ?', 'UPDATED_AT = CURRENT_TIMESTAMP');
      params.push(userId);
    }
    params.push(id);
    await this.db.execute(
      `UPDATE ${definition.table} SET ${fields.join(', ')} WHERE ID = ?`,
      params
    );
  }

  async setActive(resource, id, active, userId) {
    const definition = this.catalog(resource);
    const fields = ['ACTIVE = ?'];
    const params = [active ? 1 : 0];
    if (definition.audited) {
      fields.push('UPDATED_BY = ?', 'UPDATED_AT = CURRENT_TIMESTAMP');
      params.push(userId);
    }
    params.push(id);
    await this.db.execute(
      `UPDATE ${definition.table} SET ${fields.join(', ')} WHERE ID = ?`,
      params
    );
  }
}

module.exports = { CATALOGS, FactoryCatalogRepository };
