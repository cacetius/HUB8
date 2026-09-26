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
}

module.exports = { AuditRepository };
