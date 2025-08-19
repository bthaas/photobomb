import { PreferencesService } from '../preferences/PreferencesService';

export interface CrashReport {
  id: string;
  timestamp: Date;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    userId?: string;
    appVersion: string;
    platform: string;
    deviceModel?: string;
    osVersion?: string;
    screenName?: string;
    userAction?: string;
  };
  breadcrumbs: Breadcrumb[];
  deviceInfo: {
    memoryUsage?: number;
    batteryLevel?: number;
    networkType?: string;
    diskSpace?: number;
  };
}

export interface Breadcrumb {
  timestamp: Date;
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export class CrashReportingService {
  private static instance: CrashReportingService;
  private preferencesService: PreferencesService;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private context: Partial<CrashReport['context']> = {
    appVersion: '1.0.0',
    platform: 'react-native',
  };

  static getInstance(): CrashReportingService {
    if (!CrashReportingService.instance) {
      CrashReportingService.instance = new CrashReportingService();
    }
    return CrashReportingService.instance;
  }

  constructor() {
    this.preferencesService = PreferencesService.getInstance();
    this.setupGlobalErrorHandlers();
  }

  initialize(context: Partial<CrashReport['context']>): void {
    this.context = { ...this.context, ...context };
    this.addBreadcrumb('system', 'Crash reporting initialized', 'info');
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    const originalHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      this.reportError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        type: 'unhandled_promise_rejection',
        reason: event.reason,
      });
      
      if (originalHandler) {
        originalHandler(event);
      }
    };

    // Handle JavaScript errors
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.reportError(error, {
        type: 'javascript_error',
        isFatal,
      });
      
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }

  reportError(error: Error, metadata?: Record<string, any>): void {
    if (!this.preferencesService.getPreferences().crashReportingEnabled) {
      return;
    }

    const crashReport: CrashReport = {
      id: this.generateReportId(),
      timestamp: new Date(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        ...this.context,
        ...metadata,
      },
      breadcrumbs: [...this.breadcrumbs],
      deviceInfo: this.collectDeviceInfo(),
    };

    this.addBreadcrumb('error', `Error reported: ${error.name}`, 'error', {
      errorMessage: error.message,
    });

    this.sendCrashReport(crashReport);
  }

  addBreadcrumb(category: string, message: string, level: Breadcrumb['level'] = 'info', data?: Record<string, any>): void {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date(),
      category,
      message,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  // Convenience methods for common breadcrumbs
  addNavigationBreadcrumb(screenName: string): void {
    this.addBreadcrumb('navigation', `Navigated to ${screenName}`, 'info', {
      screenName,
    });
    this.context.screenName = screenName;
  }

  addUserActionBreadcrumb(action: string, target?: string): void {
    this.addBreadcrumb('user', `User ${action}${target ? ` on ${target}` : ''}`, 'info', {
      action,
      target,
    });
    this.context.userAction = action;
  }

  addNetworkBreadcrumb(url: string, method: string, statusCode?: number): void {
    this.addBreadcrumb('network', `${method} ${url}`, statusCode && statusCode >= 400 ? 'error' : 'info', {
      url,
      method,
      statusCode,
    });
  }

  addPerformanceBreadcrumb(operation: string, duration: number): void {
    const level = duration > 5000 ? 'warning' : 'info';
    this.addBreadcrumb('performance', `${operation} took ${duration}ms`, level, {
      operation,
      duration,
    });
  }

  // Context management
  setUserId(userId: string): void {
    this.context.userId = userId;
  }

  setContext(key: string, value: any): void {
    this.context = {
      ...this.context,
      [key]: value,
    };
  }

  clearContext(): void {
    this.context = {
      appVersion: this.context.appVersion,
      platform: this.context.platform,
    };
  }

  private generateReportId(): string {
    return `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private collectDeviceInfo(): CrashReport['deviceInfo'] {
    // In a real implementation, collect actual device info
    return {
      memoryUsage: this.getMemoryUsage(),
      batteryLevel: this.getBatteryLevel(),
      networkType: this.getNetworkType(),
      diskSpace: this.getDiskSpace(),
    };
  }

  private getMemoryUsage(): number | undefined {
    // Placeholder - would use actual memory monitoring
    return undefined;
  }

  private getBatteryLevel(): number | undefined {
    // Placeholder - would use react-native-device-info or similar
    return undefined;
  }

  private getNetworkType(): string | undefined {
    // Placeholder - would use @react-native-community/netinfo
    return undefined;
  }

  private getDiskSpace(): number | undefined {
    // Placeholder - would use react-native-fs or similar
    return undefined;
  }

  private async sendCrashReport(report: CrashReport): Promise<void> {
    try {
      // In a real implementation, send to crash reporting service (Sentry, Bugsnag, etc.)
      console.error('Crash Report:', report);
      
      if (__DEV__) {
        console.group('🚨 Crash Report');
        console.error('Error:', report.error);
        console.log('Context:', report.context);
        console.log('Breadcrumbs:', report.breadcrumbs);
        console.log('Device Info:', report.deviceInfo);
        console.groupEnd();
      }

      // Store locally for later upload if network is unavailable
      await this.storeCrashReportLocally(report);
    } catch (error) {
      console.error('Failed to send crash report:', error);
    }
  }

  private async storeCrashReportLocally(report: CrashReport): Promise<void> {
    try {
      // In a real implementation, store in AsyncStorage or SQLite
      const key = `@PhotoCurator:crash_report_${report.id}`;
      // await AsyncStorage.setItem(key, JSON.stringify(report));
    } catch (error) {
      console.error('Failed to store crash report locally:', error);
    }
  }

  // Test methods for development
  testCrash(): void {
    if (__DEV__) {
      throw new Error('Test crash for development');
    }
  }

  testAsyncError(): void {
    if (__DEV__) {
      setTimeout(() => {
        throw new Error('Test async error for development');
      }, 100);
    }
  }

  testPromiseRejection(): void {
    if (__DEV__) {
      Promise.reject(new Error('Test promise rejection for development'));
    }
  }

  // Cleanup
  async flush(): Promise<void> {
    // Upload any pending crash reports
    this.addBreadcrumb('system', 'Flushing crash reports', 'info');
  }

  async shutdown(): Promise<void> {
    await this.flush();
    this.addBreadcrumb('system', 'Crash reporting shutdown', 'info');
  }
}