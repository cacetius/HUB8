class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUsername(username) {
    const { rows } = await this.db.query(
      'SELECT * FROM USERS WHERE USERNAME = ? AND ACTIVE = 1',
      [username]
    );
    return rows[0] ?? null;
  }

  async getRolesAndPermissions(userId) {
    const { rows: roleRows } = await this.db.query(
      `SELECT R.CODE FROM ROLES R
       JOIN USER_ROLES UR ON UR.ROLE_ID = R.ID
       WHERE UR.USER_ID = ? AND R.ACTIVE = 1`,
      [userId]
    );
    const { rows: permissionRows } = await this.db.query(
      `SELECT DISTINCT P.CODE FROM PERMISSIONS P
       JOIN ROLE_PERMISSIONS RP ON RP.PERMISSION_ID = P.ID
       JOIN USER_ROLES UR ON UR.ROLE_ID = RP.ROLE_ID
       WHERE UR.USER_ID = ?`,
      [userId]
    );

    return {
      roles: roleRows.map((role) => role.CODE),
      permissions: permissionRows.map((permission) => permission.CODE),
    };
  }
}

module.exports = { UserRepository };
