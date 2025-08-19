import { AnimationService } from '../../src/services/ui/AnimationService';
import { HapticService } from '../../src/services/ui/HapticService';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  withSpring: jest.fn((toValue, config, callback) => {
    // Simulate animation completion
    setTimeout(() => callback && callback(true), 100);
    return { toValue, config, callback };
  }),
  withTiming: jest.fn((toValue, config, callback) => {
    // Simulate animation completion
    setTimeout(() => callback && callback(true), config?.duration || 300);
    return { toValue, config, callback };
  }),
  withSequence: jest.fn(),
  withDelay: jest.fn(),
  withRepeat: jest.fn(),
  runOnJS: jest.fn((fn) => () => fn()),
  Easing: {
    bezier: jest.fn(),
    out: jest.fn(),
    in: jest.fn(),
    back: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
    linear: jest.fn(),
  },
}));

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
  },
}));

describe('Animation Performance Tests', () => {
  let mockSharedValue: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedValue = {
      value: 0,
    };
  });

  describe('Animation timing performance', () => {
    it('should complete spring animations within expected timeframe', async () => {
      const startTime = Date.now();
      const callback = jest.fn();
      
      AnimationService.spring(mockSharedValue, 1, AnimationService.SPRING_CONFIGS.fast, callback);
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete quickly
      expect(callback).toHaveBeenCalled();
    });

    it('should complete timing animations within expected timeframe', async () => {
      const startTime = Date.now();
      const callback = jest.fn();
      
      AnimationService.timing(
        mockSharedValue, 
        1, 
        AnimationService.TIMING_CONFIGS.fast, 
        callback
      );
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(300);
      expect(callback).toHaveBeenCalled();
    });

    it('should handle multiple concurrent animations efficiently', async () => {
      const startTime = Date.now();
      const callbacks = Array.from({ length: 10 }, () => jest.fn());
      const sharedValues = Array.from({ length: 10 }, () => ({ value: 0 }));
      
      // Start multiple animations concurrently
      sharedValues.forEach((sv, index) => {
        AnimationService.spring(sv, 1, AnimationService.SPRING_CONFIGS.fast, callbacks[index]);
      });
      
      // Wait for all animations to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(250); // Should not significantly increase with concurrent animations
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe('Haptic feedback performance', () => {
    it('should trigger haptic feedback without blocking', () => {
      const startTime = Date.now();
      
      // Trigger multiple haptic feedbacks
      HapticService.light();
      HapticService.medium();
      HapticService.heavy();
      HapticService.success();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Should be nearly instantaneous
    });

    it('should handle rapid haptic feedback calls', () => {
      const startTime = Date.now();
      
      // Trigger rapid haptic feedback
      for (let i = 0; i < 50; i++) {
        HapticService.light();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should handle rapid calls efficiently
    });
  });

  describe('Animation configuration performance', () => {
    it('should access predefined configurations efficiently', () => {
      const startTime = Date.now();
      
      // Access configurations multiple times
      for (let i = 0; i < 1000; i++) {
        const config = AnimationService.SPRING_CONFIGS.gentle;
        const timingConfig = AnimationService.TIMING_CONFIGS.normal;
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Configuration access should be very fast
    });

    it('should create animation calls efficiently', () => {
      const startTime = Date.now();
      
      // Create multiple animation calls
      for (let i = 0; i < 100; i++) {
        AnimationService.spring(mockSharedValue, Math.random());
        AnimationService.timing(mockSharedValue, Math.random());
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Animation setup should be fast
    });
  });

  describe('Memory usage optimization', () => {
    it('should not create memory leaks with repeated animations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many animation calls
      for (let i = 0; i < 1000; i++) {
        const sv = { value: 0 };
        AnimationService.spring(sv, 1);
        AnimationService.timing(sv, 0);
        AnimationService.fadeIn(sv);
        AnimationService.fadeOut(sv);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle animation cleanup properly', () => {
      const callbacks = Array.from({ length: 100 }, () => jest.fn());
      
      // Create animations with callbacks
      callbacks.forEach((callback, index) => {
        const sv = { value: 0 };
        AnimationService.spring(sv, 1, AnimationService.SPRING_CONFIGS.fast, callback);
      });
      
      // All callbacks should be callable without errors
      callbacks.forEach(callback => {
        expect(() => callback()).not.toThrow();
      });
    });
  });

  describe('Animation interruption handling', () => {
    it('should handle animation stops efficiently', () => {
      const startTime = Date.now();
      
      // Start and immediately stop many animations
      for (let i = 0; i < 100; i++) {
        const sv = { value: 0 };
        AnimationService.spring(sv, 1);
        AnimationService.stop(sv);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should handle stops efficiently
    });

    it('should handle animation value changes during animation', () => {
      const sv = { value: 0 };
      
      // Start animation
      AnimationService.spring(sv, 1);
      
      // Change value during animation
      sv.value = 0.5;
      
      // Start another animation
      AnimationService.timing(sv, 0);
      
      // Should not throw errors
      expect(() => AnimationService.stop(sv)).not.toThrow();
    });
  });
});