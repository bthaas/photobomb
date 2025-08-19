import { Platform } from 'react-native';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface UserInteraction {
  type: string;
  screen: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface MLOperation {
  operation: string;
  modelName?: string;
  inputSize?: { width: number; height: number };
  duration: number;
  success: boolean;
  error?: string;
}

export interface MemoryUsage {
  component: string;
  heapUsed: number;
  heapTotal: number;
  external: number;
  timestamp: number;
}

export interface PerformanceReport {
  appStartupTime: number;
  averageMLProcessingTime: number;
  memoryUsageStats: {
    average: number;
    peak: number;
    current: number;
  };
  userInteractionStats: {
    totalInteractions: number;
    averageResponseTime: number;
    slowInteractions: UserInteraction[];
  };
  errorRate: number;
  crashCount: number;
  batteryImpact: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private interactions: UserInteraction[] = [];
  private mlOperations: MLOperation[] = [];
  private memoryUsages: MemoryUsage[] = [];
  private startupTime: number = 0;
  private maxMetricsCount = 1000;
  private reportingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startupTime = Date.now();
    this.setupPerformanceObserver();
    this.startPeriodicReporting();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private setupPerformanceObserver(): void {
    // Monitor React Native performance if available
    if (global.performance && global.performance.mark) {
      // Set up performance observers for navigation, rendering, etc.
      this.setupNavigationObserver();
      this.setupRenderObserver();
    }
  }

  private setupNavigationObserver(): void {
    // This would integrate with React Navigation to track screen transitions
    // For now, we'll provide methods to manually track navigation
  }

  private setupRenderObserver(): void {
    // Monitor render performance
    // This would integrate with React DevTools or custom render tracking
  }

  private startPeriodicReporting(): void {
    // Generate performance reports every 5 minutes
    this.reportingInterval = setInterval(() => {
      this.generateAndLogReport();
    }, 5 * 60 * 1000);
  }

  // Public API methods

  trackUserInteraction(interaction: UserInteraction): void {
    const timestampedInteraction = {
      ...interaction,
      timestamp: Date.now(),
    };

    this.interactions.push(timestampedInteraction);
    this.trimArray(this.interactions, this.maxMetricsCount);

    // Track as metric
    this.recordMetric('user_interaction', interaction.duration || 0, {
      type: interaction.type,
      screen: interaction.screen,
    });
  }

  trackMLProcessingTime(operation: MLOperation): void {
    this.mlOperations.push({
      ...operation,
      timestamp: Date.now(),
    });
    this.trimArray(this.mlOperations, this.maxMetricsCount);

    // Track as metric
    this.recordMetric('ml_processing_time', operation.duration, {
      operation: operation.operation,
      modelName: operation.modelName,
      success: operation.success,
    });
  }

  trackMemoryUsage(component: string, usage: MemoryUsage): void {
    const memoryUsage = {
      ...usage,
      component,
      timestamp: Date.now(),
    };

    this.memoryUsages.push(memoryUsage);
    this.trimArray(this.memoryUsages, this.maxMetricsCount);

    // Track as metric
    this.recordMetric('memory_usage', usage.heapUsed, {
      component,
      heapTotal: usage.heapTotal,
      external: usage.external,
    });
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    this.trimArray(this.metrics, this.maxMetricsCount);
  }

  // Timing utilities

  startTiming(name: string): () => number {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(`timing_${name}`, duration);
      return duration;
    };
  }

  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.recordMetric(`async_timing_${name}`, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetric(`async_timing_${name}`, duration, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  measureSync<T>(name: string, operation: () => T): T {
    const startTime = Date.now();
    
    try {
      const result = operation();
      const duration = Date.now() - startTime;
      this.recordMetric(`sync_timing_${name}`, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetric(`sync_timing_${name}`, duration, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  // App lifecycle tracking

  markAppStartupComplete(): void {
    const startupDuration = Date.now() - this.startupTime;
    this.recordMetric('app_startup_time', startupDuration);
  }

  trackScreenLoad(screenName: string, loadTime: number): void {
    this.recordMetric('screen_load_time', loadTime, { screen: screenName });
  }

  trackAPICall(endpoint: string, duration: number, success: boolean): void {
    this.recordMetric('api_call_time', duration, { 
      endpoint, 
      success,
      platform: Platform.OS 
    });
  }

  // Report generation

  generatePerformanceReport(): PerformanceReport {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Filter recent metrics
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    const recentInteractions = this.interactions.filter(i => i.timestamp > oneHourAgo);
    const recentMLOperations = this.mlOperations.filter(op => op.timestamp > oneHourAgo);
    const recentMemoryUsages = this.memoryUsages.filter(m => m.timestamp > oneHourAgo);

    // Calculate startup time
    const startupMetrics = recentMetrics.filter(m => m.name === 'app_startup_time');
    const appStartupTime = startupMetrics.length > 0 
      ? startupMetrics[startupMetrics.length - 1].value 
      : 0;

    // Calculate average ML processing time
    const mlProcessingTimes = recentMLOperations.map(op => op.duration);
    const averageMLProcessingTime = mlProcessingTimes.length > 0
      ? mlProcessingTimes.reduce((sum, time) => sum + time, 0) / mlProcessingTimes.length
      : 0;

    // Calculate memory usage stats
    const memoryValues = recentMemoryUsages.map(m => m.heapUsed);
    const memoryUsageStats = {
      average: memoryValues.length > 0 
        ? memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length 
        : 0,
      peak: memoryValues.length > 0 ? Math.max(...memoryValues) : 0,
      current: memoryValues.length > 0 ? memoryValues[memoryValues.length - 1] : 0,
    };

    // Calculate user interaction stats
    const interactionTimes = recentInteractions
      .filter(i => i.duration !== undefined)
      .map(i => i.duration!);
    
    const slowInteractions = recentInteractions.filter(i => 
      i.duration !== undefined && i.duration > 1000 // > 1 second
    );

    const userInteractionStats = {
      totalInteractions: recentInteractions.length,
      averageResponseTime: interactionTimes.length > 0
        ? interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length
        : 0,
      slowInteractions,
    };

    // Calculate error rate
    const totalOperations = recentMLOperations.length;
    const failedOperations = recentMLOperations.filter(op => !op.success).length;
    const errorRate = totalOperations > 0 ? (failedOperations / totalOperations) * 100 : 0;

    return {
      appStartupTime,
      averageMLProcessingTime,
      memoryUsageStats,
      userInteractionStats,
      errorRate,
      crashCount: 0, // Would be tracked separately
      batteryImpact: 0, // Would require native module
    };
  }

  private generateAndLogReport(): void {
    const report = this.generatePerformanceReport();
    console.log('Performance Report:', JSON.stringify(report, null, 2));
    
    // In a real app, you might send this to analytics service
    this.sendToAnalytics(report);
  }

  private sendToAnalytics(report: PerformanceReport): void {
    // This would send the report to your analytics service
    // For now, we'll just log it
    console.log('Sending performance report to analytics...');
  }

  // Utility methods

  private trimArray<T>(array: T[], maxLength: number): void {
    if (array.length > maxLength) {
      array.splice(0, array.length - maxLength);
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getInteractions(type?: string): UserInteraction[] {
    if (type) {
      return this.interactions.filter(i => i.type === type);
    }
    return [...this.interactions];
  }

  getMLOperations(operation?: string): MLOperation[] {
    if (operation) {
      return this.mlOperations.filter(op => op.operation === operation);
    }
    return [...this.mlOperations];
  }

  clearMetrics(): void {
    this.metrics = [];
    this.interactions = [];
    this.mlOperations = [];
    this.memoryUsages = [];
  }

  destroy(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    this.clearMetrics();
  }
}

// Performance hooks for React components
export const usePerformanceTracking = () => {
  const monitor = PerformanceMonitor.getInstance();

  const trackInteraction = (type: string, screen: string, metadata?: Record<string, any>) => {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      monitor.trackUserInteraction({ type, screen, duration, metadata });
    };
  };

  const measureOperation = async <T>(
    name: string, 
    operation: () => Promise<T>
  ): Promise<T> => {
    return monitor.measureAsync(name, operation);
  };

  return {
    trackInteraction,
    measureOperation,
    recordMetric: monitor.recordMetric.bind(monitor),
    startTiming: monitor.startTiming.bind(monitor),
  };
};

export const performanceMonitor = PerformanceMonitor.getInstance();