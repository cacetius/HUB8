const { ok } = require('../utils/response');

class AuthController {
  constructor(service) {
    this.service = service;
  }

  login = async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const result = await this.service.login(
        username,
        password,
        req.ip,
        req.headers['user-agent']
      );
      return ok(res, result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      await this.service.logout(req.user.id, req.ip, req.headers['user-agent']);
      return ok(res, { loggedOut: true });
    } catch (error) {
      next(error);
    }
  };

  me = async (req, res) => ok(res, req.user);
}

module.exports = { AuthController };
