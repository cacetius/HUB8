const { ok } = require('../utils/response');

class AppController {
  constructor(service) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1);
      const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
      const search = req.query.search ? String(req.query.search) : undefined;
      return ok(res, await this.service.list(page, pageSize, search));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      return ok(res, await this.service.get(Number(req.params.id)));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const app = await this.service.create(req.body, req.user.id, req.ip);
      return ok(res, app, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const app = await this.service.update(Number(req.params.id), req.body, req.user.id, req.ip);
      return ok(res, app);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      await this.service.remove(Number(req.params.id), req.user.id, req.ip);
      return ok(res, { removed: true });
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      return ok(res, await this.service.restore(Number(req.params.id), req.user.id, req.ip));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { AppController };
