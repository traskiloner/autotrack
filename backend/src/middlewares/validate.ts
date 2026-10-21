import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues.map((i) => i.message).join('. ');
        return res.status(400).json({ message, details: err.issues });
      }
      return res.status(400).json({ message: 'Datos de solicitud no válidos' });
    }
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues.map((i) => i.message).join('. ');
        return res.status(400).json({ message });
      }
      return res.status(400).json({ message: 'Parámetros no válidos' });
    }
  };
}
