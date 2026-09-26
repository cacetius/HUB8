function ok(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, data, message: null });
}

function fail(res, message, code, status = 400) {
  return res.status(status).json({ success: false, data: null, message, code });
}

module.exports = { ok, fail };
