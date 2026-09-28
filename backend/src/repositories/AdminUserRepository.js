const USER_FIELDS = `
  SELECT ID, USERNAME, EMAIL, DISPLAY_NAME, ACTIVE, CREATED_AT, UPDATED_AT
  FROM USERS`;

function isActive(value) {
  return value === true || value === 1 || value === '1';
}

class AdminUserRepository {
  constructor(db) {
    this.db = db;
  }

  async addRoles(users, query = this.db) {
    if (users.length === 0) return users;
    const ids = users.map((user) => user.ID);
    const placeholders = ids.map(() => '?').join(', ');
    const { rows } = await query.query(
      `SELECT UR.USER_ID, R.CODE FROM USER_ROLES UR
       JOIN ROLES R ON R.ID = UR.ROLE_ID
       WHERE UR.USER_ID IN (${placeholders}) AND R.ACTIVE = 1
       ORDER BY R.CODE`,
      ids
    );
    const rolesByUser = new Map(ids.map((id) => [id, []]));
    for (const row of rows) rolesByUser.get(row.USER_ID)?.push(row.CODE);
    return users.map((user) => ({ ...user, roles: rolesByUser.get(user.ID) ?? [] }));
  }

  async findAll(page, pageSize, search) {
    let sql = USER_FIELDS;
    const params = [];
    if (search) {
      sql += ' WHERE USERNAME LIKE ? OR DISPLAY_NAME LIKE ? OR EMAIL LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const result = await this.db.paginate(sql, params, page, pageSize, 'USERNAME');
    return {
      ...result,
      rows: await this.addRoles(result.rows),
    };
  }

  async findById(id) {
    const { rows } = await this.db.query(`${USER_FIELDS} WHERE ID = ?`, [id]);
    if (rows.length === 0) return null;
    const [user] = await this.addRoles(rows);
    return user;
  }

  async findRoles(roleCodes, query = this.db) {
    if (roleCodes.length === 0) return [];
    const placeholders = roleCodes.map(() => '?').join(', ');
    const { rows } = await query.query(
      `SELECT ID, CODE FROM ROLES
       WHERE ACTIVE = 1 AND CODE IN (${placeholders})`,
      roleCodes
    );
    return rows;
  }

  async create(input, passwordHash, roleCodes, actorId) {
    return this.db.transaction(async (transaction) => {
      const { rows: existing } = await transaction.query(
        'SELECT ID FROM USERS WHERE USERNAME = ?',
        [input.username]
      );
      if (existing.length > 0) {
        const error = new Error('Esse nome de usuário já está em uso.');
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const roles = await this.findRoles(roleCodes, transaction);
      if (roles.length !== roleCodes.length) {
        const error = new Error('Uma ou mais funções informadas não existem ou estão inativas.');
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      await transaction.execute(
        `INSERT INTO USERS
         (USERNAME, EMAIL, PASSWORD_HASH, DISPLAY_NAME, ACTIVE, CREATED_BY, UPDATED_BY)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.username,
          input.email ?? null,
          passwordHash,
          input.displayName,
          input.active === false ? 0 : 1,
          actorId,
          actorId,
        ]
      );
      const { rows: users } = await transaction.query(
        'SELECT ID FROM USERS WHERE USERNAME = ?',
        [input.username]
      );
      if (users.length !== 1) throw new Error('Não foi possível confirmar a criação do usuário.');

      for (const role of roles) {
        await transaction.execute(
          'INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (?, ?)',
          [users[0].ID, role.ID]
        );
      }
      return users[0].ID;
    });
  }

  async update(id, input, actorId) {
    return this.db.transaction(async (transaction) => {
      const { rows: users } = await transaction.query(
        'SELECT ID, ACTIVE FROM USERS WHERE ID = ?',
        [id]
      );
      if (users.length === 0) {
        const error = new Error('Usuário não encontrado.');
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const current = await this.findByIdInTransaction(transaction, id);
      if (input.username !== undefined && input.username !== current.USERNAME) {
        const { rows: duplicate } = await transaction.query(
          'SELECT ID FROM USERS WHERE USERNAME = ? AND ID <> ?',
          [input.username, id]
        );
        if (duplicate.length > 0) {
          const error = new Error('Esse nome de usuário já está em uso.');
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
      }
      const nextActive = input.active === undefined ? isActive(users[0].ACTIVE) : input.active;
      const nextRoles = input.roleCodes ?? current.roles;
      const removesLastAdmin = current.roles.includes('ADMIN') &&
        isActive(users[0].ACTIVE) &&
        (!nextActive || !nextRoles.includes('ADMIN'));

      if (removesLastAdmin) {
        const { rows } = await transaction.query(
          `SELECT COUNT(*) AS TOTAL FROM USERS U
           JOIN USER_ROLES UR ON UR.USER_ID = U.ID
           JOIN ROLES R ON R.ID = UR.ROLE_ID
           WHERE U.ACTIVE = 1 AND R.ACTIVE = 1 AND R.CODE = 'ADMIN' AND U.ID <> ?`,
          [id]
        );
        if (Number(rows[0]?.TOTAL ?? 0) === 0) {
          const error = new Error('Não é possível remover ou desativar o último administrador ativo.');
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
      }

      if (input.roleCodes) {
        const roles = await this.findRoles(input.roleCodes, transaction);
        if (roles.length !== input.roleCodes.length) {
          const error = new Error('Uma ou mais funções informadas não existem ou estão inativas.');
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
      }

      const columns = {
        username: 'USERNAME',
        email: 'EMAIL',
        displayName: 'DISPLAY_NAME',
        passwordHash: 'PASSWORD_HASH',
        active: 'ACTIVE',
      };
      const updates = [];
      const params = [];
      for (const [key, column] of Object.entries(columns)) {
        if (input[key] === undefined) continue;
        updates.push(`${column} = ?`);
        params.push(key === 'active' ? (input[key] ? 1 : 0) : input[key]);
      }
      if (updates.length > 0) {
        updates.push('UPDATED_BY = ?', 'UPDATED_AT = CURRENT_TIMESTAMP');
        params.push(actorId, id);
        await transaction.execute(
          `UPDATE USERS SET ${updates.join(', ')} WHERE ID = ?`,
          params
        );
      }

      if (input.roleCodes) {
        await transaction.execute('DELETE FROM USER_ROLES WHERE USER_ID = ?', [id]);
        const roles = await this.findRoles(input.roleCodes, transaction);
        for (const role of roles) {
          await transaction.execute(
            'INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (?, ?)',
            [id, role.ID]
          );
        }
      }
    });
  }

  async findByIdInTransaction(transaction, id) {
    const { rows } = await transaction.query(`${USER_FIELDS} WHERE ID = ?`, [id]);
    const [user] = await this.addRoles(rows, transaction);
    return user;
  }

  async listRoles() {
    const { rows } = await this.db.query(
      'SELECT ID, CODE, NAME FROM ROLES WHERE ACTIVE = 1 ORDER BY NAME'
    );
    return rows;
  }
}

module.exports = { AdminUserRepository };
