export interface BaseEvent {
  id: string;
  type: string;
  tenantId: string;
  userId?: string;
  timestamp: Date;
  version: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface DocumentEvent extends BaseEvent {
  type: 'document.uploaded' | 'document.processed' | 'document.failed' | 'document.deleted';
  data: {
    documentId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    status?: 'processing' | 'completed' | 'failed';
    chunks?: number;
    error?: string;
  };
}

export interface ConversationEvent extends BaseEvent {
  type: 'conversation.started' | 'conversation.message' | 'conversation.ended';
  data: {
    conversationId: string;
    messageId?: string;
    role?: 'user' | 'assistant';
    messageCount?: number;
    tokens?: number;
    cost?: number;
  };
}

export interface UserEvent extends BaseEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | 'user.login' | 'user.logout';
  data: {
    userId: string;
    email?: string;
    role?: string;
    lastActivity?: Date;
  };
}

export interface SystemEvent extends BaseEvent {
  type: 'system.startup' | 'system.shutdown' | 'system.error' | 'system.health_check';
  data: {
    component?: string;
    status?: 'healthy' | 'unhealthy' | 'degraded';
    error?: string;
    metrics?: Record<string, any>;
  };
}

export interface WebhookEvent extends BaseEvent {
  type: 'webhook.sent' | 'webhook.failed' | 'webhook.retry';
  data: {
    webhookId: string;
    url: string;
    method: string;
    statusCode?: number;
    responseTime?: number;
    attempt: number;
    maxAttempts: number;
    error?: string;
  };
}

export interface AnalyticsEvent extends BaseEvent {
  type: 'analytics.interaction' | 'analytics.feedback' | 'analytics.session';
  data: {
    sessionId?: string;
    action: string;
    value?: number;
    properties?: Record<string, any>;
  };
}

export type Event = 
  | DocumentEvent 
  | ConversationEvent 
  | UserEvent 
  | SystemEvent 
  | WebhookEvent 
  | AnalyticsEvent;

export interface EventFilter {
  tenantId?: string;
  userId?: string;
  types?: string[];
  fromDate?: Date;
  toDate?: Date;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface EventSubscription {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  eventTypes: string[];
  filters?: Record<string, any>;
  webhookUrl: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  active: boolean;
  retryPolicy: {
    maxAttempts: number;
    backoffType: 'fixed' | 'exponential';
    baseDelay: number;
    maxDelay: number;
  };
  security?: {
    secretKey?: string;
    signatureHeader?: string;
    signatureAlgorithm?: 'sha256' | 'sha512';
  };
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  successCount: number;
  failureCount: number;
}

export interface EventDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  webhookUrl: string;
  method: string;
  headers: Record<string, string>;
  payload: any;
  statusCode?: number;
  responseBody?: string;
  responseTime?: number;
  attempt: number;
  maxAttempts: number;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  error?: string;
  scheduledAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

export interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByTenant: Record<string, number>;
  recentEvents: number;
  averageEventsPerDay: number;
  topEventTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface WebhookStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
  deliverySuccessRate: number;
  topFailureReasons: Array<{
    reason: string;
    count: number;
  }>;
}

export interface EventHandlerOptions {
  async?: boolean;
  priority?: number;
  retries?: number;
  timeout?: number;
}

export interface EventHandlerMetadata {
  eventType: string;
  options?: EventHandlerOptions;
}

export interface EventPublishOptions {
  delay?: number;
  priority?: number;
  async?: boolean;
  skipWebhooks?: boolean;
  metadata?: Record<string, any>;
}

export interface EventBatch {
  id: string;
  events: Event[];
  createdAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}