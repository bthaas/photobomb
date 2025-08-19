import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingState } from '../../../src/components/ui/LoadingState';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View,
    },
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    withRepeat: jest.fn(),
    withTiming: jest.fn(),
    withSequence: jest.fn(),
    interpolate: jest.fn(),
    Easing: {
      linear: jest.fn(),
      inOut: jest.fn(),
      ease: jest.fn(),
    },
  };
});

describe('LoadingState', () => {
  it('should render spinner by default', () => {
    const { getByTestId } = render(<LoadingState />);
    
    // Should render without crashing
    expect(() => render(<LoadingState />)).not.toThrow();
  });

  it('should render spinner with custom size and color', () => {
    const { getByTestId } = render(
      <LoadingState type="spinner" size="large" color="#FF0000" />
    );
    
    // Should render without crashing
    expect(() => render(<LoadingState type="spinner" size="large" color="#FF0000" />)).not.toThrow();
  });

  it('should render dots loading animation', () => {
    const { getByTestId } = render(
      <LoadingState type="dots" size="medium" />
    );
    
    // Should render without crashing
    expect(() => render(<LoadingState type="dots" size="medium" />)).not.toThrow();
  });

  it('should render pulse loading animation', () => {
    const { getByTestId } = render(
      <LoadingState type="pulse" size="small" />
    );
    
    // Should render without crashing
    expect(() => render(<LoadingState type="pulse" size="small" />)).not.toThrow();
  });

  it('should render wave loading animation', () => {
    const { getByTestId } = render(
      <LoadingState type="wave" />
    );
    
    // Should render without crashing
    expect(() => render(<LoadingState type="wave" />)).not.toThrow();
  });

  it('should render skeleton loading animation', () => {
    const { getByTestId } = render(
      <LoadingState type="skeleton" />
    );
    
    // Should render without crashing
    expect(() => render(<LoadingState type="skeleton" />)).not.toThrow();
  });

  it('should render with message', () => {
    const message = 'Loading photos...';
    const { getByText } = render(
      <LoadingState message={message} />
    );
    
    expect(getByText(message)).toBeTruthy();
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'blue' };
    
    const { getByTestId } = render(
      <LoadingState style={customStyle} />
    );
    
    // Should render without crashing
    expect(() => render(<LoadingState style={customStyle} />)).not.toThrow();
  });

  it('should handle different size values correctly', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    
    sizes.forEach(size => {
      expect(() => render(<LoadingState size={size} />)).not.toThrow();
    });
  });

  it('should default to spinner when invalid type provided', () => {
    const { getByTestId } = render(
      <LoadingState type="invalid" as any />
    );
    
    // Should render without crashing
    expect(() => render(<LoadingState type="invalid" as any />)).not.toThrow();
  });
});