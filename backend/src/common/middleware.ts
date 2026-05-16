import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { AppError, UnauthorizedError, ForbiddenError, ValidationError } from './errors';
import { logger } from './logger';
import { ApiKeyService } from '../modules/api-key/api-key.service';

// ── Auth Middleware ──
export interface AuthPayload {
  userId: string;
  email?: string;
  phone?: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      apiKey?: any;
    }
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const optionalAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = decoded;
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
};

export const authorize = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
};

export const authenticateApiKey = (requiredPermission?: string): RequestHandler => {
  return async (req, _res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || Array.isArray(apiKey)) {
      return next(new UnauthorizedError('No API key provided'));
    }

    try {
      req.apiKey = await new ApiKeyService().validate(apiKey, requiredPermission);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// ── Error Handler ──
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
    const response: any = {
      success: false,
      message: err.message,
    };
    if (err instanceof ValidationError) {
      response.errors = (err as ValidationError).errors;
    }
    return res.status(err.statusCode).json(response);
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Resource already exists',
      });
    }
    if (prismaErr.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }
  }

  logger.error(`Unhandled error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });

  return res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
};

// ── Async Handler ──
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
