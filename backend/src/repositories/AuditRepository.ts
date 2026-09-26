import { IDatabaseAdapter } from '../adapters/DatabaseAdapter';

export interface AuditEntry {
  userId: number | null;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'EXPORT' | 'CONFIGURATION_CHANGE' | 'PERMISSION_CHANGE';
  entity: string;
  entityId?: string | number;
  oldValue?: any;
  newValue?: any;
  ip?: string;
  userAgent?: string;
  source?: string;
}

export class AuditRepository {
  constructor(private db: IDatabaseAdapter) {}

  async record(entry: AuditEntry): Promise<void> {
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

  async findByEntity(entity: string, entityId: string, page: number, pageSize: number) {
    return this.db.paginate(
      'SELECT * FROM AUDIT_LOG WHERE ENTITY = ? AND ENTITY_ID = ?',
      [entity, entityId],
      page,
      pageSize,
      'DATE_TIME DESC'
    );
  }
}
