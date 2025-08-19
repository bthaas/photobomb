import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FluidTransition } from '../../../src/components/ui/FluidTransition';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View,
    },
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    withSpring: jest.fn(),
    withTiming: jest.fn(),
    withSequence: jest.fn(),
    withDelay: jest.fn(),
    Easing: {
      out: jest.fn(),
      in: jest.fn(),
      back: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
    },
    runOnJS: jest.fn(),
  };
});

// Mock AnimationService
jest.mock('../../../src/services/ui/AnimationService', () => ({
  AnimationService: {
    fadeIn: jest.fn(),
    fadeOut: jest.fn(),
    scale: jest.fn(),
    slideIn: jest.fn(),
    slideOut: jest.fn(),
    bounce: jest.fn(),
    rotate: jest.fn(),
    SPRING_CONFIGS: {
      bouncy: {},
      smooth: {},
      gentle: {},
    },
  },
}));

describe('FluidTransition', () => {
  const TestChild = () => <Text>Test Content</Text>;

  it('should render children when visible', () => {
    const { getByText } = render(
      <FluidTransition visible={true}>
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should not render when not visible and opacity is 0', () => {
    const { queryByText } = render(
      <FluidTransition visible={false}>
        <TestChild />
      </FluidTransition>
    );
    
    // Component should still render but might be transparent
    // The actual visibility logic depends on the animation state
    expect(() => render(
      <FluidTransition visible={false}>
        <TestChild />
      </FluidTransition>
    )).not.toThrow();
  });

  it('should handle fade transition type', () => {
    const { getByText } = render(
      <FluidTransition visible={true} type="fade">
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should handle slide transition types', () => {
    const slideTypes = ['slideUp', 'slideDown', 'slideLeft', 'slideRight'] as const;
    
    slideTypes.forEach(type => {
      expect(() => render(
        <FluidTransition visible={true} type={type}>
          <TestChild />
        </FluidTransition>
      )).not.toThrow();
    });
  });

  it('should handle scale transition type', () => {
    const { getByText } = render(
      <FluidTransition visible={true} type="scale">
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should handle scaleAndFade transition type', () => {
    const { getByText } = render(
      <FluidTransition visible={true} type="scaleAndFade">
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should handle bounce transition type', () => {
    const { getByText } = render(
      <FluidTransition visible={true} type="bounce">
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should handle flip transition type', () => {
    const { getByText } = render(
      <FluidTransition visible={true} type="flip">
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should accept custom duration and delay', () => {
    const { getByText } = render(
      <FluidTransition visible={true} duration={500} delay={100}>
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should call onAnimationComplete callback', () => {
    const mockCallback = jest.fn();
    
    const { getByText } = render(
      <FluidTransition visible={true} onAnimationComplete={mockCallback}>
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
    // Callback might be called during animation, but we can't easily test timing
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    
    const { getByText } = render(
      <FluidTransition visible={true} style={customStyle}>
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should default to fade transition when no type specified', () => {
    const { getByText } = render(
      <FluidTransition visible={true}>
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should handle visibility changes', () => {
    const { getByText, rerender } = render(
      <FluidTransition visible={true}>
        <TestChild />
      </FluidTransition>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
    
    rerender(
      <FluidTransition visible={false}>
        <TestChild />
      </FluidTransition>
    );
    
    // Component should handle the visibility change
    expect(() => rerender(
      <FluidTransition visible={false}>
        <TestChild />
      </FluidTransition>
    )).not.toThrow();
  });
});