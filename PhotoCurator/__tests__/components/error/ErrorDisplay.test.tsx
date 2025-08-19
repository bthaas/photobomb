import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ErrorDisplay } from '../../../src/components/error/ErrorDisplay';
import { NetworkError, ErrorSeverity, RecoveryAction } from '../../../src/types/error';

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

describe('ErrorDisplay', () => {
  const mockOnDismiss = jest.fn();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when error is null', () => {
    const { queryByText } = render(
      <ErrorDisplay
        error={null}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('should not render when visible is false', () => {
    const error = new NetworkError('Test error');
    
    const { queryByText } = render(
      <ErrorDisplay
        error={error}
        visible={false}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(queryByText('Network Error')).toBeNull();
  });

  it('should render error information when visible and error exists', () => {
    const error = new NetworkError('Connection failed', ErrorSeverity.HIGH);
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(getByText('Network Error')).toBeTruthy();
    expect(getByText(error.userMessage)).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
    expect(getByText('Dismiss')).toBeTruthy();
  });

  it('should display correct error icon based on severity', () => {
    const testCases = [
      { severity: ErrorSeverity.CRITICAL, expectedIcon: '🚨' },
      { severity: ErrorSeverity.HIGH, expectedIcon: '⚠️' },
      { severity: ErrorSeverity.MEDIUM, expectedIcon: '⚡' },
      { severity: ErrorSeverity.LOW, expectedIcon: 'ℹ️' },
    ];

    testCases.forEach(({ severity, expectedIcon }) => {
      const error = new NetworkError('Test error', severity);
      
      const { getByText } = render(
        <ErrorDisplay
          error={error}
          visible={true}
          onDismiss={mockOnDismiss}
          onRetry={mockOnRetry}
        />
      );

      expect(getByText(expectedIcon)).toBeTruthy();
    });
  });

  it('should call onDismiss when dismiss button is pressed', () => {
    const error = new NetworkError('Test error');
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.press(getByText('Dismiss'));
    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('should call onRetry when retry button is pressed', () => {
    const error = new NetworkError('Test error');
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.press(getByText('Try Again'));
    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('should not show retry button when onRetry is not provided', () => {
    const error = new NetworkError('Test error');
    
    const { queryByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
      />
    );

    expect(queryByText('Try Again')).toBeNull();
    expect(queryByText('Dismiss')).toBeTruthy();
  });

  it('should display recovery actions when provided', () => {
    const mockRecoveryAction = jest.fn().mockResolvedValue(undefined);
    const recoveryActions: RecoveryAction[] = [
      {
        label: 'Check Settings',
        action: mockRecoveryAction,
      },
      {
        label: 'Retry Connection',
        action: mockRecoveryAction,
        primary: true,
      },
    ];

    const error = new NetworkError('Test error', ErrorSeverity.HIGH, undefined, recoveryActions);
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(getByText('What you can do:')).toBeTruthy();
    expect(getByText('Check Settings')).toBeTruthy();
    expect(getByText('Retry Connection')).toBeTruthy();
  });

  it('should execute recovery action when pressed', async () => {
    const mockRecoveryAction = jest.fn().mockResolvedValue(undefined);
    const recoveryActions: RecoveryAction[] = [
      {
        label: 'Test Action',
        action: mockRecoveryAction,
      },
    ];

    const error = new NetworkError('Test error', ErrorSeverity.HIGH, undefined, recoveryActions);
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.press(getByText('Test Action'));

    await waitFor(() => {
      expect(mockRecoveryAction).toHaveBeenCalled();
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('should show alert when recovery action fails', async () => {
    const mockRecoveryAction = jest.fn().mockRejectedValue(new Error('Recovery failed'));
    const recoveryActions: RecoveryAction[] = [
      {
        label: 'Failing Action',
        action: mockRecoveryAction,
      },
    ];

    const error = new NetworkError('Test error', ErrorSeverity.HIGH, undefined, recoveryActions);
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.press(getByText('Failing Action'));

    await waitFor(() => {
      expect(mockRecoveryAction).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Recovery Failed',
        'The recovery action failed. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    });
  });

  it('should show technical details in development mode', () => {
    const originalDev = __DEV__;
    (global as any).__DEV__ = true;

    const error = new NetworkError('Test error', ErrorSeverity.HIGH, {
      component: 'TestComponent',
      action: 'testAction',
    });
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(getByText('Technical Details:')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();
    expect(getByText('Context:')).toBeTruthy();

    (global as any).__DEV__ = originalDev;
  });

  it('should not show technical details in production mode', () => {
    const originalDev = __DEV__;
    (global as any).__DEV__ = false;

    const error = new NetworkError('Test error', ErrorSeverity.HIGH, {
      component: 'TestComponent',
      action: 'testAction',
    });
    
    const { queryByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(queryByText('Technical Details:')).toBeNull();

    (global as any).__DEV__ = originalDev;
  });

  it('should display timestamp', () => {
    const error = new NetworkError('Test error');
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(getByText(/Occurred at/)).toBeTruthy();
  });

  it('should format error type correctly', () => {
    const error = new NetworkError('Test error');
    
    const { getByText } = render(
      <ErrorDisplay
        error={error}
        visible={true}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(getByText('Network Error')).toBeTruthy();
  });
});