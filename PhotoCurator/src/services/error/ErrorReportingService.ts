import { AppError, ErrorContext, ErrorSeverity } from '../../types/error';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorReport {
  id: string;
  error: AppError;
  context?: ErrorContext;
  deviceInfo: DeviceInfo;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  appVersion: string;
  buildNumber: string;
}

export interface AnalyticsProvider {
  reportError(report: ErrorReport): Promise<void>;
  reportEvent(event: string, properties?: Record<string, any>): Promise<void>;
}

export class ErrorReportingService {
  private analyticsProviders: AnalyticsProvider[] = [];
  private sessionId: string;
  private userId?: string;
  private deviceInfo: DeviceInfo;
  private errorQueue: ErrorReport[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.getDeviceInfo();
    this.loadQueuedErrors();
  }

  /**
   * Add analytics provider (e.g., Crashlytics, Sentry, etc.)
   */
  public addAnalyticsProvider(provider: AnalyticsProvider): void {
    this.analyticsProviders.push(provider);
  }

  /**
   * Set current user ID for error reporting
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Set online/offline status
   */
  public setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    
    if (isOnline && this.errorQueue.length > 0) {
      this.flushErrorQueue();
    }
  }

  /**
   * Report error to analytics services
   */
  public async reportError(error: Error | AppError, context?: ErrorContext): Promise<void> {
    try {
      const appError = error instanceof AppError ? error : this.createAppErrorFromError(error);
      
      const report: ErrorReport = {
        id: this.generateErrorId(),
        error: appError,
        context: {
          ...context,
          userId: this.userId,
          sessionId: this.sessionId,
        },
        deviceInfo: this.deviceInfo,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        userId: this.userId,
      };

      // Only report high severity errors or above to external services
      if (appError.severity === ErrorSeverity.HIGH || appError.severity === ErrorSeverity.CRITICAL) {
        if (this.isOnline) {
          await this.sendErrorReport(report);
        } else {
          await this.queueErrorReport(report);
        }
      }

      // Always log locally for debugging
      this.logErrorLocally(report);

    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      // Don't throw here to avoid infinite error loops
    }
  }

  /**
   * Report custom event for analytics
   */
  public async reportEvent(event: string, properties?: Record<string, any>): Promise<void> {
    try {
      const eventProperties = {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      };

      if (this.isOnline) {
        await Promise.all(
          this.analyticsProviders.map(provider => 
            provider.reportEvent(event, eventProperties)
          )
        );
      }
    } catch (error) {
      console.error('Failed to report event:', error);
    }
  }

  /**
   * Get error statistics for debugging
   */
  public async getErrorStatistics(): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
  }> {
    try {
      const stats = await AsyncStorage.getItem('error_statistics');
      return stats ? JSON.parse(stats) : {
        totalErrors: 0,
        errorsByType: {},
        errorsBySeverity: {},
      };
    } catch (error) {
      console.error('Failed to get error statistics:', error);
      return {
        totalErrors: 0,
        errorsByType: {},
        errorsBySeverity: {},
      };
    }
  }

  /**
   * Clear error statistics (for testing or privacy)
   */
  public async clearErrorStatistics(): Promise<void> {
    try {
      await AsyncStorage.removeItem('error_statistics');
      await AsyncStorage.removeItem('error_queue');
    } catch (error) {
      console.error('Failed to clear error statistics:', error);
    }
  }

  /**
   * Send error report to all analytics providers
   */
  private async sendErrorReport(report: ErrorReport): Promise<void> {
    await Promise.all(
      this.analyticsProviders.map(async provider => {
        try {
          await provider.reportError(report);
        } catch (error) {
          console.error('Analytics provider failed to report error:', error);
        }
      })
    );
  }

  /**
   * Queue error report for later sending when online
   */
  private async queueErrorReport(report: ErrorReport): Promise<void> {
    this.errorQueue.push(report);
    
    // Limit queue size to prevent memory issues
    if (this.errorQueue.length > 100) {
      this.errorQueue = this.errorQueue.slice(-50); // Keep last 50 errors
    }

    try {
      await AsyncStorage.setItem('error_queue', JSON.stringify(this.errorQueue));
    } catch (error) {
      console.error('Failed to save error queue:', error);
    }
  }

  /**
   * Flush queued errors when coming back online
   */
  private async flushErrorQueue(): Promise<void> {
    const queueToFlush = [...this.errorQueue];
    this.errorQueue = [];

    try {
      await AsyncStorage.removeItem('error_queue');
      
      for (const report of queueToFlush) {
        await this.sendErrorReport(report);
      }
    } catch (error) {
      console.error('Failed to flush error queue:', error);
      // Re-queue failed reports
      this.errorQueue = [...queueToFlush, ...this.errorQueue];
    }
  }

  /**
   * Load queued errors from storage
   */
  private async loadQueuedErrors(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('error_queue');
      if (queueData) {
        this.errorQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load error queue:', error);
    }
  }

  /**
   * Log error locally for debugging
   */
  private logErrorLocally(report: ErrorReport): void {
    if (__DEV__) {
      console.group(`🚨 Error Report: ${report.error.type}`);
      console.error('Message:', report.error.message);
      console.log('Severity:', report.error.severity);
      console.log('Context:', report.context);
      console.log('Stack:', report.error.stack);
      console.groupEnd();
    }

    // Update local statistics
    this.updateErrorStatistics(report);
  }

  /**
   * Update local error statistics
   */
  private async updateErrorStatistics(report: ErrorReport): Promise<void> {
    try {
      const stats = await this.getErrorStatistics();
      
      stats.totalErrors++;
      stats.errorsByType[report.error.type] = (stats.errorsByType[report.error.type] || 0) + 1;
      stats.errorsBySeverity[report.error.severity] = (stats.errorsBySeverity[report.error.severity] || 0) + 1;

      await AsyncStorage.setItem('error_statistics', JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to update error statistics:', error);
    }
  }

  /**
   * Create AppError from generic Error
   */
  private createAppErrorFromError(error: Error): AppError {
    return new (class extends AppError {
      protected getDefaultUserMessage(): string {
        return 'An unexpected error occurred. Please try again.';
      }
    })(error.message, 'UNKNOWN' as any, ErrorSeverity.MEDIUM);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    // In a real app, you'd use react-native-device-info or similar
    return {
      platform: 'react-native',
      version: '0.72.0', // This would come from device info
      model: 'Unknown', // This would come from device info
      appVersion: '1.0.0', // This would come from app config
      buildNumber: '1', // This would come from app config
    };
  }
}