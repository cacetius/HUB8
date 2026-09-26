import { Request, Response, NextFunction } from 'express';
import { AppService } from '../services/AppService';
import { ok } from '../utils/response';

export class AppController {
  constructor(private service: AppService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100); // trava para nunca carregar milhares de uma vez
      const search = req.query.search ? String(req.query.search) : undefined;
      const result = await this.service.list(page, pageSize, search);
      return ok(res, result);
    } catch (e) { next(e); }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.get(Number(req.params.id));
      return ok(res, app);
    } catch (e) { next(e); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.create(req.body, req.user!.id, req.ip);
      return ok(res, app, 201);
    } catch (e) { next(e); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.update(Number(req.params.id), req.body, req.user!.id, req.ip);
      return ok(res, app);
    } catch (e) { next(e); }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.remove(Number(req.params.id), req.user!.id, req.ip);
      return ok(res, { removed: true });
    } catch (e) { next(e); }
  };

  restore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.restore(Number(req.params.id), req.user!.id, req.ip);
      return ok(res, app);
    } catch (e) { next(e); }
  };
}
