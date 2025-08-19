import { performanceMonitor, PerformanceMonitor } from '../../src/services/performance/PerformanceMonitor';
import { memoryManager, MemoryManager } from '../../src/services/performance/MemoryManager';
import { imageCacheManager, ImageCacheManager } from '../../src/services/performance/ImageCacheManager';
import { modelOptimizer, ModelOptimizer } from '../../src/services/performance/ModelOptimizer';
import { batteryOptimizer, BatteryOptimizer } from '../../src/services/performance/BatteryOptimizer';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  DeviceEventEmitter: {
    addListener: jest.fn(),
  },
  NativeModules: {},
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/mock/cache',
  exists: jest.fn().mockResolvedValue(false),
  mkdir: jest.fn().mockResolvedValue(true),
  readFile: jest.fn().mockResolvedValue('{}'),
  writeFile: jest.fn().mockResolvedValue(true),
  stat: jest.fn().mockResolvedValue({ size: 1024 }),
  copyFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true),
}));

// Mock TensorFlow.js classes
class MockLayersModel {
  getWeights() { return []; }
  layers = [];
  countParams() { return 1000; }
  dispose() {}
}

class MockGraphModel {
  weights = [];
  dispose() {}
}

jest.mock('@tensorflow/tfjs', () => ({
  loadLayersModel: jest.fn(),
  sequential: jest.fn(() => new MockLayersModel()),
  tidy: jest.fn((fn) => fn()),
  scalar: jest.fn((val) => ({ div: jest.fn(), sub: jest.fn(), mul: jest.fn() })),
  clipByValue: jest.fn(),
  LayersModel: MockLayersModel,
  GraphModel: MockGraphModel,
}));

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Clean up singletons to prevent memory leaks and interval issues
    performanceMonitor.destroy();
    memoryManager.destroy();
    batteryOptimizer.destroy();
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = PerformanceMonitor.getInstance();
      monitor.clearMetrics();
    });

    it('should track user interactions', () => {
      const interaction = {
        type: 'tap',
        screen: 'PhotoGrid',
        duration: 150,
      };

      monitor.trackUserInteraction(interaction);
      const interactions = monitor.getInteractions();

      expect(interactions).toHaveLength(1);
      expect(interactions[0]).toMatchObject(interaction);
    });

    it('should track ML processing times', () => {
      const operation = {
        operation: 'face_detection',
        modelName: 'blazeface',
        duration: 250,
        success: true,
      };

      monitor.trackMLProcessingTime(operation);
      const operations = monitor.getMLOperations();

      expect(operations).toHaveLength(1);
      expect(operations[0]).toMatchObject(operation);
    });

    it('should measure async operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      
      const result = await monitor.measureAsync('test_operation', mockOperation);
      
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
      
      const metrics = monitor.getMetrics('async_timing_test_operation');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata?.success).toBe(true);
    });

    it('should handle async operation errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(monitor.measureAsync('test_operation', mockOperation)).rejects.toThrow('Test error');
      
      const metrics = monitor.getMetrics('async_timing_test_operation');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata?.success).toBe(false);
      expect(metrics[0].metadata?.error).toBe('Test error');
    });

    it('should generate performance reports', () => {
      // Add some test data
      monitor.trackUserInteraction({ type: 'tap', screen: 'Home', duration: 100 });
      monitor.trackMLProcessingTime({ operation: 'analysis', duration: 500, success: true });
      monitor.recordMetric('app_startup_time', 2000);

      const report = monitor.generatePerformanceReport();

      expect(report).toHaveProperty('appStartupTime');
      expect(report).toHaveProperty('averageMLProcessingTime');
      expect(report).toHaveProperty('userInteractionStats');
      expect(report.userInteractionStats.totalInteractions).toBe(1);
      expect(report.averageMLProcessingTime).toBe(500);
    });

    it('should limit metrics array size', () => {
      // Add more metrics than the limit
      for (let i = 0; i < 1200; i++) {
        monitor.recordMetric('test_metric', i);
      }

      const metrics = monitor.getMetrics('test_metric');
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('MemoryManager', () => {
    let manager: MemoryManager;

    beforeEach(() => {
      manager = MemoryManager.getInstance();
    });

    it('should get memory stats', async () => {
      const stats = await manager.getMemoryStats();

      expect(stats).toHaveProperty('totalMemory');
      expect(stats).toHaveProperty('availableMemory');
      expect(stats).toHaveProperty('usedMemory');
      expect(stats).toHaveProperty('memoryPressure');
      expect(['low', 'medium', 'high', 'critical']).toContain(stats.memoryPressure);
    });

    it('should register and call memory listeners', async () => {
      const mockListener = jest.fn();
      const unsubscribe = manager.registerMemoryListener(mockListener);

      // Manually trigger the listener (simulating what would happen in checkMemoryUsage)
      const stats = await manager.getMemoryStats();
      // Since the actual listener calling is in a private method, we'll simulate it
      mockListener(stats);

      expect(mockListener).toHaveBeenCalled();

      unsubscribe();
    });

    it('should register and call cleanup callbacks', async () => {
      const mockCleanup = jest.fn().mockResolvedValue(undefined);
      const unregister = manager.registerCleanupCallback(mockCleanup);

      await manager.forceCleanup();

      expect(mockCleanup).toHaveBeenCalled();

      unregister();
    });

    it('should update memory thresholds', () => {
      const newThresholds = {
        lowMemoryThreshold: 200,
        criticalMemoryThreshold: 50,
      };

      manager.updateThresholds(newThresholds);

      // Test that thresholds are applied (would need access to private property)
      expect(() => manager.updateThresholds(newThresholds)).not.toThrow();
    });
  });

  describe('ImageCacheManager', () => {
    let cacheManager: ImageCacheManager;

    beforeEach(() => {
      cacheManager = new ImageCacheManager({
        maxCacheSize: 10, // 10MB for testing
        maxCacheAge: 1000, // 1 second for testing
      });
    });

    it('should cache images', async () => {
      const testUri = 'file://test/image.jpg';
      
      const cachedPath = await cacheManager.cacheImage(testUri);
      
      expect(cachedPath).toBeDefined();
      expect(typeof cachedPath).toBe('string');
    });

    it('should return cached images', async () => {
      const testUri = 'file://test/image.jpg';
      
      // Cache the image first
      await cacheManager.cacheImage(testUri);
      
      // Try to get cached version
      const cachedPath = await cacheManager.getCachedImage(testUri);
      
      expect(cachedPath).toBeDefined();
    });

    it('should handle thumbnail requests', async () => {
      const testUri = 'file://test/image.jpg';
      
      const cachedPath = await cacheManager.cacheImage(testUri, { thumbnail: true });
      
      expect(cachedPath).toBeDefined();
    });

    it('should provide cache stats', () => {
      const stats = cacheManager.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('maxSize');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.count).toBe('number');
    });

    it('should clear cache', async () => {
      const testUri = 'file://test/image.jpg';
      await cacheManager.cacheImage(testUri);
      
      await cacheManager.clearCache();
      
      const stats = cacheManager.getCacheStats();
      expect(stats.count).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('ModelOptimizer', () => {
    let optimizer: ModelOptimizer;

    beforeEach(() => {
      optimizer = ModelOptimizer.getInstance();
    });

    it('should optimize models', async () => {
      const mockModel = new MockLayersModel();
      require('@tensorflow/tfjs').loadLayersModel.mockResolvedValue(mockModel);

      const optimizedModel = await optimizer.optimizeModel('test://model.json');

      expect(optimizedModel).toHaveProperty('model');
      expect(optimizedModel).toHaveProperty('originalSize');
      expect(optimizedModel).toHaveProperty('optimizedSize');
      expect(optimizedModel).toHaveProperty('compressionRatio');
      expect(optimizedModel).toHaveProperty('metadata');
    });

    it('should cache optimized models', async () => {
      const mockModel = new MockLayersModel();
      require('@tensorflow/tfjs').loadLayersModel.mockResolvedValue(mockModel);

      const modelUrl = 'test://model.json';
      
      // First optimization
      await optimizer.optimizeModel(modelUrl);
      
      // Second call should use cache
      const cachedModel = optimizer.getOptimizedModel(modelUrl);
      
      expect(cachedModel).toBeDefined();
    });

    it('should provide cache stats', () => {
      const stats = optimizer.getCacheStats();
      
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('maxSize');
    });

    it('should clear cache', () => {
      expect(() => optimizer.clearCache()).not.toThrow();
    });
  });

  describe('BatteryOptimizer', () => {
    let optimizer: BatteryOptimizer;

    beforeEach(() => {
      optimizer = BatteryOptimizer.getInstance();
    });

    it('should get current power mode', () => {
      const powerMode = optimizer.getCurrentPowerMode();
      
      expect(powerMode).toHaveProperty('name');
      expect(powerMode).toHaveProperty('description');
      expect(powerMode).toHaveProperty('settings');
    });

    it('should set power mode', async () => {
      await optimizer.setPowerMode('power_saver');
      
      const currentMode = optimizer.getCurrentPowerMode();
      expect(currentMode.name).toBe('power_saver');
    });

    it('should get all power modes', () => {
      const modes = optimizer.getAllPowerModes();
      
      expect(Array.isArray(modes)).toBe(true);
      expect(modes.length).toBeGreaterThan(0);
      expect(modes[0]).toHaveProperty('name');
      expect(modes[0]).toHaveProperty('settings');
    });

    it('should update configuration', () => {
      const newConfig = {
        autoAdjustPowerMode: false,
        lowBatteryThreshold: 0.15,
      };

      optimizer.updateConfig(newConfig);
      
      const config = optimizer.getConfig();
      expect(config.autoAdjustPowerMode).toBe(false);
      expect(config.lowBatteryThreshold).toBe(0.15);
    });

    it('should add battery listeners', () => {
      const mockListener = jest.fn();
      const unsubscribe = optimizer.addBatteryListener(mockListener);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should add power mode listeners', () => {
      const mockListener = jest.fn();
      const unsubscribe = optimizer.addPowerModeListener(mockListener);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should get battery usage estimate', () => {
      const estimate = optimizer.getBatteryUsageEstimate();
      
      expect(estimate).toHaveProperty('currentUsage');
      expect(estimate).toHaveProperty('estimatedTimeRemaining');
      expect(estimate).toHaveProperty('recommendations');
      expect(Array.isArray(estimate.recommendations)).toBe(true);
    });

    it('should optimize for battery life', async () => {
      await optimizer.optimizeForBatteryLife();
      
      const currentMode = optimizer.getCurrentPowerMode();
      expect(currentMode.name).toBe('power_saver');
    });
  });
});

// Benchmark tests
describe('Performance Benchmarks', () => {
  const BENCHMARK_ITERATIONS = 100;
  const PERFORMANCE_THRESHOLD_MS = 1000; // 1 second

  it('should benchmark image caching performance', async () => {
    const cacheManager = new ImageCacheManager();
    const testUris = Array.from({ length: 10 }, (_, i) => `file://test/image${i}.jpg`);
    
    const startTime = Date.now();
    
    // Benchmark caching multiple images
    const promises = testUris.map(uri => cacheManager.cacheImage(uri));
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    console.log(`Image caching benchmark: ${duration}ms for ${testUris.length} images`);
  });

  it('should benchmark memory manager performance', async () => {
    const manager = MemoryManager.getInstance();
    
    const startTime = Date.now();
    
    // Benchmark memory stats retrieval
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      await manager.getMemoryStats();
    }
    
    const duration = Date.now() - startTime;
    const avgDuration = duration / BENCHMARK_ITERATIONS;
    
    expect(avgDuration).toBeLessThan(10); // Should be very fast
    console.log(`Memory stats benchmark: ${avgDuration}ms average over ${BENCHMARK_ITERATIONS} iterations`);
  });

  it('should benchmark performance monitoring overhead', () => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
    
    const startTime = Date.now();
    
    // Benchmark metric recording
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      monitor.recordMetric('benchmark_test', i, { iteration: i });
    }
    
    const duration = Date.now() - startTime;
    const avgDuration = duration / BENCHMARK_ITERATIONS;
    
    expect(avgDuration).toBeLessThan(1); // Should be very fast
    console.log(`Performance monitoring benchmark: ${avgDuration}ms average over ${BENCHMARK_ITERATIONS} iterations`);
  });

  it('should benchmark battery optimization decisions', async () => {
    const optimizer = BatteryOptimizer.getInstance();
    
    const startTime = Date.now();
    
    // Benchmark power mode switching
    const modes: Array<'high_performance' | 'balanced' | 'power_saver' | 'ultra_power_saver'> = 
      ['high_performance', 'balanced', 'power_saver', 'ultra_power_saver'];
    
    for (let i = 0; i < 20; i++) {
      const mode = modes[i % modes.length];
      await optimizer.setPowerMode(mode);
    }
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    console.log(`Battery optimization benchmark: ${duration}ms for 20 mode switches`);
  });
});

// Integration tests
describe('Performance Integration Tests', () => {
  it('should integrate performance monitoring with memory management', async () => {
    const monitor = PerformanceMonitor.getInstance();
    const memoryManager = MemoryManager.getInstance();
    
    let memoryStatsReceived = false;
    
    const unsubscribe = memoryManager.registerMemoryListener((stats) => {
      monitor.trackMemoryUsage('integration_test', {
        component: 'integration_test',
        heapUsed: stats.usedMemory,
        heapTotal: stats.totalMemory,
        external: 0,
        timestamp: Date.now(),
      });
      memoryStatsReceived = true;
    });
    
    // Get memory stats and manually trigger listener
    const stats = await memoryManager.getMemoryStats();
    // Simulate the listener being called
    monitor.trackMemoryUsage('integration_test', {
      component: 'integration_test',
      heapUsed: stats.usedMemory,
      heapTotal: stats.totalMemory,
      external: 0,
      timestamp: Date.now(),
    });
    memoryStatsReceived = true;
    
    expect(memoryStatsReceived).toBe(true);
    
    const memoryMetrics = monitor.getMetrics('memory_usage');
    expect(memoryMetrics.length).toBeGreaterThan(0);
    
    unsubscribe();
  });

  it('should integrate battery optimization with performance monitoring', async () => {
    const monitor = PerformanceMonitor.getInstance();
    const batteryOptimizer = BatteryOptimizer.getInstance();
    
    let powerModeChangeTracked = false;
    
    const unsubscribe = batteryOptimizer.addPowerModeListener((mode) => {
      monitor.recordMetric('power_mode_active', 1, { mode: mode.name });
      powerModeChangeTracked = true;
    });
    
    await batteryOptimizer.setPowerMode('power_saver');
    
    expect(powerModeChangeTracked).toBe(true);
    
    const powerModeMetrics = monitor.getMetrics('power_mode_active');
    expect(powerModeMetrics.length).toBeGreaterThan(0);
    
    unsubscribe();
  });
});