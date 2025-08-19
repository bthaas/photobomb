import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlobalErrorBoundary } from '../../../src/components/error/GlobalErrorBoundary';
import { Text } from 'react-native';

// Mock React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

// Mock ErrorReportingService
jest.mock('../../../src/services/error/ErrorReportingService', () => ({
  ErrorReportingService: jest.fn().mockImplementation(() => ({
    reportError: jest.fn(),
  })),
}));

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('GlobalErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    const { getByText } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('should render error UI when child component throws', () => {
    const { getByText } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText(/We're sorry, but something unexpected happened/)).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('should allow retry after error', () => {
    const { getByText, rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();

    // Click retry button
    fireEvent.press(getByText('Try Again'));

    // Re-render with no error
    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('should use custom fallback when provided', () => {
    const customFallback = (error: Error) => (
      <Text>Custom error: {error.message}</Text>
    );

    const { getByText } = render(
      <GlobalErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(getByText('Custom error: Test error')).toBeTruthy();
  });

  it('should show debug information in development mode', () => {
    const originalDev = __DEV__;
    (global as any).__DEV__ = true;

    const { getByText } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(getByText('Debug Information:')).toBeTruthy();
    expect(getByText(/Test error/)).toBeTruthy();

    (global as any).__DEV__ = originalDev;
  });

  it('should not show debug information in production mode', () => {
    const originalDev = __DEV__;
    (global as any).__DEV__ = false;

    const { queryByText } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(queryByText('Debug Information:')).toBeNull();

    (global as any).__DEV__ = originalDev;
  });

  it('should report error to ErrorReportingService', () => {
    const { ErrorReportingService } = require('../../../src/services/error/ErrorReportingService');
    const mockReportError = jest.fn();
    ErrorReportingService.mockImplementation(() => ({
      reportError: mockReportError,
    }));

    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(mockReportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: 'React Error Boundary',
        errorBoundary: true,
      })
    );
  });

  it('should handle multiple errors correctly', () => {
    const { getByText, rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();

    // Click retry
    fireEvent.press(getByText('Try Again'));

    // Throw a different error
    const ThrowDifferentError: React.FC = () => {
      throw new Error('Different error');
    };

    rerender(
      <GlobalErrorBoundary>
        <ThrowDifferentError />
      </GlobalErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('should reset error state when retry is clicked', () => {
    const TestComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <Text>Success</Text>;
    };

    let shouldThrow = true;
    const { getByText, rerender } = render(
      <GlobalErrorBoundary>
        <TestComponent shouldThrow={shouldThrow} />
      </GlobalErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();

    // Fix the error condition
    shouldThrow = false;

    // Click retry
    fireEvent.press(getByText('Try Again'));

    // Re-render with fixed component
    rerender(
      <GlobalErrorBoundary>
        <TestComponent shouldThrow={shouldThrow} />
      </GlobalErrorBoundary>
    );

    expect(getByText('Success')).toBeTruthy();
  });
});