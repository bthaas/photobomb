import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { HapticService } from '../../services/ui/HapticService';
import { AnimationService } from '../../services/ui/AnimationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PhotoZoomPanProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onZoomChange?: (scale: number) => void;
  onDoubleTap?: () => void;
  style?: ViewStyle;
  maxZoom?: number;
  minZoom?: number;
}

export const PhotoZoomPan: React.FC<PhotoZoomPanProps> = ({
  imageUri,
  imageWidth,
  imageHeight,
  onZoomChange,
  onDoubleTap,
  style,
  maxZoom = 4,
  minZoom = 1,
}) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const panRef = useRef();
  const pinchRef = useRef();
  const doubleTapRef = useRef();

  // Calculate the aspect ratio and initial scale to fit the image
  const imageAspectRatio = imageWidth / imageHeight;
  const screenAspectRatio = screenWidth / screenHeight;
  
  const initialScale = imageAspectRatio > screenAspectRatio
    ? screenWidth / imageWidth
    : screenHeight / imageHeight;

  const clampTranslation = (
    translateValue: number,
    scaledSize: number,
    screenSize: number
  ) => {
    'worklet';
    const maxTranslate = Math.max(0, (scaledSize - screenSize) / 2);
    return Math.max(-maxTranslate, Math.min(maxTranslate, translateValue));
  };

  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startScale = scale.value;
      context.startTranslateX = translateX.value;
      context.startTranslateY = translateY.value;
      runOnJS(HapticService.light)();
    },
    onActive: (event, context) => {
      const newScale = Math.max(
        minZoom,
        Math.min(maxZoom, context.startScale * event.scale)
      );
      
      scale.value = newScale;
      
      // Calculate focal point translation
      const deltaX = (event.focalX - screenWidth / 2) * (newScale - 1);
      const deltaY = (event.focalY - screenHeight / 2) * (newScale - 1);
      
      const scaledWidth = imageWidth * initialScale * newScale;
      const scaledHeight = imageHeight * initialScale * newScale;
      
      translateX.value = clampTranslation(
        context.startTranslateX + deltaX,
        scaledWidth,
        screenWidth
      );
      translateY.value = clampTranslation(
        context.startTranslateY + deltaY,
        scaledHeight,
        screenHeight
      );

      if (onZoomChange) {
        runOnJS(onZoomChange)(newScale);
      }
    },
    onEnd: () => {
      if (scale.value < minZoom) {
        scale.value = withSpring(minZoom, AnimationService.SPRING_CONFIGS.smooth);
        translateX.value = withSpring(0, AnimationService.SPRING_CONFIGS.smooth);
        translateY.value = withSpring(0, AnimationService.SPRING_CONFIGS.smooth);
      }
    },
  });

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startTranslateX = translateX.value;
      context.startTranslateY = translateY.value;
    },
    onActive: (event, context) => {
      if (scale.value > minZoom) {
        const scaledWidth = imageWidth * initialScale * scale.value;
        const scaledHeight = imageHeight * initialScale * scale.value;
        
        translateX.value = clampTranslation(
          context.startTranslateX + event.translationX,
          scaledWidth,
          screenWidth
        );
        translateY.value = clampTranslation(
          context.startTranslateY + event.translationY,
          scaledHeight,
          screenHeight
        );
      }
    },
    onEnd: () => {
      // Add momentum scrolling
      const scaledWidth = imageWidth * initialScale * scale.value;
      const scaledHeight = imageHeight * initialScale * scale.value;
      
      translateX.value = withSpring(
        clampTranslation(translateX.value, scaledWidth, screenWidth),
        AnimationService.SPRING_CONFIGS.smooth
      );
      translateY.value = withSpring(
        clampTranslation(translateY.value, scaledHeight, screenHeight),
        AnimationService.SPRING_CONFIGS.smooth
      );
    },
  });

  const doubleTapGestureHandler = useAnimatedGestureHandler({
    onStart: (event) => {
      runOnJS(HapticService.medium)();
      
      if (scale.value > minZoom) {
        // Zoom out to fit
        scale.value = withSpring(minZoom, AnimationService.SPRING_CONFIGS.bouncy);
        translateX.value = withSpring(0, AnimationService.SPRING_CONFIGS.bouncy);
        translateY.value = withSpring(0, AnimationService.SPRING_CONFIGS.bouncy);
      } else {
        // Zoom in to 2x at tap location
        const targetScale = Math.min(maxZoom, 2);
        scale.value = withSpring(targetScale, AnimationService.SPRING_CONFIGS.bouncy);
        
        // Calculate translation to center on tap point
        const deltaX = (event.x - screenWidth / 2) * (targetScale - 1);
        const deltaY = (event.y - screenHeight / 2) * (targetScale - 1);
        
        const scaledWidth = imageWidth * initialScale * targetScale;
        const scaledHeight = imageHeight * initialScale * targetScale;
        
        translateX.value = withSpring(
          clampTranslation(-deltaX, scaledWidth, screenWidth),
          AnimationService.SPRING_CONFIGS.bouncy
        );
        translateY.value = withSpring(
          clampTranslation(-deltaY, scaledHeight, screenHeight),
          AnimationService.SPRING_CONFIGS.bouncy
        );
      }
      
      if (onDoubleTap) {
        runOnJS(onDoubleTap)();
      }
      
      if (onZoomChange) {
        runOnJS(onZoomChange)(scale.value > minZoom ? 2 : minZoom);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * initialScale },
    ],
  }));

  return (
    <View style={[styles.container, style]}>
      <TapGestureHandler
        ref={doubleTapRef}
        onGestureEvent={doubleTapGestureHandler}
        numberOfTaps={2}
        maxDelayMs={300}
      >
        <Animated.View style={styles.gestureContainer}>
          <PinchGestureHandler
            ref={pinchRef}
            onGestureEvent={pinchGestureHandler}
            simultaneousHandlers={[panRef]}
          >
            <Animated.View style={styles.gestureContainer}>
              <PanGestureHandler
                ref={panRef}
                onGestureEvent={panGestureHandler}
                simultaneousHandlers={[pinchRef]}
                minPointers={1}
                maxPointers={1}
                avgTouches
              >
                <Animated.View style={styles.gestureContainer}>
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={[
                      styles.image,
                      {
                        width: imageWidth,
                        height: imageHeight,
                      },
                      animatedStyle,
                    ]}
                    resizeMode="contain"
                  />
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </TapGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    maxWidth: screenWidth,
    maxHeight: screenHeight,
  },
});

export default PhotoZoomPan;