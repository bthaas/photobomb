import {
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  SharedValue,
  runOnJS,
} from 'react-native-reanimated';

export interface SpringConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
}

export interface TimingConfig {
  duration?: number;
  easing?: typeof Easing.bezier;
}

export class AnimationService {
  // Default animation configurations
  static readonly SPRING_CONFIGS = {
    gentle: {
      damping: 20,
      stiffness: 90,
      mass: 1,
    } as SpringConfig,
    
    bouncy: {
      damping: 10,
      stiffness: 100,
      mass: 1,
    } as SpringConfig,
    
    snappy: {
      damping: 25,
      stiffness: 200,
      mass: 1,
    } as SpringConfig,
    
    smooth: {
      damping: 30,
      stiffness: 150,
      mass: 1,
      overshootClamping: true,
    } as SpringConfig,
  };

  static readonly TIMING_CONFIGS = {
    fast: {
      duration: 200,
      easing: Easing.out(Easing.quad),
    } as TimingConfig,
    
    normal: {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    } as TimingConfig,
    
    slow: {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    } as TimingConfig,
    
    smooth: {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    } as TimingConfig,
  };

  /**
   * Animate a shared value with spring animation
   */
  static spring(
    sharedValue: SharedValue<number>,
    toValue: number,
    config: SpringConfig = AnimationService.SPRING_CONFIGS.gentle,
    callback?: () => void
  ) {
    sharedValue.value = withSpring(toValue, config, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  }

  /**
   * Animate a shared value with timing animation
   */
  static timing(
    sharedValue: SharedValue<number>,
    toValue: number,
    config: TimingConfig = AnimationService.TIMING_CONFIGS.normal,
    callback?: () => void
  ) {
    sharedValue.value = withTiming(toValue, config, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  }

  /**
   * Create a fade in animation
   */
  static fadeIn(
    opacity: SharedValue<number>,
    duration: number = 300,
    delay: number = 0,
    callback?: () => void
  ) {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration }, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  }

  /**
   * Create a fade out animation
   */
  static fadeOut(
    opacity: SharedValue<number>,
    duration: number = 300,
    delay: number = 0,
    callback?: () => void
  ) {
    opacity.value = withDelay(
      delay,
      withTiming(0, { duration }, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  }

  /**
   * Create a scale animation
   */
  static scale(
    scale: SharedValue<number>,
    toValue: number,
    config: SpringConfig = AnimationService.SPRING_CONFIGS.bouncy,
    callback?: () => void
  ) {
    scale.value = withSpring(toValue, config, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  }

  /**
   * Create a pulse animation
   */
  static pulse(
    scale: SharedValue<number>,
    intensity: number = 0.1,
    duration: number = 600
  ) {
    scale.value = withRepeat(
      withSequence(
        withTiming(1 + intensity, { duration: duration / 2 }),
        withTiming(1, { duration: duration / 2 })
      ),
      -1,
      true
    );
  }

  /**
   * Create a shake animation
   */
  static shake(
    translateX: SharedValue<number>,
    intensity: number = 10,
    duration: number = 500
  ) {
    translateX.value = withSequence(
      withTiming(intensity, { duration: duration / 8 }),
      withTiming(-intensity, { duration: duration / 4 }),
      withTiming(intensity, { duration: duration / 4 }),
      withTiming(-intensity, { duration: duration / 4 }),
      withTiming(0, { duration: duration / 8 })
    );
  }

  /**
   * Create a slide in animation
   */
  static slideIn(
    translateX: SharedValue<number>,
    fromValue: number,
    toValue: number = 0,
    config: SpringConfig = AnimationService.SPRING_CONFIGS.smooth,
    callback?: () => void
  ) {
    translateX.value = fromValue;
    translateX.value = withSpring(toValue, config, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  }

  /**
   * Create a slide out animation
   */
  static slideOut(
    translateX: SharedValue<number>,
    toValue: number,
    config: SpringConfig = AnimationService.SPRING_CONFIGS.smooth,
    callback?: () => void
  ) {
    translateX.value = withSpring(toValue, config, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  }

  /**
   * Create a bounce animation
   */
  static bounce(
    translateY: SharedValue<number>,
    intensity: number = 20,
    duration: number = 400
  ) {
    translateY.value = withSequence(
      withTiming(-intensity, { duration: duration / 4 }),
      withTiming(0, { duration: duration / 4 }),
      withTiming(-intensity / 2, { duration: duration / 4 }),
      withTiming(0, { duration: duration / 4 })
    );
  }

  /**
   * Create a rotation animation
   */
  static rotate(
    rotation: SharedValue<number>,
    toValue: number,
    config: TimingConfig = AnimationService.TIMING_CONFIGS.normal,
    callback?: () => void
  ) {
    rotation.value = withTiming(toValue, config, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  }

  /**
   * Create a continuous rotation animation
   */
  static spin(
    rotation: SharedValue<number>,
    duration: number = 1000
  ) {
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }

  /**
   * Stop all animations on a shared value
   */
  static stop(sharedValue: SharedValue<number>) {
    sharedValue.value = sharedValue.value; // This stops the animation
  }
}