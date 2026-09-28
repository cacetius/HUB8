const { ok } = require('../utils/response');
const { pagination, positiveInteger } = require('../utils/request');

class AdminUserController {
  constructor(service) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const { page, pageSize } = pagination(req.query);
      const search = req.query.search === undefined ? undefined : req.query.search;
      return ok(res, await this.service.list(page, pageSize, search));
    } catch (error) {
      return next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      return ok(res, await this.service.get(positiveInteger(req.params.id, 'id')));
    } catch (error) {
      return next(error);
    }
  };

  roles = async (_req, res, next) => {
    try {
      return ok(res, await this.service.listRoles());
    } catch (error) {
      return next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      return ok(res, await this.service.create(req.body, req.user.id, req.ip), 201);
    } catch (error) {
      return next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      return ok(res, await this.service.update(
        positiveInteger(req.params.id, 'id'),
        req.body,
        req.user.id,
        req.ip
      ));
    } catch (error) {
      return next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      await this.service.setActive(
        positiveInteger(req.params.id, 'id'),
        false,
        req.user.id,
        req.ip
      );
      return ok(res, { removed: true });
    } catch (error) {
      return next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      return ok(res, await this.service.setActive(
        positiveInteger(req.params.id, 'id'),
        true,
        req.user.id,
        req.ip
      ));
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { AdminUserController };
