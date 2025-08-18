import { ResourceMonitorService } from '../../../src/services/background/ResourceMonitor';
import { ThermalState } from '../../../src/types/background';

// Mock React Native modules
jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('ResourceMonitorService', () => {
  let resourceMonitor: ResourceMonitorService;

  beforeEach(() => {
    resourceMonitor = ResourceMonitorService.getInstance();
  });

  afterEach(() => {
    resourceMonitor.stopMonitoring();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ResourceMonitorService.getInstance();
      const instance2 = ResourceMonitorService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('monitoring', () => {
    it('should start monitoring with specified interval', () => {
      const spy = jest.spyOn(global, 'setInterval');
      resourceMonitor.startMonitoring(1000);
      
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should stop monitoring and clear interval', () => {
      const spy = jest.spyOn(global, 'clearInterval');
      resourceMonitor.startMonitoring(1000);
      resourceMonitor.stopMonitoring();
      
      expect(spy).toHaveBeenCalled();
    });

    it('should use default interval when not specified', () => {
      const spy = jest.spyOn(global, 'setInterval');
      resourceMonitor.startMonitoring();
      
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
  });

  describe('resource status', () => {
    it('should return current resource status', () => {
      const resources = resourceMonitor.getCurrentResources();
      
      expect(resources).toHaveProperty('batteryLevel');
      expect(resources).toHaveProperty('isCharging');
      expect(resources).toHaveProperty('memoryUsage');
      expect(resources).toHaveProperty('availableMemory');
      expect(resources).toHaveProperty('cpuUsage');
      expect(resources).toHaveProperty('thermalState');
    });

    it('should detect resource constraints', () => {
      // Mock low battery scenario
      const mockResources = {
        batteryLevel: 0.1,
        isCharging: false,
        memoryUsage: 0.5,
        availableMemory: 1000000,
        cpuUsage: 0.3,
        thermalState: ThermalState.NOMINAL,
      };

      // Access private property for testing
      (resourceMonitor as any).currentResources = mockResources;
      
      expect(resourceMonitor.isResourceConstrained()).toBe(true);
    });

    it('should not detect constraints when resources are adequate', () => {
      const mockResources = {
        batteryLevel: 0.8,
        isCharging: true,
        memoryUsage: 0.4,
        availableMemory: 2000000,
        cpuUsage: 0.3,
        thermalState: ThermalState.NOMINAL,
      };

      (resourceMonitor as any).currentResources = mockResources;
      
      expect(resourceMonitor.isResourceConstrained()).toBe(false);
    });
  });

  describe('pause conditions', () => {
    it('should recommend pause on low battery when not charging', () => {
      const mockResources = {
        batteryLevel: 0.15,
        isCharging: false,
        memoryUsage: 0.4,
        availableMemory: 2000000,
        cpuUsage: 0.3,
        thermalState: ThermalState.NOMINAL,
      };

      (resourceMonitor as any).currentResources = mockResources;
      
      expect(resourceMonitor.shouldPauseProcessing(0.2, 0.8)).toBe(true);
    });

    it('should not recommend pause on low battery when charging', () => {
      const mockResources = {
        batteryLevel: 0.15,
        isCharging: true,
        memoryUsage: 0.4,
        availableMemory: 2000000,
        cpuUsage: 0.3,
        thermalState: ThermalState.NOMINAL,
      };

      (resourceMonitor as any).currentResources = mockResources;
      
      expect(resourceMonitor.shouldPauseProcessing(0.2, 0.8)).toBe(false);
    });

    it('should recommend pause on high memory usage', () => {
      const mockResources = {
        batteryLevel: 0.8,
        isCharging: true,
        memoryUsage: 0.9,
        availableMemory: 1000000,
        cpuUsage: 0.3,
        thermalState: ThermalState.NOMINAL,
      };

      (resourceMonitor as any).currentResources = mockResources;
      
      expect(resourceMonitor.shouldPauseProcessing(0.2, 0.8)).toBe(true);
    });

    it('should recommend pause on critical thermal state', () => {
      const mockResources = {
        batteryLevel: 0.8,
        isCharging: true,
        memoryUsage: 0.4,
        availableMemory: 2000000,
        cpuUsage: 0.3,
        thermalState: ThermalState.CRITICAL,
      };

      (resourceMonitor as any).currentResources = mockResources;
      
      expect(resourceMonitor.shouldPauseProcessing(0.2, 0.8)).toBe(true);
    });
  });

  describe('listeners', () => {
    it('should add and remove listeners', () => {
      const mockCallback = jest.fn();
      const removeListener = resourceMonitor.addListener(mockCallback);
      
      expect(typeof removeListener).toBe('function');
      
      // Trigger notification
      (resourceMonitor as any).notifyListeners();
      expect(mockCallback).toHaveBeenCalled();
      
      // Remove listener
      removeListener();
      mockCallback.mockClear();
      
      (resourceMonitor as any).notifyListeners();
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      
      resourceMonitor.addListener(errorCallback);
      resourceMonitor.addListener(normalCallback);
      
      // Should not throw and should still call normal callback
      expect(() => {
        (resourceMonitor as any).notifyListeners();
      }).not.toThrow();
      
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const stopSpy = jest.spyOn(resourceMonitor, 'stopMonitoring');
      
      resourceMonitor.startMonitoring();
      resourceMonitor.addListener(jest.fn());
      
      resourceMonitor.destroy();
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});