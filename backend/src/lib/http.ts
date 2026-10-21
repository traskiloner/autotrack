import { Request, Response, NextFunction, RequestHandler } from 'express';

/** Error carrying an HTTP status; its message is returned to the client. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = 'No autorizado') => new HttpError(401, msg);
export const forbidden = (msg = 'No tienes permiso para realizar esta acción') => new HttpError(403, msg);
export const notFound = (msg = 'Recurso no encontrado') => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);

/**
 * Wraps an async route handler so rejected promises reach the error middleware
 * (Express 4 does not do this on its own).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asyncHandler<Req extends Request = any>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };
}
