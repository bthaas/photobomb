import { DeviceEventEmitter, NativeModules } from 'react-native';
import { memoryManager } from './MemoryManager';
import { performanceMonitor } from './PerformanceMonitor';

export interface BatteryInfo {
  level: number; // 0-1
  isCharging: boolean;
  chargingType?: 'usb' | 'ac' | 'wireless';
  temperature?: number; // Celsius
  health?: 'good' | 'overheat' | 'dead' | 'over_voltage' | 'unknown';
}

export interface PowerMode {
  name: 'high_performance' | 'balanced' | 'power_saver' | 'ultra_power_saver';
  description: string;
  settings: {
    maxConcurrentOperations: number;
    processingInterval: number; // ms between processing batches
    useGPUAcceleration: boolean;
    backgroundProcessingEnabled: boolean;
    imageQuality: 'high' | 'medium' | 'low';
    cacheSize: number; // MB
    networkSyncEnabled: boolean;
  };
}

export interface BatteryOptimizationConfig {
  autoAdjustPowerMode: boolean;
  lowBatteryThreshold: number; // 0-1
  criticalBatteryThreshold: number; // 0-1
  thermalThrottlingEnabled: boolean;
  maxTemperature: number; // Celsius
  chargingBoostEnabled: boolean;
}

export class BatteryOptimizer {
  private static instance: BatteryOptimizer;
  private currentBatteryInfo: BatteryInfo | null = null;
  private currentPowerMode: PowerMode;
  private config: BatteryOptimizationConfig;
  private batteryListeners: Array<(info: BatteryInfo) => void> = [];
  private powerModeListeners: Array<(mode: PowerMode) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  private powerModes: Record<string, PowerMode> = {
    high_performance: {
      name: 'high_performance',
      description: 'Maximum performance, higher battery usage',
      settings: {
        maxConcurrentOperations: 4,
        processingInterval: 100,
        useGPUAcceleration: true,
        backgroundProcessingEnabled: true,
        imageQuality: 'high',
        cacheSize: 200,
        networkSyncEnabled: true,
      },
    },
    balanced: {
      name: 'balanced',
      description: 'Balanced performance and battery life',
      settings: {
        maxConcurrentOperations: 2,
        processingInterval: 500,
        useGPUAcceleration: true,
        backgroundProcessingEnabled: true,
        imageQuality: 'medium',
        cacheSize: 100,
        networkSyncEnabled: true,
      },
    },
    power_saver: {
      name: 'power_saver',
      description: 'Reduced performance, extended battery life',
      settings: {
        maxConcurrentOperations: 1,
        processingInterval: 2000,
        useGPUAcceleration: false,
        backgroundProcessingEnabled: false,
        imageQuality: 'low',
        cacheSize: 50,
        networkSyncEnabled: false,
      },
    },
    ultra_power_saver: {
      name: 'ultra_power_saver',
      description: 'Minimal processing, maximum battery conservation',
      settings: {
        maxConcurrentOperations: 1,
        processingInterval: 10000,
        useGPUAcceleration: false,
        backgroundProcessingEnabled: false,
        imageQuality: 'low',
        cacheSize: 25,
        networkSyncEnabled: false,
      },
    },
  };

  private constructor() {
    this.currentPowerMode = this.powerModes.balanced;
    this.config = {
      autoAdjustPowerMode: true,
      lowBatteryThreshold: 0.2, // 20%
      criticalBatteryThreshold: 0.1, // 10%
      thermalThrottlingEnabled: true,
      maxTemperature: 40, // 40°C
      chargingBoostEnabled: true,
    };

    this.setupBatteryMonitoring();
    this.startBatteryMonitoring();
  }

  static getInstance(): BatteryOptimizer {
    if (!BatteryOptimizer.instance) {
      BatteryOptimizer.instance = new BatteryOptimizer();
    }
    return BatteryOptimizer.instance;
  }

  private setupBatteryMonitoring(): void {
    // Listen for battery state changes
    DeviceEventEmitter.addListener('batteryStateChanged', (batteryInfo: BatteryInfo) => {
      this.handleBatteryStateChange(batteryInfo);
    });

    // Listen for thermal state changes
    DeviceEventEmitter.addListener('thermalStateChanged', (thermalState: string) => {
      this.handleThermalStateChange(thermalState);
    });
  }

  private startBatteryMonitoring(): void {
    // Monitor battery status every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateBatteryInfo();
    }, 30000);

    // Initial battery info update
    this.updateBatteryInfo();
  }

  private async updateBatteryInfo(): Promise<void> {
    try {
      // This would use a native module to get actual battery info
      // For now, we'll simulate the data
      const batteryInfo: BatteryInfo = {
        level: Math.random() * 0.8 + 0.2, // 20-100%
        isCharging: Math.random() > 0.7,
        chargingType: 'ac',
        temperature: 25 + Math.random() * 20, // 25-45°C
        health: 'good',
      };

      this.currentBatteryInfo = batteryInfo;
      this.notifyBatteryListeners(batteryInfo);

      // Auto-adjust power mode if enabled
      if (this.config.autoAdjustPowerMode) {
        await this.autoAdjustPowerMode(batteryInfo);
      }
    } catch (error) {
      console.error('Failed to update battery info:', error);
    }
  }

  private handleBatteryStateChange(batteryInfo: BatteryInfo): void {
    this.currentBatteryInfo = batteryInfo;
    this.notifyBatteryListeners(batteryInfo);

    if (this.config.autoAdjustPowerMode) {
      this.autoAdjustPowerMode(batteryInfo);
    }
  }

  private handleThermalStateChange(thermalState: string): void {
    console.log('Thermal state changed:', thermalState);

    if (this.config.thermalThrottlingEnabled) {
      // Adjust power mode based on thermal state
      switch (thermalState) {
        case 'critical':
        case 'emergency':
          this.setPowerMode('ultra_power_saver');
          break;
        case 'serious':
          this.setPowerMode('power_saver');
          break;
        case 'moderate':
          this.setPowerMode('balanced');
          break;
        default:
          // Normal thermal state - use current mode
          break;
      }
    }
  }

  private async autoAdjustPowerMode(batteryInfo: BatteryInfo): Promise<void> {
    let targetMode: string;

    // Determine target power mode based on battery level and charging state
    if (batteryInfo.level <= this.config.criticalBatteryThreshold) {
      targetMode = 'ultra_power_saver';
    } else if (batteryInfo.level <= this.config.lowBatteryThreshold) {
      targetMode = 'power_saver';
    } else if (batteryInfo.isCharging && this.config.chargingBoostEnabled) {
      targetMode = 'high_performance';
    } else {
      targetMode = 'balanced';
    }

    // Check thermal constraints
    if (
      this.config.thermalThrottlingEnabled &&
      batteryInfo.temperature &&
      batteryInfo.temperature > this.config.maxTemperature
    ) {
      // Override with power saver mode if too hot
      targetMode = batteryInfo.temperature > this.config.maxTemperature + 5
        ? 'ultra_power_saver'
        : 'power_saver';
    }

    // Apply the power mode if different from current
    if (this.currentPowerMode.name !== targetMode) {
      await this.setPowerMode(targetMode as PowerMode['name']);
    }
  }

  // Public API methods

  async setPowerMode(modeName: PowerMode['name']): Promise<void> {
    const newMode = this.powerModes[modeName];
    if (!newMode) {
      throw new Error(`Unknown power mode: ${modeName}`);
    }

    const previousMode = this.currentPowerMode;
    this.currentPowerMode = newMode;

    console.log(`Power mode changed: ${previousMode.name} -> ${newMode.name}`);

    // Apply power mode settings
    await this.applyPowerModeSettings(newMode);

    // Notify listeners
    this.notifyPowerModeListeners(newMode);

    // Track the change
    performanceMonitor.recordMetric('power_mode_change', 1, {
      from: previousMode.name,
      to: newMode.name,
      batteryLevel: this.currentBatteryInfo?.level,
      isCharging: this.currentBatteryInfo?.isCharging,
    });
  }

  private async applyPowerModeSettings(mode: PowerMode): Promise<void> {
    const settings = mode.settings;

    try {
      // Apply memory management settings
      // This would integrate with other services to apply the settings
      
      // Example: Update image cache size
      // imageCacheManager.updateConfig({ maxCacheSize: settings.cacheSize });

      // Example: Update processing queue settings
      // processingQueue.updateConfig({ 
      //   maxConcurrentOperations: settings.maxConcurrentOperations,
      //   processingInterval: settings.processingInterval 
      // });

      console.log('Applied power mode settings:', settings);
    } catch (error) {
      console.error('Failed to apply power mode settings:', error);
    }
  }

  getCurrentPowerMode(): PowerMode {
    return this.currentPowerMode;
  }

  getCurrentBatteryInfo(): BatteryInfo | null {
    return this.currentBatteryInfo;
  }

  getAllPowerModes(): PowerMode[] {
    return Object.values(this.powerModes);
  }

  updateConfig(newConfig: Partial<BatteryOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): BatteryOptimizationConfig {
    return { ...this.config };
  }

  // Event listeners

  addBatteryListener(callback: (info: BatteryInfo) => void): () => void {
    this.batteryListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.batteryListeners.indexOf(callback);
      if (index > -1) {
        this.batteryListeners.splice(index, 1);
      }
    };
  }

  addPowerModeListener(callback: (mode: PowerMode) => void): () => void {
    this.powerModeListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.powerModeListeners.indexOf(callback);
      if (index > -1) {
        this.powerModeListeners.splice(index, 1);
      }
    };
  }

  private notifyBatteryListeners(batteryInfo: BatteryInfo): void {
    this.batteryListeners.forEach(listener => {
      try {
        listener(batteryInfo);
      } catch (error) {
        console.error('Battery listener error:', error);
      }
    });
  }

  private notifyPowerModeListeners(mode: PowerMode): void {
    this.powerModeListeners.forEach(listener => {
      try {
        listener(mode);
      } catch (error) {
        console.error('Power mode listener error:', error);
      }
    });
  }

  // Battery optimization utilities

  async optimizeForBatteryLife(): Promise<void> {
    // Force power saver mode
    await this.setPowerMode('power_saver');
    
    // Clear caches to free memory
    // imageCacheManager.clearCache();
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    console.log('Optimized for battery life');
  }

  async optimizeForPerformance(): Promise<void> {
    // Only if battery level is sufficient
    if (this.currentBatteryInfo && this.currentBatteryInfo.level > 0.3) {
      await this.setPowerMode('high_performance');
      console.log('Optimized for performance');
    } else {
      console.warn('Cannot optimize for performance: low battery');
    }
  }

  getBatteryUsageEstimate(): {
    currentUsage: number; // mAh per hour
    estimatedTimeRemaining: number; // hours
    recommendations: string[];
  } {
    const batteryInfo = this.currentBatteryInfo;
    if (!batteryInfo) {
      return {
        currentUsage: 0,
        estimatedTimeRemaining: 0,
        recommendations: ['Battery information not available'],
      };
    }

    // Estimate usage based on current power mode
    const baseUsage = this.estimateBaseUsage();
    const modeMultiplier = this.getPowerModeUsageMultiplier();
    const currentUsage = baseUsage * modeMultiplier;

    // Estimate time remaining
    const batteryCapacity = 3000; // Assume 3000mAh battery
    const remainingCapacity = batteryCapacity * batteryInfo.level;
    const estimatedTimeRemaining = remainingCapacity / currentUsage;

    // Generate recommendations
    const recommendations = this.generateBatteryRecommendations(batteryInfo);

    return {
      currentUsage,
      estimatedTimeRemaining,
      recommendations,
    };
  }

  private estimateBaseUsage(): number {
    // Base usage estimate in mAh per hour
    return 200; // Conservative estimate
  }

  private getPowerModeUsageMultiplier(): number {
    switch (this.currentPowerMode.name) {
      case 'high_performance':
        return 1.5;
      case 'balanced':
        return 1.0;
      case 'power_saver':
        return 0.7;
      case 'ultra_power_saver':
        return 0.5;
      default:
        return 1.0;
    }
  }

  private generateBatteryRecommendations(batteryInfo: BatteryInfo): string[] {
    const recommendations: string[] = [];

    if (batteryInfo.level < 0.2) {
      recommendations.push('Enable Ultra Power Saver mode');
      recommendations.push('Disable background processing');
      recommendations.push('Reduce screen brightness');
    } else if (batteryInfo.level < 0.5) {
      recommendations.push('Enable Power Saver mode');
      recommendations.push('Limit background sync');
    }

    if (batteryInfo.temperature && batteryInfo.temperature > 35) {
      recommendations.push('Device is warm - consider reducing processing intensity');
    }

    if (!batteryInfo.isCharging && this.currentPowerMode.name === 'high_performance') {
      recommendations.push('Switch to Balanced mode to extend battery life');
    }

    return recommendations;
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.batteryListeners = [];
    this.powerModeListeners = [];
  }
}

export const batteryOptimizer = BatteryOptimizer.getInstance();