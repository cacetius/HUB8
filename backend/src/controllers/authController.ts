import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { ok } from '../utils/response';

export class AuthController {
  constructor(private service: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const result = await this.service.login(username, password, req.ip, req.headers['user-agent']);
      return ok(res, result);
    } catch (e) { next(e); }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.logout(req.user!.id, req.ip, req.headers['user-agent']);
      return ok(res, { loggedOut: true });
    } catch (e) { next(e); }
  };

  me = async (req: Request, res: Response) => {
    return ok(res, req.user);
  };
}
