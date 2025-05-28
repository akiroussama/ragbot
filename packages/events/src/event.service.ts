import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { QueueService } from '@chatbot-rag/queue';
import {
  Event,
  BaseEvent,
  EventFilter,
  EventSubscription,
  EventDelivery,
  EventStats,
  WebhookStats,
  EventPublishOptions,
  DocumentEvent,
  ConversationEvent,
  UserEvent,
  SystemEvent,
  WebhookEvent,
  AnalyticsEvent,
} from './types';

@Injectable()
export class EventService implements OnModuleDestroy {
  private readonly logger = new Logger(EventService.name);
  private eventStore: Map<string, Event> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();
  private deliveries: Map<string, EventDelivery> = new Map();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.startEventProcessing();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  // Event Publishing
  async publishEvent(
    event: Omit<Event, 'id' | 'timestamp' | 'version'>,
    options: EventPublishOptions = {},
  ): Promise<string> {
    const fullEvent: Event = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
      version: '1.0',
      metadata: {
        ...event.metadata,
        ...options.metadata,
      },
    };

    // Store event
    await this.storeEvent(fullEvent);

    // Emit event locally
    this.eventEmitter.emit(fullEvent.type, fullEvent);
    this.eventEmitter.emit('*', fullEvent);

    // Process webhooks if not skipped
    if (!options.skipWebhooks) {
      await this.processWebhooks(fullEvent, options);
    }

    this.logger.debug(`Published event ${fullEvent.type} with ID ${fullEvent.id}`);
    return fullEvent.id;
  }

  async publishBatch(
    events: Array<Omit<Event, 'id' | 'timestamp' | 'version'>>,
    options: EventPublishOptions = {},
  ): Promise<string[]> {
    const publishedIds: string[] = [];

    for (const event of events) {
      const eventId = await this.publishEvent(event, options);
      publishedIds.push(eventId);
    }

    return publishedIds;
  }

  // Event Publishing Helpers
  async publishDocumentEvent(
    type: DocumentEvent['type'],
    data: DocumentEvent['data'],
    tenantId: string,
    userId?: string,
    options?: EventPublishOptions,
  ): Promise<string> {
    return this.publishEvent({
      type,
      tenantId,
      userId,
      source: 'document-service',
      data,
    } as DocumentEvent, options);
  }

  async publishConversationEvent(
    type: ConversationEvent['type'],
    data: ConversationEvent['data'],
    tenantId: string,
    userId?: string,
    options?: EventPublishOptions,
  ): Promise<string> {
    return this.publishEvent({
      type,
      tenantId,
      userId,
      source: 'chat-service',
      data,
    } as ConversationEvent, options);
  }

  async publishUserEvent(
    type: UserEvent['type'],
    data: UserEvent['data'],
    tenantId: string,
    userId?: string,
    options?: EventPublishOptions,
  ): Promise<string> {
    return this.publishEvent({
      type,
      tenantId,
      userId,
      source: 'user-service',
      data,
    } as UserEvent, options);
  }

  async publishSystemEvent(
    type: SystemEvent['type'],
    data: SystemEvent['data'],
    tenantId: string = 'system',
    options?: EventPublishOptions,
  ): Promise<string> {
    return this.publishEvent({
      type,
      tenantId,
      source: 'system',
      data,
    } as SystemEvent, options);
  }

  async publishAnalyticsEvent(
    type: AnalyticsEvent['type'],
    data: AnalyticsEvent['data'],
    tenantId: string,
    userId?: string,
    options?: EventPublishOptions,
  ): Promise<string> {
    return this.publishEvent({
      type,
      tenantId,
      userId,
      source: 'analytics-service',
      data,
    } as AnalyticsEvent, options);
  }

  // Event Retrieval
  async getEvent(eventId: string): Promise<Event | null> {
    return this.eventStore.get(eventId) || null;
  }

  async getEvents(filter: EventFilter): Promise<Event[]> {
    let events = Array.from(this.eventStore.values());

    // Apply filters
    if (filter.tenantId) {
      events = events.filter(event => event.tenantId === filter.tenantId);
    }

    if (filter.userId) {
      events = events.filter(event => event.userId === filter.userId);
    }

    if (filter.types && filter.types.length > 0) {
      events = events.filter(event => filter.types!.includes(event.type));
    }

    if (filter.fromDate) {
      events = events.filter(event => event.timestamp >= filter.fromDate!);
    }

    if (filter.toDate) {
      events = events.filter(event => event.timestamp <= filter.toDate!);
    }

    if (filter.source) {
      events = events.filter(event => event.source === filter.source);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    return events.slice(offset, offset + limit);
  }

  // Webhook Subscriptions
  async createSubscription(
    subscription: Omit<EventSubscription, 'id' | 'createdAt' | 'updatedAt' | 'successCount' | 'failureCount'>,
  ): Promise<EventSubscription> {
    const fullSubscription: EventSubscription = {
      ...subscription,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      successCount: 0,
      failureCount: 0,
    };

    this.subscriptions.set(fullSubscription.id, fullSubscription);
    this.logger.log(`Created webhook subscription ${fullSubscription.id} for ${fullSubscription.name}`);

    return fullSubscription;
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<EventSubscription>,
  ): Promise<EventSubscription | null> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return null;
    }

    const updatedSubscription: EventSubscription = {
      ...subscription,
      ...updates,
      id: subscription.id, // Prevent ID changes
      createdAt: subscription.createdAt, // Prevent creation date changes
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, updatedSubscription);
    return updatedSubscription;
  }

  async deleteSubscription(subscriptionId: string): Promise<boolean> {
    const deleted = this.subscriptions.delete(subscriptionId);
    if (deleted) {
      this.logger.log(`Deleted webhook subscription ${subscriptionId}`);
    }
    return deleted;
  }

  async getSubscription(subscriptionId: string): Promise<EventSubscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async getSubscriptions(tenantId?: string): Promise<EventSubscription[]> {
    let subscriptions = Array.from(this.subscriptions.values());

    if (tenantId) {
      subscriptions = subscriptions.filter(sub => sub.tenantId === tenantId);
    }

    return subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Event Deliveries
  async getDeliveries(
    subscriptionId?: string,
    eventId?: string,
    status?: EventDelivery['status'],
  ): Promise<EventDelivery[]> {
    let deliveries = Array.from(this.deliveries.values());

    if (subscriptionId) {
      deliveries = deliveries.filter(delivery => delivery.subscriptionId === subscriptionId);
    }

    if (eventId) {
      deliveries = deliveries.filter(delivery => delivery.eventId === eventId);
    }

    if (status) {
      deliveries = deliveries.filter(delivery => delivery.status === status);
    }

    return deliveries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async retryDelivery(deliveryId: string): Promise<boolean> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery || delivery.status === 'delivered') {
      return false;
    }

    delivery.status = 'pending';
    delivery.attempt = 0;
    this.deliveries.set(deliveryId, delivery);

    const event = await this.getEvent(delivery.eventId);
    if (event) {
      await this.scheduleWebhookDelivery(delivery, event);
    }

    return true;
  }

  // Statistics
  async getEventStats(tenantId?: string, fromDate?: Date, toDate?: Date): Promise<EventStats> {
    let events = Array.from(this.eventStore.values());

    // Apply filters
    if (tenantId) {
      events = events.filter(event => event.tenantId === tenantId);
    }

    if (fromDate) {
      events = events.filter(event => event.timestamp >= fromDate);
    }

    if (toDate) {
      events = events.filter(event => event.timestamp <= toDate);
    }

    // Calculate statistics
    const eventsByType: Record<string, number> = {};
    const eventsByTenant: Record<string, number> = {};

    events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByTenant[event.tenantId] = (eventsByTenant[event.tenantId] || 0) + 1;
    });

    const topEventTypes = Object.entries(eventsByType)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / events.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(event => event.timestamp >= oneDayAgo).length;

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByTenant,
      recentEvents,
      averageEventsPerDay: this.calculateAverageEventsPerDay(events),
      topEventTypes,
    };
  }

  async getWebhookStats(tenantId?: string): Promise<WebhookStats> {
    const subscriptions = await this.getSubscriptions(tenantId);
    const deliveries = Array.from(this.deliveries.values());

    const successfulDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const failedDeliveries = deliveries.filter(d => d.status === 'failed').length;
    const totalDeliveries = deliveries.length;

    const responseTimeSum = deliveries
      .filter(d => d.responseTime)
      .reduce((sum, d) => sum + (d.responseTime || 0), 0);
    const averageResponseTime = responseTimeSum / Math.max(successfulDeliveries, 1);

    const deliverySuccessRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    const failureReasons: Record<string, number> = {};
    deliveries
      .filter(d => d.status === 'failed' && d.error)
      .forEach(d => {
        const reason = d.error!.substring(0, 100); // Truncate long errors
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });

    const topFailureReasons = Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.filter(s => s.active).length,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      averageResponseTime,
      deliverySuccessRate,
      topFailureReasons,
    };
  }

  // Private methods
  private async storeEvent(event: Event): Promise<void> {
    this.eventStore.set(event.id, event);
    
    // In a real implementation, persist to database
    // Also implement cleanup of old events
    if (this.eventStore.size > 10000) {
      const oldestEvents = Array.from(this.eventStore.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(0, 1000);
      
      oldestEvents.forEach(([id]) => this.eventStore.delete(id));
    }
  }

  private async processWebhooks(event: Event, options: EventPublishOptions): Promise<void> {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => 
        sub.active && 
        sub.tenantId === event.tenantId &&
        sub.eventTypes.includes(event.type)
      );

    for (const subscription of matchingSubscriptions) {
      if (this.matchesFilters(event, subscription.filters)) {
        await this.createWebhookDelivery(subscription, event);
      }
    }
  }

  private matchesFilters(event: Event, filters?: Record<string, any>): boolean {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    // Simple filter matching - extend as needed
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'userId' && event.userId !== value) {
        return false;
      }
      if (key === 'source' && event.source !== value) {
        return false;
      }
      // Add more filter logic as needed
    }

    return true;
  }

  private async createWebhookDelivery(
    subscription: EventSubscription,
    event: Event,
  ): Promise<void> {
    const delivery: EventDelivery = {
      id: uuidv4(),
      subscriptionId: subscription.id,
      eventId: event.id,
      webhookUrl: subscription.webhookUrl,
      method: subscription.method,
      headers: subscription.headers || {},
      payload: this.buildWebhookPayload(event, subscription),
      attempt: 0,
      maxAttempts: subscription.retryPolicy.maxAttempts,
      status: 'pending',
      scheduledAt: new Date(),
      createdAt: new Date(),
    };

    this.deliveries.set(delivery.id, delivery);
    await this.scheduleWebhookDelivery(delivery, event);
  }

  private buildWebhookPayload(event: Event, subscription: EventSubscription): any {
    return {
      subscriptionId: subscription.id,
      event: {
        id: event.id,
        type: event.type,
        tenantId: event.tenantId,
        userId: event.userId,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
        metadata: event.metadata,
      },
      deliveryAttempt: 1,
    };
  }

  private async scheduleWebhookDelivery(
    delivery: EventDelivery,
    event: Event,
  ): Promise<void> {
    try {
      await this.queueService.addWebhookJob({
        url: delivery.webhookUrl,
        method: delivery.method as any,
        headers: delivery.headers,
        payload: delivery.payload,
        tenantId: event.tenantId,
        eventType: event.type,
        eventId: event.id,
        retryAttempts: delivery.maxAttempts,
      });

      this.logger.debug(`Scheduled webhook delivery ${delivery.id} for event ${event.id}`);
    } catch (error) {
      this.logger.error(`Failed to schedule webhook delivery ${delivery.id}`, error);
      delivery.status = 'failed';
      delivery.error = error.message;
      this.deliveries.set(delivery.id, delivery);
    }
  }

  private startEventProcessing(): void {
    const interval = this.configService.get('EVENT_PROCESSING_INTERVAL', 5000);
    
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        this.isProcessing = true;
        try {
          await this.processFailedDeliveries();
        } catch (error) {
          this.logger.error('Error processing failed deliveries', error);
        } finally {
          this.isProcessing = false;
        }
      }
    }, interval);
  }

  private async processFailedDeliveries(): Promise<void> {
    const failedDeliveries = Array.from(this.deliveries.values())
      .filter(delivery => 
        delivery.status === 'failed' && 
        delivery.attempt < delivery.maxAttempts
      );

    for (const delivery of failedDeliveries) {
      const event = await this.getEvent(delivery.eventId);
      if (event) {
        await this.scheduleWebhookDelivery(delivery, event);
      }
    }
  }

  private calculateAverageEventsPerDay(events: Event[]): number {
    if (events.length === 0) return 0;

    const oldestEvent = events.reduce((oldest, event) => 
      event.timestamp < oldest.timestamp ? event : oldest
    );

    const daysSinceOldest = Math.max(
      (Date.now() - oldestEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24),
      1
    );

    return events.length / daysSinceOldest;
  }
}