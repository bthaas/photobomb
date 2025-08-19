// Performance optimization services
export { 
  ImageCacheManager, 
  imageCacheManager,
  type CacheConfig,
  type CachedImage 
} from './ImageCacheManager';

export { 
  MemoryManager, 
  MemoryAwareProcessor,
  memoryManager, 
  memoryAwareProcessor,
  type MemoryStats,
  type MemoryThresholds 
} from './MemoryManager';

export { 
  PerformanceMonitor, 
  performanceMonitor,
  usePerformanceTracking,
  type PerformanceMetric,
  type UserInteraction,
  type MLOperation,
  type MemoryUsage,
  type PerformanceReport 
} from './PerformanceMonitor';

export { 
  ModelOptimizer, 
  modelOptimizer,
  createOptimizedModelLoader,
  type ModelOptimizationConfig,
  type OptimizedModel 
} from './ModelOptimizer';

export { 
  BatteryOptimizer, 
  batteryOptimizer,
  type BatteryInfo,
  type PowerMode,
  type BatteryOptimizationConfig 
} from './BatteryOptimizer';

// Re-export LazyImage component
export { LazyImage, useImagePreloader } from '../components/performance/LazyImage';