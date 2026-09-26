import { IDatabaseAdapter } from '../adapters/DatabaseAdapter';

export interface AppRecord {
  ID: number;
  NAME: string;
  SUBTITLE: string | null;
  DESCRIPTION: string | null;
  CATEGORY: string | null;
  ICON: string | null;
  URL: string;
  STATUS: string;
  SORT_ORDER: number;
  MIN_ROLE_ID: number | null;
  ACTIVE: number | boolean;
}

export interface AppInput {
  name: string;
  subtitle?: string;
  description?: string;
  category?: string;
  icon?: string;
  url: string;
  status?: string;
  sortOrder?: number;
  minRoleId?: number;
}

/**
 * Único lugar do sistema onde SQL para a entidade APPS existe.
 * Services nunca escrevem SQL diretamente.
 */
export class AppRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findAll(page: number, pageSize: number, search?: string) {
    let base = 'SELECT * FROM APPS WHERE ACTIVE = 1';
    const params: any[] = [];
    if (search) {
      base += ' AND (NAME LIKE ? OR CATEGORY LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    return this.db.paginate<AppRecord>(base, params, page, pageSize, 'SORT_ORDER, NAME');
  }

  async findById(id: number): Promise<AppRecord | null> {
    const { rows } = await this.db.query<AppRecord>(
      'SELECT * FROM APPS WHERE ID = ? AND ACTIVE = 1',
      [id]
    );
    return rows[0] ?? null;
  }

  async create(input: AppInput, userId: number): Promise<number> {
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

  async update(id: number, input: Partial<AppInput>, userId: number): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];
    const map: Record<string, any> = {
      name: 'NAME', subtitle: 'SUBTITLE', description: 'DESCRIPTION', category: 'CATEGORY',
      icon: 'ICON', url: 'URL', status: 'STATUS', sortOrder: 'SORT_ORDER', minRoleId: 'MIN_ROLE_ID',
    };
    for (const [key, col] of Object.entries(map)) {
      if ((input as any)[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push((input as any)[key]);
      }
    }
    if (fields.length === 0) return;
    fields.push('UPDATED_BY = ?', 'UPDATED_AT = CURRENT_TIMESTAMP');
    params.push(userId, id);
    await this.db.execute(`UPDATE APPS SET ${fields.join(', ')} WHERE ID = ?`, params);
  }

  /** Soft delete — item 15 do escopo: nunca apagar de verdade. */
  async softDelete(id: number, userId: number): Promise<void> {
    await this.db.execute(
      'UPDATE APPS SET ACTIVE = 0, UPDATED_BY = ?, UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = ?',
      [userId, id]
    );
  }

  async restore(id: number, userId: number): Promise<void> {
    await this.db.execute(
      'UPDATE APPS SET ACTIVE = 1, UPDATED_BY = ?, UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = ?',
      [userId, id]
    );
  }
}
