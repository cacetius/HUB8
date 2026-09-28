const { ok } = require('../utils/response');
const { pagination, positiveInteger } = require('../utils/request');

class AuditController {
  constructor(service) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const { page, pageSize } = pagination(req.query);
      const filters = {};
      for (const key of ['userId', 'action', 'entity', 'entityId', 'from', 'to']) {
        if (req.query[key] === undefined) continue;
        filters[key] = key === 'userId'
          ? positiveInteger(req.query[key], key)
          : req.query[key];
      }
      return ok(res, await this.service.list(filters, page, pageSize));
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

  byEntity = async (req, res, next) => {
    try {
      const { page, pageSize } = pagination(req.query);
      return ok(res, await this.service.findByEntity(
        req.params.entity,
        req.params.entityId,
        page,
        pageSize
      ));
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { AuditController };
