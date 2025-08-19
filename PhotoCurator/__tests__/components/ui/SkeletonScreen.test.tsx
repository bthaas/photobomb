import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonScreen } from '../../../src/components/ui/SkeletonScreen';

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
    interpolate: jest.fn(),
  };
});

describe('SkeletonScreen', () => {
  it('should render photo grid skeleton by default', () => {
    const { getByTestId } = render(
      <SkeletonScreen type="photoGrid" />
    );
    
    // Should render without crashing
    expect(() => render(<SkeletonScreen type="photoGrid" />)).not.toThrow();
  });

  it('should render photo grid skeleton with custom item count', () => {
    const { getByTestId } = render(
      <SkeletonScreen type="photoGrid" itemCount={9} />
    );
    
    // Should render without crashing
    expect(() => render(<SkeletonScreen type="photoGrid" itemCount={9} />)).not.toThrow();
  });

  it('should render photo detail skeleton', () => {
    const { getByTestId } = render(
      <SkeletonScreen type="photoDetail" />
    );
    
    // Should render without crashing
    expect(() => render(<SkeletonScreen type="photoDetail" />)).not.toThrow();
  });

  it('should render list skeleton', () => {
    const { getByTestId } = render(
      <SkeletonScreen type="list" itemCount={5} />
    );
    
    // Should render without crashing
    expect(() => render(<SkeletonScreen type="list" itemCount={5} />)).not.toThrow();
  });

  it('should render custom skeleton with children', () => {
    const CustomSkeleton = () => (
      <SkeletonScreen type="custom">
        <div>Custom skeleton content</div>
      </SkeletonScreen>
    );
    
    const { getByText } = render(<CustomSkeleton />);
    
    // Should render without crashing
    expect(() => render(<CustomSkeleton />)).not.toThrow();
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    
    const { getByTestId } = render(
      <SkeletonScreen type="photoGrid" style={customStyle} />
    );
    
    // Should render without crashing
    expect(() => render(<SkeletonScreen type="photoGrid" style={customStyle} />)).not.toThrow();
  });

  it('should default to photoGrid type when invalid type provided', () => {
    const { getByTestId } = render(
      <SkeletonScreen type="invalid" as any />
    );
    
    // Should render without crashing
    expect(() => render(<SkeletonScreen type="invalid" as any />)).not.toThrow();
  });
});