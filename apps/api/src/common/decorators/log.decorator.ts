import { LoggerService } from '../logger/logger.service';

export function Log(message?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = new LoggerService(null as any); // This will be injected properly in production
      const className = target.constructor.name;
      const methodName = propertyName;
      const startTime = Date.now();

      logger.debug(
        message || `Executing ${className}.${methodName}`,
        className,
      );

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        logger.debug(
          `Completed ${className}.${methodName} in ${duration}ms`,
          className,
        );

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error(
          `Failed ${className}.${methodName} after ${duration}ms`,
          error.stack,
          className,
        );

        throw error;
      }
    };
  };
}