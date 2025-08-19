import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { AnimationService } from '../../services/ui/AnimationService';

export type TransitionType = 
  | 'fade'
  | 'slide'
  | 'scale'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleAndFade'
  | 'bounce'
  | 'flip';

interface FluidTransitionProps {
  children: React.ReactNode;
  visible: boolean;
  type?: TransitionType;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  onAnimationComplete?: () => void;
}

export const FluidTransition: React.FC<FluidTransitionProps> = ({
  children,
  visible,
  type = 'fade',
  duration = 300,
  delay = 0,
  style,
  onAnimationComplete,
}) => {
  const opacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.8);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateY = useSharedValue(0);

  useEffect(() => {
    const animateIn = () => {
      switch (type) {
        case 'fade':
          AnimationService.fadeIn(opacity, duration, delay, onAnimationComplete);
          break;
          
        case 'scale':
          opacity.value = withDelay(delay, withTiming(1, { duration }));
          AnimationService.scale(
            scale,
            1,
            AnimationService.SPRING_CONFIGS.bouncy,
            onAnimationComplete
          );
          break;
          
        case 'slideUp':
          translateY.value = 50;
          opacity.value = withDelay(delay, withTiming(1, { duration }));
          AnimationService.slideIn(
            translateY,
            50,
            0,
            AnimationService.SPRING_CONFIGS.smooth,
            onAnimationComplete
          );
          break;
          
        case 'slideDown':
          translateY.value = -50;
          opacity.value = withDelay(delay, withTiming(1, { duration }));
          AnimationService.slideIn(
            translateY,
            -50,
            0,
            AnimationService.SPRING_CONFIGS.smooth,
            onAnimationComplete
          );
          break;
          
        case 'slideLeft':
          translateX.value = 50;
          opacity.value = withDelay(delay, withTiming(1, { duration }));
          AnimationService.slideIn(
            translateX,
            50,
            0,
            AnimationService.SPRING_CONFIGS.smooth,
            onAnimationComplete
          );
          break;
          
        case 'slideRight':
          translateX.value = -50;
          opacity.value = withDelay(delay, withTiming(1, { duration }));
          AnimationService.slideIn(
            translateX,
            -50,
            0,
            AnimationService.SPRING_CONFIGS.smooth,
            onAnimationComplete
          );
          break;
          
        case 'scaleAndFade':
          scale.value = 0.8;
          opacity.value = withDelay(delay, withTiming(1, { duration }));
          AnimationService.scale(
            scale,
            1,
            AnimationService.SPRING_CONFIGS.gentle,
            onAnimationComplete
          );
          break;
          
        case 'bounce':
          translateY.value = 30;
          opacity.value = withDelay(delay, withTiming(1, { duration: duration / 2 }));
          AnimationService.bounce(translateY, 30, duration);
          if (onAnimationComplete) {
            setTimeout(onAnimationComplete, duration + delay);
          }
          break;
          
        case 'flip':
          rotateY.value = 90;
          opacity.value = withDelay(delay, withTiming(1, { duration }));
          AnimationService.rotate(
            rotateY,
            0,
            { duration, easing: Easing.out(Easing.back(1.5)) },
            onAnimationComplete
          );
          break;
          
        default:
          AnimationService.fadeIn(opacity, duration, delay, onAnimationComplete);
      }
    };

    const animateOut = () => {
      switch (type) {
        case 'fade':
          AnimationService.fadeOut(opacity, duration, delay, onAnimationComplete);
          break;
          
        case 'scale':
          opacity.value = withDelay(delay, withTiming(0, { duration }));
          AnimationService.scale(
            scale,
            0.8,
            AnimationService.SPRING_CONFIGS.gentle,
            onAnimationComplete
          );
          break;
          
        case 'slideUp':
          opacity.value = withDelay(delay, withTiming(0, { duration }));
          AnimationService.slideOut(
            translateY,
            -50,
            AnimationService.SPRING_CONFIGS.smooth,
            onAnimationComplete
          );
          break;
          
        case 'slideDown':
          opacity.value = withDelay(delay, withTiming(0, { duration }));
          AnimationService.slideOut(
            translateY,
            50,
            AnimationService.SPRING_CONFIGS.smooth,
            onAnimationComplete
          );
          break;
          
        case 'slideLeft':
          opacity.value = withDelay(delay, withTiming(0, { duration }));
          AnimationService.slideOut(
            translateX,
            -50,
            AnimationService.SPRING_CONFIGS.smooth,
            onAnimationComplete
          );
          break;
          
        case 'slideRight':
          opacity.value = withDelay(delay, withTiming(0, { duration }));
          AnimationService.slideOut(
            translateX,
            50,
            AnimationService.SPRING_CONFIGS.smooth,
            onAnimationComplete
          );
          break;
          
        case 'scaleAndFade':
          opacity.value = withDelay(delay, withTiming(0, { duration }));
          AnimationService.scale(
            scale,
            0.8,
            AnimationService.SPRING_CONFIGS.gentle,
            onAnimationComplete
          );
          break;
          
        case 'bounce':
          opacity.value = withDelay(delay, withTiming(0, { duration }));
          translateY.value = withDelay(
            delay,
            withTiming(30, { duration }, (finished) => {
              if (finished && onAnimationComplete) {
                runOnJS(onAnimationComplete)();
              }
            })
          );
          break;
          
        case 'flip':
          opacity.value = withDelay(delay, withTiming(0, { duration }));
          AnimationService.rotate(
            rotateY,
            -90,
            { duration, easing: Easing.in(Easing.back(1.5)) },
            onAnimationComplete
          );
          break;
          
        default:
          AnimationService.fadeOut(opacity, duration, delay, onAnimationComplete);
      }
    };

    if (visible) {
      animateIn();
    } else {
      animateOut();
    }
  }, [visible, type, duration, delay, onAnimationComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default FluidTransition;