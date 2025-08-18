/**
 * Photo Editing Performance Tests
 */

import { PhotoEditor } from '../../src/services/editing/PhotoEditor';
import { ModelManager } from '../../src/services/ai/ModelManager';
import { ModelErrorHandler } from '../../src/services/ai/ModelErrorHandler';
import { Photo, SyncStatus } from '../../src/types/photo';

describe('Photo Editing Performance', () => {
  let photoEditor: PhotoEditor;
  let testPhotos: Photo[];

  beforeAll(() => {
    const modelManager = new ModelManager();
    const errorHandler = new ModelErrorHandler();
    photoEditor = new PhotoEditor(modelManager, errorHandler);

    // Create test photos of different sizes
    testPhotos = [
      createTestPhoto('small', 800, 600, 500000),
      createTestPhoto('medium', 1920, 1080, 2000000),
      createTestPhoto('large', 3840, 2160, 8000000),
      createTestPhoto('xlarge', 6000, 4000, 20000000),
    ];
  });

  function createTestPhoto(id: string, width: number, height: number, fileSize: number): Photo {
    return {
      id,
      uri: `file://test-${id}.jpg`,
      metadata: {
        width,
        height,
        fileSize,
        format: 'jpeg',
        timestamp: new Date(),
      },
      qualityScore: {
        overall: 0.6,
        sharpness: 0.7,
        exposure: 0.5,
        colorBalance: 0.6,
        noise: 0.8,
      },
      compositionScore: {
        overall: 0.6,
        ruleOfThirds: 0.5,
        leadingLines: 0.4,
        symmetry: 0.6,
        subjectPlacement: 0.7,
      },
      syncStatus: SyncStatus.LOCAL_ONLY,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  describe('Enhancement Performance', () => {
    it('should enhance small photos within 500ms', async () => {
      const startTime = performance.now();
      await photoEditor.enhancePhoto(testPhotos[0]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should enhance medium photos within 1000ms', async () => {
      const startTime = performance.now();
      await photoEditor.enhancePhoto(testPhotos[1]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should enhance large photos within 2000ms', async () => {
      const startTime = performance.now();
      await photoEditor.enhancePhoto(testPhotos[2]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle batch enhancement efficiently', async () => {
      const batchSize = 5;
      const photos = Array.from({ length: batchSize }, (_, i) => 
        createTestPhoto(`batch-${i}`, 1920, 1080, 2000000)
      );

      const startTime = performance.now();
      
      // Process in parallel
      const promises = photos.map(photo => photoEditor.enhancePhoto(photo));
      await Promise.all(promises);
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / batchSize;

      // Parallel processing should be more efficient than sequential
      expect(averageTime).toBeLessThan(1500); // Average per photo
      expect(endTime - startTime).toBeLessThan(5000); // Total time
    });
  });

  describe('Crop Suggestion Performance', () => {
    it('should generate crop suggestions for small photos within 200ms', async () => {
      const startTime = performance.now();
      await photoEditor.suggestCrop(testPhotos[0]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should generate crop suggestions for medium photos within 500ms', async () => {
      const startTime = performance.now();
      await photoEditor.suggestCrop(testPhotos[1]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should generate crop suggestions for large photos within 1000ms', async () => {
      const startTime = performance.now();
      await photoEditor.suggestCrop(testPhotos[2]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should cache composition analysis for repeated calls', async () => {
      const photo = testPhotos[1];

      // First call
      const startTime1 = performance.now();
      await photoEditor.suggestCrop(photo);
      const endTime1 = performance.now();
      const firstCallTime = endTime1 - startTime1;

      // Second call (should be faster due to caching)
      const startTime2 = performance.now();
      await photoEditor.suggestCrop(photo);
      const endTime2 = performance.now();
      const secondCallTime = endTime2 - startTime2;

      // Second call should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime * 0.5);
    });
  });

  describe('Background Removal Performance', () => {
    it('should process background removal for small photos within 2000ms', async () => {
      const startTime = performance.now();
      await photoEditor.removeBackground(testPhotos[0]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should process background removal for medium photos within 5000ms', async () => {
      const startTime = performance.now();
      await photoEditor.removeBackground(testPhotos[1]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle timeout for very large photos gracefully', async () => {
      const startTime = performance.now();
      
      try {
        await photoEditor.removeBackground(testPhotos[3]); // XLarge photo
      } catch (error) {
        // Should either complete or timeout gracefully
        expect(error).toBeDefined();
      }
      
      const endTime = performance.now();
      
      // Should not hang indefinitely
      expect(endTime - startTime).toBeLessThan(15000); // 15 second timeout
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks during repeated operations', async () => {
      const iterations = 10;
      const photo = testPhotos[1]; // Medium size photo

      // Measure initial memory (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform repeated operations
      for (let i = 0; i < iterations; i++) {
        await photoEditor.enhancePhoto(photo);
        await photoEditor.suggestCrop(photo);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Measure final memory
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory growth should be reasonable (less than 50MB)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
    });

    it('should handle concurrent operations without excessive memory usage', async () => {
      const concurrentOperations = 5;
      const photos = Array.from({ length: concurrentOperations }, (_, i) => 
        createTestPhoto(`concurrent-${i}`, 1920, 1080, 2000000)
      );

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Run concurrent operations
      const promises = photos.map(async (photo) => {
        const enhanced = await photoEditor.enhancePhoto(photo);
        const suggestions = await photoEditor.suggestCrop(photo);
        return { enhanced, suggestions };
      });

      await Promise.all(promises);

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory usage should be reasonable for concurrent operations
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB
      }
    });
  });

  describe('Scalability Performance', () => {
    it('should maintain performance with increasing photo resolution', async () => {
      const resolutions = [
        { width: 800, height: 600 },
        { width: 1920, height: 1080 },
        { width: 2560, height: 1440 },
        { width: 3840, height: 2160 },
      ];

      const times: number[] = [];

      for (const resolution of resolutions) {
        const photo = createTestPhoto(
          `resolution-test-${resolution.width}x${resolution.height}`,
          resolution.width,
          resolution.height,
          resolution.width * resolution.height * 3 // Approximate file size
        );

        const startTime = performance.now();
        await photoEditor.enhancePhoto(photo);
        const endTime = performance.now();

        times.push(endTime - startTime);
      }

      // Performance should scale reasonably with resolution
      // Each step up should not be more than 3x slower
      for (let i = 1; i < times.length; i++) {
        const scaleFactor = times[i] / times[i - 1];
        expect(scaleFactor).toBeLessThan(3);
      }
    });

    it('should handle batch processing efficiently', async () => {
      const batchSizes = [1, 5, 10, 20];
      const basePhoto = testPhotos[1]; // Medium size

      for (const batchSize of batchSizes) {
        const photos = Array.from({ length: batchSize }, (_, i) => 
          createTestPhoto(`batch-${batchSize}-${i}`, 1920, 1080, 2000000)
        );

        const startTime = performance.now();
        
        // Process batch in parallel
        const promises = photos.map(photo => photoEditor.enhancePhoto(photo));
        await Promise.all(promises);
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const averageTimePerPhoto = totalTime / batchSize;

        // Average time per photo should not increase significantly with batch size
        expect(averageTimePerPhoto).toBeLessThan(2000); // 2 seconds per photo max
        
        console.log(`Batch size ${batchSize}: ${totalTime.toFixed(2)}ms total, ${averageTimePerPhoto.toFixed(2)}ms per photo`);
      }
    });
  });

  describe('Resource Optimization Performance', () => {
    it('should optimize processing based on device capabilities', async () => {
      // Test with different configuration settings
      const configs = [
        { maxImageSize: 1024, compressionQuality: 0.7, enableHardwareAcceleration: false },
        { maxImageSize: 2048, compressionQuality: 0.8, enableHardwareAcceleration: true },
        { maxImageSize: 4096, compressionQuality: 0.9, enableHardwareAcceleration: true },
      ];

      const photo = testPhotos[2]; // Large photo
      const times: number[] = [];

      for (const config of configs) {
        const optimizedEditor = new PhotoEditor(
          new ModelManager(),
          new ModelErrorHandler(),
          config
        );

        const startTime = performance.now();
        await optimizedEditor.enhancePhoto(photo);
        const endTime = performance.now();

        times.push(endTime - startTime);
      }

      // Hardware acceleration should improve performance
      expect(times[1]).toBeLessThan(times[0]); // Hardware acceleration enabled
      
      // Higher quality settings may take longer but should be reasonable
      expect(times[2]).toBeLessThan(times[1] * 1.5); // Not more than 50% slower
    });

    it('should adapt processing based on available memory', async () => {
      // Simulate low memory conditions
      const lowMemoryConfig = {
        maxImageSize: 1024,
        compressionQuality: 0.6,
        enableHardwareAcceleration: false,
        preserveOriginals: false,
      };

      const lowMemoryEditor = new PhotoEditor(
        new ModelManager(),
        new ModelErrorHandler(),
        lowMemoryConfig
      );

      const largePhoto = testPhotos[3]; // XLarge photo

      const startTime = performance.now();
      const result = await lowMemoryEditor.enhancePhoto(largePhoto);
      const endTime = performance.now();

      // Should complete within reasonable time even with constraints
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
      expect(result).toBeDefined();
    });
  });
});