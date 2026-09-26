import { IDatabaseAdapter } from '../adapters/DatabaseAdapter';

export interface UserRecord {
  ID: number;
  USERNAME: string;
  PASSWORD_HASH: string;
  DISPLAY_NAME: string;
  ACTIVE: number | boolean;
}

export class UserRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByUsername(username: string): Promise<UserRecord | null> {
    const { rows } = await this.db.query<UserRecord>(
      'SELECT * FROM USERS WHERE USERNAME = ? AND ACTIVE = 1',
      [username]
    );
    return rows[0] ?? null;
  }

  async getRolesAndPermissions(userId: number): Promise<{ roles: string[]; permissions: string[] }> {
    const { rows: roleRows } = await this.db.query<{ CODE: string }>(
      `SELECT R.CODE FROM ROLES R
       JOIN USER_ROLES UR ON UR.ROLE_ID = R.ID
       WHERE UR.USER_ID = ? AND R.ACTIVE = 1`,
      [userId]
    );
    const { rows: permRows } = await this.db.query<{ CODE: string }>(
      `SELECT DISTINCT P.CODE FROM PERMISSIONS P
       JOIN ROLE_PERMISSIONS RP ON RP.PERMISSION_ID = P.ID
       JOIN USER_ROLES UR ON UR.ROLE_ID = RP.ROLE_ID
       WHERE UR.USER_ID = ?`,
      [userId]
    );
    return {
      roles: roleRows.map((r) => r.CODE),
      permissions: permRows.map((r) => r.CODE),
    };
  }
}
