import { config } from './config';
import { logger } from './logger';

let Sentry: any = null;
let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!config.sentryDsn) {
    logger.info('Sentry not configured - error tracking disabled');
    return;
  }
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.nodeEnv,
      tracesSampleRate: config.nodeEnv === 'production' ? 0.2 : 0,
      integrations: [
        (Sentry?.integrations?.Http || {}),
        (Sentry?.integrations?.Express || {}).apply?.(Sentry?.integrations?.Express),
      ].filter(Boolean),
    });
    initialized = true;
    logger.info('Sentry error tracking initialized');
  } catch (error) {
    logger.warn('Failed to initialize Sentry', { error: (error as Error).message });
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (!Sentry || !initialized) {
    logger.error('Unhandled error (Sentry not available)', { error: error.message, context });
    return;
  }
  Sentry.withScope((scope: any) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: 'info' | 'warn' | 'error' = 'info', context?: Record<string, any>) {
  if (!Sentry || !initialized) {
    if (level === 'warn') logger.warn(message, context);
    else if (level === 'error') logger.error(message, context);
    else logger.info(message, context);
    return;
  }
  Sentry.withScope((scope: any) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureMessage(message, level);
  });
}

export function setUserContext(user: { id: string; email?: string; role?: string }) {
  if (!Sentry || !initialized) return;
  Sentry.setUser({ id: user.id, email: user.email, role: user.role });
}

export function clearUserContext() {
  if (!Sentry || !initialized) return;
  Sentry.setUser(null);
}

export function getSentryMiddleware() {
  if (!Sentry || !initialized) return null;
  return {
    requestHandler: Sentry.Handlers.requestHandler(),
    errorHandler: Sentry.Handlers.errorHandler(),
  };
}