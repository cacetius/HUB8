import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { AuditRepository } from '../repositories/AuditRepository';
import { verifyPassword } from '../utils/password';
import { env } from '../config/env';

export class AuthService {
  constructor(private users: UserRepository, private audit: AuditRepository) {}

  async login(username: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.users.findByUsername(username);

    // Mensagem genérica de propósito — não revelar se foi o usuário ou a senha que falhou.
    const invalid = () => {
      const err: any = new Error('Usuário ou senha inválidos.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    };

    if (!user) invalid();
    const validPassword = await verifyPassword(password, user!.PASSWORD_HASH);
    if (!validPassword) invalid();

    const { roles, permissions } = await this.users.getRolesAndPermissions(user!.ID);

    const token = jwt.sign(
      { id: user!.ID, username: user!.USERNAME, roles, permissions },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    await this.audit.record({ userId: user!.ID, action: 'LOGIN', entity: 'USERS', entityId: user!.ID, ip, userAgent });

    return {
      token,
      user: { id: user!.ID, username: user!.USERNAME, displayName: user!.DISPLAY_NAME, roles, permissions },
    };
  }

  async logout(userId: number, ip?: string, userAgent?: string) {
    await this.audit.record({ userId, action: 'LOGOUT', entity: 'USERS', entityId: userId, ip, userAgent });
    // Stateless JWT: revogação real exigiria blacklist/Redis — documentado em SECURITY.md
  }
}
