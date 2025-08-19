import { NativeModules, DeviceEventEmitter } from 'react-native';

export interface MemoryStats {
  totalMemory: number;
  availableMemory: number;
  usedMemory: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryThresholds {
  lowMemoryThreshold: number; // MB
  mediumMemoryThreshold: number; // MB
  highMemoryThreshold: number; // MB
  criticalMemoryThreshold: number; // MB
}

export class MemoryManager {
  private static instance: MemoryManager;
  private memoryListeners: Array<(stats: MemoryStats) => void> = [];
  private cleanupCallbacks: Array<() => Promise<void>> = [];
  private thresholds: MemoryThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastMemoryStats: MemoryStats | null = null;

  private constructor() {
    this.thresholds = {
      lowMemoryThreshold: 100, // 100MB
      mediumMemoryThreshold: 75, // 75MB
      highMemoryThreshold: 50, // 50MB
      criticalMemoryThreshold: 25, // 25MB
    };

    this.setupMemoryWarningListener();
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private setupMemoryWarningListener(): void {
    // Listen for system memory warnings
    DeviceEventEmitter.addListener('memoryWarning', () => {
      this.handleMemoryPressure('critical');
    });
  }

  private startMemoryMonitoring(): void {
    // Monitor memory usage every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 5000);
  }

  private async checkMemoryUsage(): Promise<void> {
    try {
      const stats = await this.getMemoryStats();
      this.lastMemoryStats = stats;

      // Notify listeners
      this.memoryListeners.forEach(listener => listener(stats));

      // Handle memory pressure
      if (stats.memoryPressure !== 'low') {
        await this.handleMemoryPressure(stats.memoryPressure);
      }
    } catch (error) {
      console.error('Failed to check memory usage:', error);
    }
  }

  async getMemoryStats(): Promise<MemoryStats> {
    try {
      // This would use a native module to get actual memory stats
      // For now, we'll simulate the data
      const totalMemory = 4096; // 4GB in MB
      const usedMemory = Math.random() * 2048; // Random used memory
      const availableMemory = totalMemory - usedMemory;

      let memoryPressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (availableMemory < this.thresholds.criticalMemoryThreshold) {
        memoryPressure = 'critical';
      } else if (availableMemory < this.thresholds.highMemoryThreshold) {
        memoryPressure = 'high';
      } else if (availableMemory < this.thresholds.mediumMemoryThreshold) {
        memoryPressure = 'medium';
      }

      return {
        totalMemory,
        availableMemory,
        usedMemory,
        memoryPressure,
      };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      throw error;
    }
  }

  private async handleMemoryPressure(level: 'medium' | 'high' | 'critical'): Promise<void> {
    console.warn(`Memory pressure detected: ${level}`);

    // Execute cleanup callbacks based on pressure level
    const callbacksToExecute = this.cleanupCallbacks.slice(0, this.getCleanupCount(level));
    
    for (const callback of callbacksToExecute) {
      try {
        await callback();
      } catch (error) {
        console.error('Cleanup callback failed:', error);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  private getCleanupCount(level: 'medium' | 'high' | 'critical'): number {
    switch (level) {
      case 'medium':
        return Math.ceil(this.cleanupCallbacks.length * 0.3);
      case 'high':
        return Math.ceil(this.cleanupCallbacks.length * 0.6);
      case 'critical':
        return this.cleanupCallbacks.length;
      default:
        return 0;
    }
  }

  registerMemoryListener(callback: (stats: MemoryStats) => void): () => void {
    this.memoryListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.memoryListeners.indexOf(callback);
      if (index > -1) {
        this.memoryListeners.splice(index, 1);
      }
    };
  }

  registerCleanupCallback(callback: () => Promise<void>): () => void {
    this.cleanupCallbacks.push(callback);
    
    // Return unregister function
    return () => {
      const index = this.cleanupCallbacks.indexOf(callback);
      if (index > -1) {
        this.cleanupCallbacks.splice(index, 1);
      }
    };
  }

  async forceCleanup(): Promise<void> {
    console.log('Forcing memory cleanup...');
    
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Force cleanup callback failed:', error);
      }
    }

    if (global.gc) {
      global.gc();
    }
  }

  getLastMemoryStats(): MemoryStats | null {
    return this.lastMemoryStats;
  }

  updateThresholds(newThresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.memoryListeners = [];
    this.cleanupCallbacks = [];
  }
}

// Memory-aware processing utilities
export class MemoryAwareProcessor {
  private memoryManager: MemoryManager;
  private processingQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private maxConcurrentOperations = 3;

  constructor() {
    this.memoryManager = MemoryManager.getInstance();
    this.setupMemoryListener();
  }

  private setupMemoryListener(): void {
    this.memoryManager.registerMemoryListener((stats) => {
      // Adjust concurrent operations based on memory pressure
      switch (stats.memoryPressure) {
        case 'low':
          this.maxConcurrentOperations = 3;
          break;
        case 'medium':
          this.maxConcurrentOperations = 2;
          break;
        case 'high':
          this.maxConcurrentOperations = 1;
          break;
        case 'critical':
          this.maxConcurrentOperations = 0;
          // Pause processing
          break;
      }
    });
  }

  async processWithMemoryCheck<T>(
    operation: () => Promise<T>,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const stats = await this.memoryManager.getMemoryStats();
          
          // Check if we have enough memory
          if (stats.memoryPressure === 'critical') {
            throw new Error('Insufficient memory for operation');
          }

          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Add to queue based on priority
      if (priority === 'high') {
        this.processingQueue.unshift(task);
      } else {
        this.processingQueue.push(task);
      }

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const concurrentTasks: Promise<any>[] = [];

    while (
      this.processingQueue.length > 0 && 
      concurrentTasks.length < this.maxConcurrentOperations
    ) {
      const task = this.processingQueue.shift();
      if (task) {
        concurrentTasks.push(task());
      }
    }

    if (concurrentTasks.length > 0) {
      try {
        await Promise.all(concurrentTasks);
      } catch (error) {
        console.error('Processing queue error:', error);
      }
    }

    this.isProcessing = false;

    // Continue processing if there are more tasks
    if (this.processingQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  getQueueLength(): number {
    return this.processingQueue.length;
  }

  clearQueue(): void {
    this.processingQueue = [];
  }
}

export const memoryManager = MemoryManager.getInstance();
export const memoryAwareProcessor = new MemoryAwareProcessor();