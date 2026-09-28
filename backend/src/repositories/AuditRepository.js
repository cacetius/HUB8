class AuditRepository {
  constructor(db) {
    this.db = db;
  }

  async record(entry) {
    await this.db.execute(
      `INSERT INTO AUDIT_LOG (USER_ID, ACTION, ENTITY, ENTITY_ID, OLD_VALUE, NEW_VALUE, IP, USER_AGENT, SOURCE)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userId,
        entry.action,
        entry.entity,
        entry.entityId != null ? String(entry.entityId) : null,
        entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        entry.newValue ? JSON.stringify(entry.newValue) : null,
        entry.ip ?? null,
        entry.userAgent ?? null,
        entry.source ?? 'API',
      ]
    );
  }

  async findByEntity(entity, entityId, page, pageSize) {
    return this.db.paginate(
      'SELECT * FROM AUDIT_LOG WHERE ENTITY = ? AND ENTITY_ID = ?',
      [entity, entityId],
      page,
      pageSize,
      'DATE_TIME DESC'
    );
  }

  async findAll(filters, page, pageSize) {
    const conditions = [];
    const params = [];

    if (filters.userId !== undefined) {
      conditions.push('USER_ID = ?');
      params.push(filters.userId);
    }
    if (filters.action) {
      conditions.push('ACTION = ?');
      params.push(filters.action);
    }
    if (filters.entity) {
      conditions.push('ENTITY = ?');
      params.push(filters.entity);
    }
    if (filters.entityId) {
      conditions.push('ENTITY_ID = ?');
      params.push(filters.entityId);
    }
    if (filters.from) {
      conditions.push('DATE_TIME >= ?');
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push('DATE_TIME <= ?');
      params.push(filters.to);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    return this.db.paginate(
      `SELECT * FROM AUDIT_LOG${where}`,
      params,
      page,
      pageSize,
      'DATE_TIME DESC, ID DESC'
    );
  }

  async findById(id) {
    const { rows } = await this.db.query('SELECT * FROM AUDIT_LOG WHERE ID = ?', [id]);
    return rows[0] ?? null;
  }
}

module.exports = { AuditRepository };
