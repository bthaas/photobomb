import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { HapticService } from '../../services/ui/HapticService';
import { AnimationService } from '../../services/ui/AnimationService';

const { width: screenWidth } = Dimensions.get('window');

interface GesturePhotoCardProps {
  imageUri: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  style?: ViewStyle;
  swipeThreshold?: number;
  enableSwipe?: boolean;
  enableSelection?: boolean;
  isSelected?: boolean;
}

export const GesturePhotoCard: React.FC<GesturePhotoCardProps> = ({
  imageUri,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onLongPress,
  onDoubleTap,
  style,
  swipeThreshold = screenWidth * 0.3,
  enableSwipe = true,
  enableSelection = false,
  isSelected = false,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panRef = useRef();
  const tapRef = useRef();
  const doubleTapRef = useRef();
  const longPressRef = useRef();

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(HapticService.light)();
    },
    onActive: (event) => {
      if (enableSwipe) {
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.1; // Subtle vertical movement
        
        // Add rotation based on horizontal movement
        rotation.value = interpolate(
          event.translationX,
          [-screenWidth, screenWidth],
          [-15, 15],
          Extrapolate.CLAMP
        );
        
        // Add opacity fade based on distance
        opacity.value = interpolate(
          Math.abs(event.translationX),
          [0, swipeThreshold],
          [1, 0.7],
          Extrapolate.CLAMP
        );
      }
    },
    onEnd: (event) => {
      const shouldSwipeLeft = event.translationX < -swipeThreshold && onSwipeLeft;
      const shouldSwipeRight = event.translationX > swipeThreshold && onSwipeRight;
      
      if (shouldSwipeLeft) {
        // Animate out to the left
        translateX.value = withTiming(-screenWidth, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        runOnJS(HapticService.success)();
        setTimeout(() => runOnJS(onSwipeLeft!)(), 300);
      } else if (shouldSwipeRight) {
        // Animate out to the right
        translateX.value = withTiming(screenWidth, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        runOnJS(HapticService.success)();
        setTimeout(() => runOnJS(onSwipeRight!)(), 300);
      } else {
        // Spring back to center
        translateX.value = withSpring(0, AnimationService.SPRING_CONFIGS.bouncy);
        translateY.value = withSpring(0, AnimationService.SPRING_CONFIGS.bouncy);
        rotation.value = withSpring(0, AnimationService.SPRING_CONFIGS.bouncy);
        opacity.value = withSpring(1, AnimationService.SPRING_CONFIGS.gentle);
      }
    },
  });

  const tapGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(HapticService.light)();
      
      // Quick scale animation for feedback
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      
      if (onTap) {
        runOnJS(onTap)();
      }
    },
  });

  const doubleTapGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(HapticService.medium)();
      
      // Bounce animation for double tap
      scale.value = withSequence(
        withTiming(1.1, { duration: 150 }),
        withSpring(1, AnimationService.SPRING_CONFIGS.bouncy)
      );
      
      if (onDoubleTap) {
        runOnJS(onDoubleTap)();
      }
    },
  });

  const longPressGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(HapticService.heavy)();
      
      // Pulse animation for long press
      scale.value = withSequence(
        withTiming(1.05, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
      
      if (onLongPress) {
        runOnJS(onLongPress)();
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const selectionStyle = useAnimatedStyle(() => {
    if (!enableSelection) return {};
    
    return {
      borderWidth: isSelected ? 3 : 0,
      borderColor: '#007AFF',
    };
  });

  return (
    <View style={[styles.container, style]}>
      <LongPressGestureHandler
        ref={longPressRef}
        onGestureEvent={longPressGestureHandler}
        minDurationMs={500}
        simultaneousHandlers={[panRef, tapRef]}
      >
        <Animated.View>
          <TapGestureHandler
            ref={doubleTapRef}
            onGestureEvent={doubleTapGestureHandler}
            numberOfTaps={2}
            maxDelayMs={300}
            simultaneousHandlers={[panRef]}
          >
            <Animated.View>
              <TapGestureHandler
                ref={tapRef}
                onGestureEvent={tapGestureHandler}
                waitFor={doubleTapRef}
                simultaneousHandlers={[panRef, longPressRef]}
              >
                <Animated.View>
                  <PanGestureHandler
                    ref={panRef}
                    onGestureEvent={panGestureHandler}
                    simultaneousHandlers={[tapRef, longPressRef]}
                    enabled={enableSwipe}
                  >
                    <Animated.View style={[styles.card, animatedStyle, selectionStyle]}>
                      <Animated.Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                      
                      {/* Swipe indicators */}
                      {enableSwipe && (
                        <>
                          <Animated.View
                            style={[
                              styles.swipeIndicator,
                              styles.leftIndicator,
                              useAnimatedStyle(() => ({
                                opacity: interpolate(
                                  translateX.value,
                                  [-swipeThreshold, 0],
                                  [1, 0],
                                  Extrapolate.CLAMP
                                ),
                              })),
                            ]}
                          />
                          <Animated.View
                            style={[
                              styles.swipeIndicator,
                              styles.rightIndicator,
                              useAnimatedStyle(() => ({
                                opacity: interpolate(
                                  translateX.value,
                                  [0, swipeThreshold],
                                  [0, 1],
                                  Extrapolate.CLAMP
                                ),
                              })),
                            ]}
                          />
                        </>
                      )}
                    </Animated.View>
                  </PanGestureHandler>
                </Animated.View>
              </TapGestureHandler>
            </Animated.View>
          </TapGestureHandler>
        </Animated.View>
      </LongPressGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#007AFF',
  },
  leftIndicator: {
    left: 0,
  },
  rightIndicator: {
    right: 0,
  },
});

export default GesturePhotoCard;