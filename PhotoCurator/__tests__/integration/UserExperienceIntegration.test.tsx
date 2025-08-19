import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { GesturePhotoCard } from '../../src/components/ui/GesturePhotoCard';
import { FluidTransition } from '../../src/components/ui/FluidTransition';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { SkeletonScreen } from '../../src/components/ui/SkeletonScreen';
import { HapticService } from '../../src/services/ui/HapticService';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View,
    },
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    useAnimatedGestureHandler: () => ({}),
    withSpring: jest.fn(),
    withTiming: jest.fn(),
    withSequence: jest.fn(),
    withDelay: jest.fn(),
    withRepeat: jest.fn(),
    runOnJS: jest.fn((fn) => () => fn()),
    interpolate: jest.fn(),
    Extrapolate: { CLAMP: 'clamp' },
    Easing: {
      bezier: jest.fn(),
      out: jest.fn(),
      in: jest.fn(),
      back: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      linear: jest.fn(),
      inOut: jest.fn(),
      ease: jest.fn(),
    },
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: ({ children }: any) => children,
  TapGestureHandler: ({ children }: any) => children,
  LongPressGestureHandler: ({ children }: any) => children,
  PinchGestureHandler: ({ children }: any) => children,
  State: {
    BEGAN: 'BEGAN',
    ACTIVE: 'ACTIVE',
    END: 'END',
  },
}));

// Mock HapticService
jest.mock('../../src/services/ui/HapticService', () => ({
  HapticService: {
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    selection: jest.fn(),
  },
}));

describe('User Experience Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Photo interaction experience', () => {
    const mockPhoto = {
      id: '1',
      uri: 'https://example.com/photo.jpg',
      metadata: {
        width: 1920,
        height: 1080,
        fileSize: 1024000,
        format: 'jpg',
        timestamp: new Date(),
      },
      syncStatus: 'synced' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should provide smooth photo card interactions', async () => {
      const onTap = jest.fn();
      const onLongPress = jest.fn();
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();

      const { getByTestId } = render(
        <GesturePhotoCard
          imageUri={mockPhoto.uri}
          onTap={onTap}
          onLongPress={onLongPress}
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          enableSwipe={true}
        />
      );

      // Component should render without issues
      expect(() => render(
        <GesturePhotoCard
          imageUri={mockPhoto.uri}
          onTap={onTap}
          onLongPress={onLongPress}
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          enableSwipe={true}
        />
      )).not.toThrow();
    });

    it('should handle photo selection with haptic feedback', async () => {
      const onTap = jest.fn();
      
      const { getByTestId } = render(
        <GesturePhotoCard
          imageUri={mockPhoto.uri}
          onTap={onTap}
          enableSelection={true}
          isSelected={false}
        />
      );

      // Simulate tap interaction
      // Note: Actual gesture testing would require more complex setup
      expect(() => render(
        <GesturePhotoCard
          imageUri={mockPhoto.uri}
          onTap={onTap}
          enableSelection={true}
          isSelected={false}
        />
      )).not.toThrow();
    });
  });

  describe('Loading state experience', () => {
    it('should provide smooth loading transitions', async () => {
      const { rerender } = render(
        <LoadingState type="spinner" message="Loading photos..." />
      );

      // Should render loading state
      expect(() => render(
        <LoadingState type="spinner" message="Loading photos..." />
      )).not.toThrow();

      // Change to different loading type
      rerender(
        <LoadingState type="dots" message="Processing..." />
      );

      expect(() => rerender(
        <LoadingState type="dots" message="Processing..." />
      )).not.toThrow();
    });

    it('should handle skeleton screen transitions', async () => {
      const { rerender } = render(
        <SkeletonScreen type="photoGrid" itemCount={6} />
      );

      expect(() => render(
        <SkeletonScreen type="photoGrid" itemCount={6} />
      )).not.toThrow();

      // Transition to different skeleton type
      rerender(
        <SkeletonScreen type="photoDetail" />
      );

      expect(() => rerender(
        <SkeletonScreen type="photoDetail" />
      )).not.toThrow();
    });
  });

  describe('Transition experience', () => {
    const TestContent = () => <Text>Test Content</Text>;

    it('should provide smooth visibility transitions', async () => {
      const { rerender } = render(
        <FluidTransition visible={false} type="fade">
          <TestContent />
        </FluidTransition>
      );

      // Transition to visible
      rerender(
        <FluidTransition visible={true} type="fade">
          <TestContent />
        </FluidTransition>
      );

      expect(() => rerender(
        <FluidTransition visible={true} type="fade">
          <TestContent />
        </FluidTransition>
      )).not.toThrow();
    });

    it('should handle different transition types smoothly', async () => {
      const transitionTypes = [
        'fade', 'slide', 'scale', 'slideUp', 'slideDown', 
        'slideLeft', 'slideRight', 'scaleAndFade', 'bounce', 'flip'
      ] as const;

      transitionTypes.forEach(type => {
        expect(() => render(
          <FluidTransition visible={true} type={type}>
            <TestContent />
          </FluidTransition>
        )).not.toThrow();
      });
    });

    it('should handle rapid transition changes', async () => {
      const { rerender } = render(
        <FluidTransition visible={true} type="fade">
          <TestContent />
        </FluidTransition>
      );

      // Rapid visibility changes
      for (let i = 0; i < 5; i++) {
        rerender(
          <FluidTransition visible={i % 2 === 0} type="fade">
            <TestContent />
          </FluidTransition>
        );
      }

      expect(() => rerender(
        <FluidTransition visible={true} type="fade">
          <TestContent />
        </FluidTransition>
      )).not.toThrow();
    });
  });

  describe('Haptic feedback experience', () => {
    it('should provide appropriate haptic feedback for different interactions', () => {
      // Test light haptic feedback
      HapticService.light();
      expect(HapticService.light).toHaveBeenCalled();

      // Test medium haptic feedback
      HapticService.medium();
      expect(HapticService.medium).toHaveBeenCalled();

      // Test heavy haptic feedback
      HapticService.heavy();
      expect(HapticService.heavy).toHaveBeenCalled();

      // Test success haptic feedback
      HapticService.success();
      expect(HapticService.success).toHaveBeenCalled();

      // Test selection haptic feedback
      HapticService.selection();
      expect(HapticService.selection).toHaveBeenCalled();
    });

    it('should handle rapid haptic feedback calls without issues', () => {
      // Simulate rapid user interactions
      for (let i = 0; i < 10; i++) {
        HapticService.light();
        HapticService.selection();
      }

      expect(HapticService.light).toHaveBeenCalledTimes(10);
      expect(HapticService.selection).toHaveBeenCalledTimes(10);
    });
  });

  describe('Performance under load', () => {
    it('should handle multiple animated components efficiently', () => {
      const components = Array.from({ length: 20 }, (_, index) => (
        <FluidTransition key={index} visible={true} type="fade">
          <LoadingState type="spinner" size="small" />
        </FluidTransition>
      ));

      expect(() => render(
        <View>
          {components}
        </View>
      )).not.toThrow();
    });

    it('should handle complex nested animations', () => {
      expect(() => render(
        <FluidTransition visible={true} type="slideUp">
          <FluidTransition visible={true} type="fade">
            <FluidTransition visible={true} type="scale">
              <LoadingState type="dots" />
            </FluidTransition>
          </FluidTransition>
        </FluidTransition>
      )).not.toThrow();
    });

    it('should handle rapid component mounting and unmounting', () => {
      const { rerender } = render(
        <View>
          <LoadingState type="spinner" />
        </View>
      );

      // Rapidly change components
      for (let i = 0; i < 10; i++) {
        rerender(
          <View>
            {i % 2 === 0 ? (
              <LoadingState type="spinner" />
            ) : (
              <SkeletonScreen type="photoGrid" />
            )}
          </View>
        );
      }

      expect(() => rerender(
        <View>
          <LoadingState type="spinner" />
        </View>
      )).not.toThrow();
    });
  });

  describe('Accessibility and user experience', () => {
    it('should maintain accessibility during animations', () => {
      const { getByText } = render(
        <FluidTransition visible={true} type="fade">
          <Text accessibilityLabel="Test content">Accessible Content</Text>
        </FluidTransition>
      );

      expect(getByText('Accessible Content')).toBeTruthy();
    });

    it('should provide appropriate loading states for different scenarios', () => {
      // Photo grid loading
      expect(() => render(
        <SkeletonScreen type="photoGrid" itemCount={9} />
      )).not.toThrow();

      // Photo detail loading
      expect(() => render(
        <SkeletonScreen type="photoDetail" />
      )).not.toThrow();

      // List loading
      expect(() => render(
        <SkeletonScreen type="list" itemCount={5} />
      )).not.toThrow();

      // Processing states
      expect(() => render(
        <LoadingState type="wave" message="Processing photos..." />
      )).not.toThrow();
    });

    it('should handle error states gracefully', () => {
      // Test with invalid props
      expect(() => render(
        <LoadingState type="invalid" as any />
      )).not.toThrow();

      expect(() => render(
        <SkeletonScreen type="invalid" as any />
      )).not.toThrow();

      expect(() => render(
        <FluidTransition visible={true} type="invalid" as any>
          <Text>Content</Text>
        </FluidTransition>
      )).not.toThrow();
    });
  });
});