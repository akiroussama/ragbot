import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { ConfigService } from '@nestjs/config';

export function initializeSentry(configService: ConfigService) {
  const dsn = configService.get<string>('sentry.dsn');
  const environment = configService.get<string>('nodeEnv');

  if (!dsn || environment === 'test') {
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: true }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
        delete event.request.headers?.['x-api-key'];
      }
      return event;
    },
    ignoreErrors: [
      // Ignore specific errors
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  });
}