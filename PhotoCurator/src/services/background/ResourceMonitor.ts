import { ResourceMonitor, ThermalState } from '../../types/background';
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

export class ResourceMonitorService {
  private static instance: ResourceMonitorService;
  private listeners: ((resources: ResourceMonitor) => void)[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private currentResources: ResourceMonitor = {
    batteryLevel: 1.0,
    isCharging: false,
    memoryUsage: 0,
    availableMemory: 0,
    cpuUsage: 0,
    thermalState: ThermalState.NOMINAL,
  };

  private constructor() {
    this.setupNativeListeners();
  }

  public static getInstance(): ResourceMonitorService {
    if (!ResourceMonitorService.instance) {
      ResourceMonitorService.instance = new ResourceMonitorService();
    }
    return ResourceMonitorService.instance;
  }

  public startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.updateResourceStatus();
    }, intervalMs);

    // Initial update
    this.updateResourceStatus();
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  public getCurrentResources(): ResourceMonitor {
    return { ...this.currentResources };
  }

  public addListener(callback: (resources: ResourceMonitor) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public isResourceConstrained(): boolean {
    const { batteryLevel, isCharging, memoryUsage, thermalState } = this.currentResources;
    
    // Consider device constrained if:
    // - Battery is low and not charging
    // - Memory usage is high
    // - Thermal state is serious or critical
    return (
      (batteryLevel < 0.2 && !isCharging) ||
      memoryUsage > 0.8 ||
      thermalState === ThermalState.SERIOUS ||
      thermalState === ThermalState.CRITICAL
    );
  }

  public shouldPauseProcessing(batteryThreshold: number, memoryThreshold: number): boolean {
    const { batteryLevel, isCharging, memoryUsage, thermalState } = this.currentResources;
    
    return (
      (batteryLevel < batteryThreshold && !isCharging) ||
      memoryUsage > memoryThreshold ||
      thermalState === ThermalState.CRITICAL
    );
  }

  private setupNativeListeners(): void {
    // Battery level listener
    if (Platform.OS === 'ios') {
      DeviceEventEmitter.addListener('batteryLevelDidChange', (batteryLevel: number) => {
        this.currentResources.batteryLevel = batteryLevel;
        this.notifyListeners();
      });

      DeviceEventEmitter.addListener('batteryStateDidChange', (batteryState: string) => {
        this.currentResources.isCharging = batteryState === 'charging' || batteryState === 'full';
        this.notifyListeners();
      });
    }

    // Memory warnings
    DeviceEventEmitter.addListener('memoryWarning', () => {
      this.currentResources.memoryUsage = Math.min(this.currentResources.memoryUsage + 0.1, 1.0);
      this.notifyListeners();
    });
  }

  private async updateResourceStatus(): Promise<void> {
    try {
      // Get battery info
      await this.updateBatteryInfo();
      
      // Get memory info
      await this.updateMemoryInfo();
      
      // Get thermal state
      await this.updateThermalState();
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to update resource status:', error);
    }
  }

  private async updateBatteryInfo(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // iOS battery info would come from native module
        // For now, simulate battery info
        this.simulateBatteryInfo();
      } else {
        // Android battery info would come from native module
        this.simulateBatteryInfo();
      }
    } catch (error) {
      console.warn('Failed to get battery info:', error);
      this.simulateBatteryInfo();
    }
  }

  private async updateMemoryInfo(): Promise<void> {
    try {
      // Memory info would come from native module
      // For now, simulate memory usage
      const memoryInfo = await this.getMemoryInfo();
      this.currentResources.memoryUsage = memoryInfo.used / memoryInfo.total;
      this.currentResources.availableMemory = memoryInfo.available;
    } catch (error) {
      console.warn('Failed to get memory info:', error);
      // Fallback to simulated values
      this.currentResources.memoryUsage = Math.random() * 0.6 + 0.2; // 20-80%
      this.currentResources.availableMemory = 1024 * 1024 * 1024; // 1GB
    }
  }

  private async updateThermalState(): Promise<void> {
    try {
      // Thermal state would come from native module
      // For now, simulate based on other factors
      if (this.currentResources.cpuUsage > 0.8) {
        this.currentResources.thermalState = ThermalState.SERIOUS;
      } else if (this.currentResources.cpuUsage > 0.6) {
        this.currentResources.thermalState = ThermalState.FAIR;
      } else {
        this.currentResources.thermalState = ThermalState.NOMINAL;
      }
    } catch (error) {
      console.warn('Failed to get thermal state:', error);
      this.currentResources.thermalState = ThermalState.NOMINAL;
    }
  }

  private simulateBatteryInfo(): void {
    // Simulate battery info for development
    this.currentResources.batteryLevel = Math.max(0.1, Math.random());
    this.currentResources.isCharging = Math.random() > 0.7;
  }

  private async getMemoryInfo(): Promise<{ used: number; total: number; available: number }> {
    // This would be implemented with native modules in a real app
    // For now, return simulated values
    const total = 4 * 1024 * 1024 * 1024; // 4GB
    const used = total * (Math.random() * 0.6 + 0.2); // 20-80% usage
    const available = total - used;
    
    return { used, total, available };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentResources);
      } catch (error) {
        console.warn('Error in resource monitor listener:', error);
      }
    });
  }

  public destroy(): void {
    this.stopMonitoring();
    this.listeners = [];
    DeviceEventEmitter.removeAllListeners('batteryLevelDidChange');
    DeviceEventEmitter.removeAllListeners('batteryStateDidChange');
    DeviceEventEmitter.removeAllListeners('memoryWarning');
  }
}