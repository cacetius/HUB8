const jwt = require('jsonwebtoken');
const { verifyPassword } = require('../utils/password');
const { env } = require('../config/env');
const { validationError } = require('../utils/request');

class AuthService {
  constructor(users, audit) {
    this.users = users;
    this.audit = audit;
  }

  async login(username, password, ip, userAgent) {
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string') {
      throw validationError('Usuário ou senha inválidos.');
    }
    const user = await this.users.findByUsername(username);
    const rejectInvalidCredentials = () => {
      const error = new Error('Usuário ou senha inválidos.');
      error.code = 'VALIDATION_ERROR';
      throw error;
    };

    if (!user) return rejectInvalidCredentials();
    if (!(await verifyPassword(password, user.PASSWORD_HASH))) return rejectInvalidCredentials();

    const { roles, permissions } = await this.users.getRolesAndPermissions(user.ID);
    const token = jwt.sign(
      { id: user.ID, username: user.USERNAME, roles, permissions },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    await this.audit.record({
      userId: user.ID,
      action: 'LOGIN',
      entity: 'USERS',
      entityId: user.ID,
      ip,
      userAgent,
    });

    return {
      token,
      user: {
        id: user.ID,
        username: user.USERNAME,
        displayName: user.DISPLAY_NAME,
        roles,
        permissions,
      },
    };
  }

  async logout(userId, ip, userAgent) {
    await this.audit.record({
      userId,
      action: 'LOGOUT',
      entity: 'USERS',
      entityId: userId,
      ip,
      userAgent,
    });
    // O token continua válido até expirar; revogação exige uma lista de bloqueio.
  }
}

module.exports = { AuthService };
