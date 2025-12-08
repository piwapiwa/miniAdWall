import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: err.errors[0].message });
  }

  res.status(500).json({ error: '服务器内部错误' });
};