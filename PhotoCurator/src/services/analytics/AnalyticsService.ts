import { PreferencesService } from '../preferences/PreferencesService';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: Date;
}

export interface UserProperties {
  userId?: string;
  appVersion: string;
  platform: string;
  deviceModel?: string;
  osVersion?: string;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private preferencesService: PreferencesService;
  private eventQueue: AnalyticsEvent[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private userProperties: UserProperties = {
    appVersion: '1.0.0',
    platform: 'react-native',
  };

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  constructor() {
    this.preferencesService = PreferencesService.getInstance();
  }

  async initialize(userProperties: Partial<UserProperties>): Promise<void> {
    this.userProperties = { ...this.userProperties, ...userProperties };
    
    // Track app launch
    this.trackEvent('app_launched', {
      platform: this.userProperties.platform,
      version: this.userProperties.appVersion,
    });
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.preferencesService.isAnalyticsEnabled()) {
      return;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        userId: this.userProperties.userId,
        platform: this.userProperties.platform,
        appVersion: this.userProperties.appVersion,
      },
      timestamp: new Date(),
    };

    this.eventQueue.push(event);
    this.flushEventsIfNeeded();
  }

  trackPerformance(metricName: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.preferencesService.isAnalyticsEnabled()) {
      return;
    }

    const metric: PerformanceMetric = {
      name: metricName,
      duration,
      metadata: {
        ...metadata,
        userId: this.userProperties.userId,
        platform: this.userProperties.platform,
        appVersion: this.userProperties.appVersion,
      },
      timestamp: new Date(),
    };

    this.performanceQueue.push(metric);
    this.flushPerformanceIfNeeded();
  }

  // Convenience methods for common events
  trackScreenView(screenName: string, properties?: Record<string, any>): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  trackUserAction(action: string, target: string, properties?: Record<string, any>): void {
    this.trackEvent('user_action', {
      action,
      target,
      ...properties,
    });
  }

  trackPhotoImport(source: string, count: number, duration: number): void {
    this.trackEvent('photo_import', {
      source,
      photo_count: count,
      duration_ms: duration,
    });
  }

  trackPhotoProcessing(operation: string, count: number, duration: number, success: boolean): void {
    this.trackEvent('photo_processing', {
      operation,
      photo_count: count,
      duration_ms: duration,
      success,
    });
  }

  trackCurationSession(goal: string, photosProcessed: number, photosSelected: number, duration: number): void {
    this.trackEvent('curation_session', {
      curation_goal: goal,
      photos_processed: photosProcessed,
      photos_selected: photosSelected,
      duration_ms: duration,
      selection_rate: photosSelected / photosProcessed,
    });
  }

  trackPhotoEdit(editType: string, success: boolean, duration: number): void {
    this.trackEvent('photo_edit', {
      edit_type: editType,
      success,
      duration_ms: duration,
    });
  }

  trackSyncOperation(operation: string, itemCount: number, success: boolean, duration: number): void {
    this.trackEvent('sync_operation', {
      operation,
      item_count: itemCount,
      success,
      duration_ms: duration,
    });
  }

  trackError(error: Error, context?: string, metadata?: Record<string, any>): void {
    this.trackEvent('error_occurred', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.substring(0, 1000), // Limit stack trace length
      context,
      ...metadata,
    });
  }

  // Performance tracking helpers
  startPerformanceTimer(metricName: string): () => void {
    const startTime = Date.now();
    
    return (metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      this.trackPerformance(metricName, duration, metadata);
    };
  }

  async measureAsync<T>(metricName: string, operation: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.trackPerformance(metricName, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackPerformance(metricName, duration, { ...metadata, success: false });
      throw error;
    }
  }

  // User properties
  setUserId(userId: string): void {
    this.userProperties.userId = userId;
  }

  setUserProperty(key: string, value: any): void {
    this.userProperties = {
      ...this.userProperties,
      [key]: value,
    };
  }

  // Queue management
  private flushEventsIfNeeded(): void {
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  private flushPerformanceIfNeeded(): void {
    if (this.performanceQueue.length >= 5) {
      this.flushPerformance();
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In a real implementation, send to analytics service
      console.log('Analytics Events:', events);
      
      // For now, just log to console in development
      if (__DEV__) {
        events.forEach(event => {
          console.log(`[Analytics] ${event.name}:`, event.properties);
        });
      }
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  private async flushPerformance(): Promise<void> {
    if (this.performanceQueue.length === 0) {
      return;
    }

    const metrics = [...this.performanceQueue];
    this.performanceQueue = [];

    try {
      // In a real implementation, send to performance monitoring service
      console.log('Performance Metrics:', metrics);
      
      if (__DEV__) {
        metrics.forEach(metric => {
          console.log(`[Performance] ${metric.name}: ${metric.duration}ms`, metric.metadata);
        });
      }
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
      // Re-queue metrics on failure
      this.performanceQueue.unshift(...metrics);
    }
  }

  // Manual flush methods
  async flush(): Promise<void> {
    await Promise.all([
      this.flushEvents(),
      this.flushPerformance(),
    ]);
  }

  // Cleanup
  async shutdown(): Promise<void> {
    await this.flush();
  }
}