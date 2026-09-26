import { Response } from 'express';

export function ok(res: Response, data: any = {}, status = 200) {
  return res.status(status).json({ success: true, data, message: null });
}

export function fail(res: Response, message: string, code: string, status = 400) {
  // Nunca repassar erro de driver/SQL bruto aqui — sempre uma mensagem segura.
  return res.status(status).json({ success: false, data: null, message, code });
}
