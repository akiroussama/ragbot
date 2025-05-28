import { SetMetadata } from '@nestjs/common';
import { EventHandlerOptions } from '../types';

export const EVENT_HANDLER_METADATA = 'EVENT_HANDLER_METADATA';

export interface EventHandlerMetadata {
  eventType: string;
  options?: EventHandlerOptions;
}

export function OnEvent(
  eventType: string,
  options?: EventHandlerOptions,
): MethodDecorator {
  return SetMetadata(EVENT_HANDLER_METADATA, {
    eventType,
    options,
  } as EventHandlerMetadata);
}

// Specific event decorators
export function OnDocumentEvent(
  eventType: string,
  options?: EventHandlerOptions,
): MethodDecorator {
  return OnEvent(`document.${eventType}`, options);
}

export function OnConversationEvent(
  eventType: string,
  options?: EventHandlerOptions,
): MethodDecorator {
  return OnEvent(`conversation.${eventType}`, options);
}

export function OnUserEvent(
  eventType: string,
  options?: EventHandlerOptions,
): MethodDecorator {
  return OnEvent(`user.${eventType}`, options);
}

export function OnSystemEvent(
  eventType: string,
  options?: EventHandlerOptions,
): MethodDecorator {
  return OnEvent(`system.${eventType}`, options);
}

export function OnWebhookEvent(
  eventType: string,
  options?: EventHandlerOptions,
): MethodDecorator {
  return OnEvent(`webhook.${eventType}`, options);
}

export function OnAnalyticsEvent(
  eventType: string,
  options?: EventHandlerOptions,
): MethodDecorator {
  return OnEvent(`analytics.${eventType}`, options);
}

// Catch-all event decorator
export function OnAnyEvent(
  options?: EventHandlerOptions,
): MethodDecorator {
  return OnEvent('*', options);
}