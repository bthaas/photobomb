/**
 * Crop Overlay Component - Visual crop selection interface
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanGestureHandler,
  PinchGestureHandler,
  State,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { CropSuggestion } from '../../types/editing';

interface CropOverlayProps {
  imageWidth: number;
  imageHeight: number;
  cropSuggestion?: CropSuggestion;
  onCropChange: (crop: { x: number; y: number; width: number; height: number }) => void;
  aspectRatio?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const CropOverlay: React.FC<CropOverlayProps> = ({
  imageWidth,
  imageHeight,
  cropSuggestion,
  onCropChange,
  aspectRatio,
}) => {
  const scale = screenWidth / imageWidth;
  const displayWidth = screenWidth;
  const displayHeight = imageHeight * scale;

  // Initialize crop area
  const initialCrop = cropSuggestion ? {
    x: cropSuggestion.coordinates.x * scale,
    y: cropSuggestion.coordinates.y * scale,
    width: cropSuggestion.coordinates.width * scale,
    height: cropSuggestion.coordinates.height * scale,
  } : {
    x: displayWidth * 0.1,
    y: displayHeight * 0.1,
    width: displayWidth * 0.8,
    height: displayHeight * 0.8,
  };

  const cropX = useSharedValue(initialCrop.x);
  const cropY = useSharedValue(initialCrop.y);
  const cropWidth = useSharedValue(initialCrop.width);
  const cropHeight = useSharedValue(initialCrop.height);

  const panRef = useRef();
  const pinchRef = useRef();

  const updateCrop = () => {
    const crop = {
      x: cropX.value / scale,
      y: cropY.value / scale,
      width: cropWidth.value / scale,
      height: cropHeight.value / scale,
    };
    onCropChange(crop);
  };

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = cropX.value;
      context.startY = cropY.value;
    },
    onActive: (event, context: any) => {
      const newX = context.startX + event.translationX;
      const newY = context.startY + event.translationY;

      // Constrain to image bounds
      cropX.value = Math.max(0, Math.min(newX, displayWidth - cropWidth.value));
      cropY.value = Math.max(0, Math.min(newY, displayHeight - cropHeight.value));
    },
    onEnd: () => {
      runOnJS(updateCrop)();
    },
  });

  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startWidth = cropWidth.value;
      context.startHeight = cropHeight.value;
    },
    onActive: (event, context: any) => {
      const newWidth = context.startWidth * event.scale;
      const newHeight = aspectRatio 
        ? newWidth / aspectRatio 
        : context.startHeight * event.scale;

      // Constrain to image bounds
      const maxWidth = displayWidth - cropX.value;
      const maxHeight = displayHeight - cropY.value;

      cropWidth.value = Math.max(50, Math.min(newWidth, maxWidth));
      cropHeight.value = Math.max(50, Math.min(newHeight, maxHeight));

      // Adjust position if crop area exceeds bounds
      if (cropX.value + cropWidth.value > displayWidth) {
        cropX.value = displayWidth - cropWidth.value;
      }
      if (cropY.value + cropHeight.value > displayHeight) {
        cropY.value = displayHeight - cropHeight.value;
      }
    },
    onEnd: () => {
      runOnJS(updateCrop)();
    },
  });

  const cropAreaStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cropX.value },
      { translateY: cropY.value },
    ],
    width: cropWidth.value,
    height: cropHeight.value,
  }));

  const renderCornerHandle = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
    const cornerStyles = {
      topLeft: { top: -5, left: -5 },
      topRight: { top: -5, right: -5 },
      bottomLeft: { bottom: -5, left: -5 },
      bottomRight: { bottom: -5, right: -5 },
    };

    return (
      <View
        key={position}
        style={[styles.cornerHandle, cornerStyles[position]]}
      />
    );
  };

  const renderEdgeHandle = (position: 'top' | 'right' | 'bottom' | 'left') => {
    const edgeStyles = {
      top: { top: -2, left: '50%', marginLeft: -10, width: 20, height: 4 },
      right: { right: -2, top: '50%', marginTop: -10, width: 4, height: 20 },
      bottom: { bottom: -2, left: '50%', marginLeft: -10, width: 20, height: 4 },
      left: { left: -2, top: '50%', marginTop: -10, width: 4, height: 20 },
    };

    return (
      <View
        key={position}
        style={[styles.edgeHandle, edgeStyles[position]]}
      />
    );
  };

  return (
    <View style={[styles.container, { width: displayWidth, height: displayHeight }]}>
      {/* Overlay masks */}
      <View style={styles.overlayContainer}>
        {/* Top mask */}
        <Animated.View
          style={[
            styles.overlayMask,
            {
              top: 0,
              left: 0,
              right: 0,
              height: cropY,
            },
          ]}
        />
        
        {/* Bottom mask */}
        <Animated.View
          style={[
            styles.overlayMask,
            useAnimatedStyle(() => ({
              top: cropY.value + cropHeight.value,
              left: 0,
              right: 0,
              bottom: 0,
            })),
          ]}
        />
        
        {/* Left mask */}
        <Animated.View
          style={[
            styles.overlayMask,
            useAnimatedStyle(() => ({
              top: cropY.value,
              left: 0,
              width: cropX.value,
              height: cropHeight.value,
            })),
          ]}
        />
        
        {/* Right mask */}
        <Animated.View
          style={[
            styles.overlayMask,
            useAnimatedStyle(() => ({
              top: cropY.value,
              left: cropX.value + cropWidth.value,
              right: 0,
              height: cropHeight.value,
            })),
          ]}
        />
      </View>

      {/* Crop area */}
      <PinchGestureHandler
        ref={pinchRef}
        onGestureEvent={pinchGestureHandler}
        simultaneousHandlers={panRef}
      >
        <Animated.View>
          <PanGestureHandler
            ref={panRef}
            onGestureEvent={panGestureHandler}
            simultaneousHandlers={pinchRef}
          >
            <Animated.View style={[styles.cropArea, cropAreaStyle]}>
              {/* Grid lines */}
              <View style={styles.gridContainer}>
                <View style={[styles.gridLine, styles.verticalLine, { left: '33.33%' }]} />
                <View style={[styles.gridLine, styles.verticalLine, { left: '66.66%' }]} />
                <View style={[styles.gridLine, styles.horizontalLine, { top: '33.33%' }]} />
                <View style={[styles.gridLine, styles.horizontalLine, { top: '66.66%' }]} />
              </View>

              {/* Corner handles */}
              {renderCornerHandle('topLeft')}
              {renderCornerHandle('topRight')}
              {renderCornerHandle('bottomLeft')}
              {renderCornerHandle('bottomRight')}

              {/* Edge handles */}
              {renderEdgeHandle('top')}
              {renderEdgeHandle('right')}
              {renderEdgeHandle('bottom')}
              {renderEdgeHandle('left')}
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayMask: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cropArea: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: 1,
  },
  cornerHandle: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  edgeHandle: {
    position: 'absolute',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});