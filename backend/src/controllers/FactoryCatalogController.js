const { ok } = require('../utils/response');
const { pagination, positiveInteger } = require('../utils/request');

class FactoryCatalogController {
  constructor(service, resource) {
    this.service = service;
    this.resource = resource;
  }

  list = async (req, res, next) => {
    try {
      const { page, pageSize } = pagination(req.query);
      const search = req.query.search === undefined ? undefined : req.query.search;
      return ok(res, await this.service.list(this.resource, page, pageSize, search));
    } catch (error) {
      return next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      return ok(res, await this.service.get(
        this.resource,
        positiveInteger(req.params.id, 'id')
      ));
    } catch (error) {
      return next(error);
    }
  };

  current = async (_req, res, next) => {
    try {
      return ok(res, await this.service.currentShift());
    } catch (error) {
      return next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const result = await this.service.create(
        this.resource,
        req.body,
        req.user.id,
        req.ip
      );
      return ok(res, result, 201);
    } catch (error) {
      return next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await this.service.update(
        this.resource,
        positiveInteger(req.params.id, 'id'),
        req.body,
        req.user.id,
        req.ip
      );
      return ok(res, result);
    } catch (error) {
      return next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      await this.service.remove(
        this.resource,
        positiveInteger(req.params.id, 'id'),
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
      const result = await this.service.restore(
        this.resource,
        positiveInteger(req.params.id, 'id'),
        req.user.id,
        req.ip
      );
      return ok(res, result);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { FactoryCatalogController };
