import { AnimationService } from '../../../src/services/ui/AnimationService';
import {
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS,
} from 'react-native-reanimated';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  withSpring: jest.fn(),
  withTiming: jest.fn(),
  withSequence: jest.fn(),
  withDelay: jest.fn(),
  withRepeat: jest.fn(),
  runOnJS: jest.fn(),
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

describe('AnimationService', () => {
  let mockSharedValue: any;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
    mockSharedValue = {
      value: 0,
    };
    
    // Mock the animation functions to return the animation config
    (withSpring as jest.Mock).mockImplementation((toValue, config, callback) => {
      if (callback) callback(true);
      return { toValue, config, callback };
    });
    
    (withTiming as jest.Mock).mockImplementation((toValue, config, callback) => {
      if (callback) callback(true);
      return { toValue, config, callback };
    });
    
    (runOnJS as jest.Mock).mockImplementation((fn) => () => fn());
  });

  describe('SPRING_CONFIGS', () => {
    it('should have predefined spring configurations', () => {
      expect(AnimationService.SPRING_CONFIGS.gentle).toEqual({
        damping: 20,
        stiffness: 90,
        mass: 1,
      });
      
      expect(AnimationService.SPRING_CONFIGS.bouncy).toEqual({
        damping: 10,
        stiffness: 100,
        mass: 1,
      });
      
      expect(AnimationService.SPRING_CONFIGS.snappy).toEqual({
        damping: 25,
        stiffness: 200,
        mass: 1,
      });
      
      expect(AnimationService.SPRING_CONFIGS.smooth).toEqual({
        damping: 30,
        stiffness: 150,
        mass: 1,
        overshootClamping: true,
      });
    });
  });

  describe('TIMING_CONFIGS', () => {
    it('should have predefined timing configurations', () => {
      expect(AnimationService.TIMING_CONFIGS.fast.duration).toBe(200);
      expect(AnimationService.TIMING_CONFIGS.normal.duration).toBe(300);
      expect(AnimationService.TIMING_CONFIGS.slow.duration).toBe(500);
      expect(AnimationService.TIMING_CONFIGS.smooth.duration).toBe(400);
    });
  });

  describe('spring animation', () => {
    it('should animate shared value with spring', () => {
      const toValue = 1;
      const config = AnimationService.SPRING_CONFIGS.bouncy;
      
      AnimationService.spring(mockSharedValue, toValue, config, mockCallback);
      
      expect(withSpring).toHaveBeenCalledWith(
        toValue,
        config,
        expect.any(Function)
      );
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should use default config when none provided', () => {
      const toValue = 1;
      
      AnimationService.spring(mockSharedValue, toValue);
      
      expect(withSpring).toHaveBeenCalledWith(
        toValue,
        AnimationService.SPRING_CONFIGS.gentle,
        expect.any(Function)
      );
    });
  });

  describe('timing animation', () => {
    it('should animate shared value with timing', () => {
      const toValue = 1;
      const config = AnimationService.TIMING_CONFIGS.fast;
      
      AnimationService.timing(mockSharedValue, toValue, config, mockCallback);
      
      expect(withTiming).toHaveBeenCalledWith(
        toValue,
        config,
        expect.any(Function)
      );
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should use default config when none provided', () => {
      const toValue = 1;
      
      AnimationService.timing(mockSharedValue, toValue);
      
      expect(withTiming).toHaveBeenCalledWith(
        toValue,
        AnimationService.TIMING_CONFIGS.normal,
        expect.any(Function)
      );
    });
  });

  describe('fadeIn animation', () => {
    it('should fade in with default parameters', () => {
      AnimationService.fadeIn(mockSharedValue);
      
      expect(withDelay).toHaveBeenCalledWith(
        0,
        expect.any(Object)
      );
    });

    it('should fade in with custom duration and delay', () => {
      const duration = 500;
      const delay = 100;
      
      AnimationService.fadeIn(mockSharedValue, duration, delay, mockCallback);
      
      expect(withDelay).toHaveBeenCalledWith(
        delay,
        expect.any(Object)
      );
    });
  });

  describe('fadeOut animation', () => {
    it('should fade out with default parameters', () => {
      AnimationService.fadeOut(mockSharedValue);
      
      expect(withDelay).toHaveBeenCalledWith(
        0,
        expect.any(Object)
      );
    });

    it('should fade out with custom duration and delay', () => {
      const duration = 500;
      const delay = 100;
      
      AnimationService.fadeOut(mockSharedValue, duration, delay, mockCallback);
      
      expect(withDelay).toHaveBeenCalledWith(
        delay,
        expect.any(Object)
      );
    });
  });

  describe('scale animation', () => {
    it('should scale with default config', () => {
      const toValue = 1.2;
      
      AnimationService.scale(mockSharedValue, toValue);
      
      expect(withSpring).toHaveBeenCalledWith(
        toValue,
        AnimationService.SPRING_CONFIGS.bouncy,
        expect.any(Function)
      );
    });

    it('should scale with custom config and callback', () => {
      const toValue = 0.8;
      const config = AnimationService.SPRING_CONFIGS.gentle;
      
      AnimationService.scale(mockSharedValue, toValue, config, mockCallback);
      
      expect(withSpring).toHaveBeenCalledWith(
        toValue,
        config,
        expect.any(Function)
      );
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('pulse animation', () => {
    it('should create pulse animation with default parameters', () => {
      AnimationService.pulse(mockSharedValue);
      
      expect(withRepeat).toHaveBeenCalled();
      expect(withSequence).toHaveBeenCalled();
    });

    it('should create pulse animation with custom intensity and duration', () => {
      const intensity = 0.2;
      const duration = 800;
      
      AnimationService.pulse(mockSharedValue, intensity, duration);
      
      expect(withRepeat).toHaveBeenCalled();
      expect(withSequence).toHaveBeenCalled();
    });
  });

  describe('shake animation', () => {
    it('should create shake animation with default parameters', () => {
      AnimationService.shake(mockSharedValue);
      
      expect(withSequence).toHaveBeenCalled();
    });

    it('should create shake animation with custom intensity and duration', () => {
      const intensity = 15;
      const duration = 600;
      
      AnimationService.shake(mockSharedValue, intensity, duration);
      
      expect(withSequence).toHaveBeenCalled();
    });
  });

  describe('slideIn animation', () => {
    it('should slide in from specified position', () => {
      const fromValue = 100;
      const toValue = 0;
      
      AnimationService.slideIn(mockSharedValue, fromValue, toValue);
      
      // The value should be set to fromValue first, then animated
      expect(withSpring).toHaveBeenCalledWith(
        toValue,
        AnimationService.SPRING_CONFIGS.smooth,
        expect.any(Function)
      );
    });
  });

  describe('slideOut animation', () => {
    it('should slide out to specified position', () => {
      const toValue = -100;
      
      AnimationService.slideOut(mockSharedValue, toValue);
      
      expect(withSpring).toHaveBeenCalledWith(
        toValue,
        AnimationService.SPRING_CONFIGS.smooth,
        expect.any(Function)
      );
    });
  });

  describe('bounce animation', () => {
    it('should create bounce animation with default parameters', () => {
      AnimationService.bounce(mockSharedValue);
      
      expect(withSequence).toHaveBeenCalled();
    });

    it('should create bounce animation with custom intensity and duration', () => {
      const intensity = 30;
      const duration = 500;
      
      AnimationService.bounce(mockSharedValue, intensity, duration);
      
      expect(withSequence).toHaveBeenCalled();
    });
  });

  describe('rotate animation', () => {
    it('should rotate to specified value', () => {
      const toValue = 180;
      
      AnimationService.rotate(mockSharedValue, toValue);
      
      expect(withTiming).toHaveBeenCalledWith(
        toValue,
        AnimationService.TIMING_CONFIGS.normal,
        expect.any(Function)
      );
    });

    it('should rotate with custom config and callback', () => {
      const toValue = 90;
      const config = AnimationService.TIMING_CONFIGS.fast;
      
      AnimationService.rotate(mockSharedValue, toValue, config, mockCallback);
      
      expect(withTiming).toHaveBeenCalledWith(
        toValue,
        config,
        expect.any(Function)
      );
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('spin animation', () => {
    it('should create continuous rotation', () => {
      AnimationService.spin(mockSharedValue);
      
      expect(withRepeat).toHaveBeenCalledWith(
        expect.any(Object),
        -1,
        false
      );
    });

    it('should create continuous rotation with custom duration', () => {
      const duration = 2000;
      
      AnimationService.spin(mockSharedValue, duration);
      
      expect(withRepeat).toHaveBeenCalledWith(
        expect.any(Object),
        -1,
        false
      );
    });
  });

  describe('stop animation', () => {
    it('should stop animation by setting value to itself', () => {
      mockSharedValue.value = 0.5;
      
      AnimationService.stop(mockSharedValue);
      
      expect(mockSharedValue.value).toBe(0.5);
    });
  });
});