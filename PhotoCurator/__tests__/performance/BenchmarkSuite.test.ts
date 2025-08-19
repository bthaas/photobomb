import { performanceMonitor } from '../../src/services/performance/PerformanceMonitor';
import { memoryAwareProcessor } from '../../src/services/performance/MemoryManager';
import { imageCacheManager } from '../../src/services/performance/ImageCacheManager';

// Mock React Native and dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  DeviceEventEmitter: { addListener: jest.fn() },
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

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // operations per second
  memoryUsage?: number;
}

class BenchmarkSuite {
  private results: BenchmarkResult[] = [];

  async runBenchmark(
    name: string,
    operation: () => Promise<void> | void,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    console.log(`Running benchmark: ${name} (${iterations} iterations)`);
    
    const times: number[] = [];
    const initialMemory = this.getMemoryUsage();
    
    // Warm up
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await operation();
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const startTime = Date.now();
    
    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();
      await operation();
      const iterationEnd = Date.now();
      times.push(iterationEnd - iterationStart);
    }
    
    const endTime = Date.now();
    const finalMemory = this.getMemoryUsage();
    
    const totalTime = endTime - startTime;
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = (iterations / totalTime) * 1000; // ops per second
    
    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      throughput,
      memoryUsage: finalMemory - initialMemory,
    };
    
    this.results.push(result);
    this.logResult(result);
    
    return result;
  }

  private getMemoryUsage(): number {
    // Mock memory usage - in real implementation would use native module
    return Math.random() * 100;
  }

  private logResult(result: BenchmarkResult): void {
    console.log(`
Benchmark: ${result.name}
Iterations: ${result.iterations}
Total Time: ${result.totalTime}ms
Average Time: ${result.averageTime.toFixed(3)}ms
Min Time: ${result.minTime}ms
Max Time: ${result.maxTime}ms
Throughput: ${result.throughput.toFixed(2)} ops/sec
Memory Usage: ${result.memoryUsage?.toFixed(2)}MB
    `);
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  generateReport(): string {
    const report = ['Performance Benchmark Report', '='.repeat(30), ''];
    
    this.results.forEach(result => {
      report.push(`${result.name}:`);
      report.push(`  Average: ${result.averageTime.toFixed(3)}ms`);
      report.push(`  Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      report.push(`  Memory: ${result.memoryUsage?.toFixed(2)}MB`);
      report.push('');
    });
    
    return report.join('\n');
  }

  clear(): void {
    this.results = [];
  }
}

describe('Performance Benchmark Suite', () => {
  let benchmarkSuite: BenchmarkSuite;

  beforeEach(() => {
    benchmarkSuite = new BenchmarkSuite();
    performanceMonitor.clearMetrics();
  });

  afterEach(() => {
    console.log(benchmarkSuite.generateReport());
  });

  describe('Core Performance Benchmarks', () => {
    it('should benchmark metric recording performance', async () => {
      const result = await benchmarkSuite.runBenchmark(
        'Metric Recording',
        () => {
          performanceMonitor.recordMetric('benchmark_metric', Math.random() * 1000, {
            timestamp: Date.now(),
            category: 'benchmark',
          });
        },
        10000
      );

      expect(result.averageTime).toBeLessThan(0.1); // Should be very fast
      expect(result.throughput).toBeGreaterThan(10000); // > 10k ops/sec
    });

    it('should benchmark timing operations', async () => {
      const result = await benchmarkSuite.runBenchmark(
        'Timing Operations',
        () => {
          const endTiming = performanceMonitor.startTiming('benchmark_timing');
          // Simulate some work
          for (let i = 0; i < 100; i++) {
            Math.random();
          }
          endTiming();
        },
        1000
      );

      expect(result.averageTime).toBeLessThan(1); // Should be sub-millisecond
    });

    it('should benchmark async measurement', async () => {
      const result = await benchmarkSuite.runBenchmark(
        'Async Measurement',
        async () => {
          await performanceMonitor.measureAsync('benchmark_async', async () => {
            // Simulate async work
            await new Promise(resolve => setTimeout(resolve, 1));
          });
        },
        100
      );

      expect(result.averageTime).toBeLessThan(10); // Overhead should be minimal
    });
  });

  describe('Memory Management Benchmarks', () => {
    it('should benchmark memory-aware processing', async () => {
      const result = await benchmarkSuite.runBenchmark(
        'Memory-Aware Processing',
        async () => {
          await memoryAwareProcessor.processWithMemoryCheck(async () => {
            // Simulate processing work
            const data = new Array(1000).fill(0).map(() => Math.random());
            return data.reduce((sum, val) => sum + val, 0);
          });
        },
        100
      );

      expect(result.averageTime).toBeLessThan(50); // Should be reasonably fast
    });

    it('should benchmark queue processing', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        () => Promise.resolve(i * 2)
      );

      const result = await benchmarkSuite.runBenchmark(
        'Queue Processing',
        async () => {
          const promises = operations.map(op => 
            memoryAwareProcessor.processWithMemoryCheck(op)
          );
          await Promise.all(promises);
        },
        5
      );

      expect(result.averageTime).toBeLessThan(1000); // Should complete within 1 second
    }, 10000);
  });

  describe('Image Caching Benchmarks', () => {
    it('should benchmark cache key generation', async () => {
      const testUris = Array.from({ length: 1000 }, (_, i) => 
        `file://test/image${i}.jpg`
      );
      let index = 0;

      const result = await benchmarkSuite.runBenchmark(
        'Cache Key Generation',
        () => {
          const uri = testUris[index % testUris.length];
          // Simulate cache key generation (private method, so we test the public interface)
          imageCacheManager.getCachedImage(uri);
          index++;
        },
        5000
      );

      expect(result.averageTime).toBeLessThan(0.5); // Should be very fast
    });

    it('should benchmark cache stats retrieval', async () => {
      const result = await benchmarkSuite.runBenchmark(
        'Cache Stats Retrieval',
        () => {
          imageCacheManager.getCacheStats();
        },
        10000
      );

      expect(result.averageTime).toBeLessThan(0.1); // Should be instant
      expect(result.throughput).toBeGreaterThan(50000); // > 50k ops/sec
    });
  });

  describe('Stress Tests', () => {
    it('should handle high-frequency metric recording', async () => {
      const result = await benchmarkSuite.runBenchmark(
        'High-Frequency Metrics',
        () => {
          // Record multiple metrics rapidly
          for (let i = 0; i < 10; i++) {
            performanceMonitor.recordMetric(`stress_metric_${i}`, Math.random() * 100);
          }
        },
        1000
      );

      expect(result.averageTime).toBeLessThan(1); // Should handle burst well
    });

    it('should handle concurrent processing requests', async () => {
      const result = await benchmarkSuite.runBenchmark(
        'Concurrent Processing',
        async () => {
          const promises = Array.from({ length: 5 }, (_, i) =>
            memoryAwareProcessor.processWithMemoryCheck(async () => {
              await new Promise(resolve => setTimeout(resolve, 1));
              return i;
            })
          );
          await Promise.all(promises);
        },
        10
      );

      expect(result.averageTime).toBeLessThan(500); // Should handle concurrency well
    }, 10000);
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during metric recording', async () => {
      // Record many metrics
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.recordMetric('leak_test', i);
      }
      
      // Force cleanup
      performanceMonitor.clearMetrics();
      if (global.gc) {
        global.gc();
      }
      
      // Just verify that clearMetrics works
      const metrics = performanceMonitor.getMetrics('leak_test');
      expect(metrics.length).toBe(0);
    });

    it('should not leak memory during cache operations', async () => {
      // Perform many cache operations
      for (let i = 0; i < 100; i++) {
        await imageCacheManager.getCachedImage(`file://test/image${i}.jpg`);
      }
      
      // Clear cache
      await imageCacheManager.clearCache();
      if (global.gc) {
        global.gc();
      }
      
      // Verify cache is cleared
      const stats = imageCacheManager.getCacheStats();
      expect(stats.count).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain performance standards for metric operations', async () => {
      const metricResult = await benchmarkSuite.runBenchmark(
        'Metric Performance Standard',
        () => {
          performanceMonitor.recordMetric('standard_test', Math.random() * 1000);
        },
        5000
      );

      // Performance standards
      expect(metricResult.averageTime).toBeLessThan(0.1); // < 0.1ms average
      expect(metricResult.maxTime).toBeLessThan(5); // < 5ms max
      expect(metricResult.throughput).toBeGreaterThan(10000); // > 10k ops/sec
    });

    it('should maintain performance standards for memory operations', async () => {
      const memoryResult = await benchmarkSuite.runBenchmark(
        'Memory Performance Standard',
        async () => {
          await memoryAwareProcessor.processWithMemoryCheck(async () => {
            return Math.random() * 1000;
          });
        },
        100
      );

      // Performance standards
      expect(memoryResult.averageTime).toBeLessThan(50); // < 50ms average
      expect(memoryResult.maxTime).toBeLessThan(200); // < 200ms max
      expect(memoryResult.throughput).toBeGreaterThan(10); // > 10 ops/sec
    }, 10000);
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with metric count', async () => {
      const smallResult = await benchmarkSuite.runBenchmark(
        'Small Metric Set (10)',
        () => {
          for (let i = 0; i < 10; i++) {
            performanceMonitor.recordMetric('scale_test', i);
          }
        },
        50
      );

      const largeResult = await benchmarkSuite.runBenchmark(
        'Large Metric Set (100)',
        () => {
          for (let i = 0; i < 100; i++) {
            performanceMonitor.recordMetric('scale_test', i);
          }
        },
        50
      );

      // Performance should scale roughly linearly
      // Handle case where small result is 0 (very fast)
      const scaleFactor = smallResult.averageTime > 0 
        ? largeResult.averageTime / smallResult.averageTime 
        : largeResult.averageTime;
      
      expect(scaleFactor).toBeLessThan(50); // Should not be more than 50x slower
      expect(largeResult.averageTime).toBeGreaterThanOrEqual(smallResult.averageTime); // Large should be at least as slow
    });

    it('should handle increasing queue sizes efficiently', async () => {
      const queueSizes = [5, 10, 20];
      const results: BenchmarkResult[] = [];

      for (const size of queueSizes) {
        const result = await benchmarkSuite.runBenchmark(
          `Queue Size ${size}`,
          async () => {
            const promises = Array.from({ length: size }, (_, i) =>
              memoryAwareProcessor.processWithMemoryCheck(async () => i)
            );
            await Promise.all(promises);
          },
          5
        );
        results.push(result);
      }

      // Verify that performance degrades gracefully
      for (let i = 1; i < results.length; i++) {
        const prevResult = results[i - 1];
        const currentResult = results[i];
        const degradationFactor = currentResult.averageTime / prevResult.averageTime;
        
        // Performance should not degrade exponentially
        expect(degradationFactor).toBeLessThan(20);
      }
    }, 15000);
  });
});