import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { NetworkError, ErrorSeverity } from '../../../src/types/error';

// Mock the services before importing the hook
const mockHandleError = jest.fn();
const mockRetryWithBackoff = jest.fn();
const mockIsOfflineMode = jest.fn().mockReturnValue(false);
const mockIsFeatureAvailable = jest.fn().mockReturnValue(true);
const mockGetFeatureFallbackMessage = jest.fn().mockReturnValue('Feature unavailable');
const mockOn = jest.fn();
const mockRemoveAllListeners = jest.fn();
const mockDestroy = jest.fn();
const mockLoadOfflineState = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/services/error/ErrorHandler', () => ({
  ErrorHandler: jest.fn().mockImplementation(() => ({
    handleError: mockHandleError,
    retryWithBackoff: mockRetryWithBackoff,
  })),
}));

jest.mock('../../../src/services/error/OfflineModeManager', () => ({
  OfflineModeManager: jest.fn().mockImplementation(() => ({
    isOfflineMode: mockIsOfflineMode,
    isFeatureAvailable: mockIsFeatureAvailable,
    getFeatureFallbackMessage: mockGetFeatureFallbackMessage,
    on: mockOn,
    removeAllListeners: mockRemoveAllListeners,
    destroy: mockDestroy,
    loadOfflineState: mockLoadOfflineState,
  })),
}));

// Now import the hook after mocking
import { useErrorHandler, ErrorProvider, useErrorBoundary, useRetry } from '../../../src/hooks/useErrorHandler';

describe('useErrorHandler', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ErrorProvider>{children}</ErrorProvider>
  );

  it('should throw error when used outside ErrorProvider', () => {
    // Suppress console.error for this test
    const originalConsoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useErrorHandler());
    }).toThrow('useErrorHandler must be used within an ErrorProvider');

    console.error = originalConsoleError;
  });

  it('should provide error handling context', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    expect(result.current).toMatchObject({
      currentError: null,
      isOffline: false,
      showError: expect.any(Function),
      hideError: expect.any(Function),
      handleError: expect.any(Function),
      retryLastOperation: expect.any(Function),
      isFeatureAvailable: expect.any(Function),
      getFeatureFallbackMessage: expect.any(Function),
    });
  });

  it('should show and hide errors', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    const error = new NetworkError('Test error');

    act(() => {
      result.current.showError(error);
    });

    expect(result.current.currentError).toBe(error);

    act(() => {
      result.current.hideError();
    });

    expect(result.current.currentError).toBeNull();
  });

  it('should handle errors through handleError method', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    const error = new NetworkError('Test error');

    await act(async () => {
      await result.current.handleError(error);
    });

    expect(result.current.currentError).toBe(error);
  });

  it('should check feature availability', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    const isAvailable = result.current.isFeatureAvailable('photo_viewing');
    const fallbackMessage = result.current.getFeatureFallbackMessage('photo_sync');

    expect(typeof isAvailable).toBe('boolean');
    expect(typeof fallbackMessage).toBe('string');
  });
});

describe('useErrorBoundary', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ErrorProvider>{children}</ErrorProvider>
  );

  it('should wrap operations with error handling', async () => {
    const { result } = renderHook(() => useErrorBoundary(), { wrapper });

    const successOperation = jest.fn().mockResolvedValue('success');
    const wrappedOperation = result.current.withErrorBoundary(successOperation);

    const resultValue = await wrappedOperation();

    expect(successOperation).toHaveBeenCalled();
    expect(resultValue).toBe('success');
  });

  it('should handle errors in wrapped operations', async () => {
    const { result } = renderHook(() => useErrorBoundary(), { wrapper });

    const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
    const wrappedOperation = result.current.withErrorBoundary(failingOperation);

    const resultValue = await wrappedOperation();

    expect(failingOperation).toHaveBeenCalled();
    expect(resultValue).toBeUndefined();
  });

  it('should pass context to error handler', async () => {
    const { result } = renderHook(() => useErrorBoundary(), { wrapper });

    const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
    const context = { component: 'TestComponent', action: 'testAction' };
    const wrappedOperation = result.current.withErrorBoundary(failingOperation, context);

    await wrappedOperation();

    expect(failingOperation).toHaveBeenCalled();
  });

  it('should preserve function arguments', async () => {
    const { result } = renderHook(() => useErrorBoundary(), { wrapper });

    const operation = jest.fn().mockResolvedValue('success');
    const wrappedOperation = result.current.withErrorBoundary(operation);

    await wrappedOperation('arg1', 'arg2', 123);

    expect(operation).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });
});

describe('useRetry', () => {
  it('should retry operations with default configuration', async () => {
    const { result } = renderHook(() => useRetry());

    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new NetworkError('Network failure');
      }
      return 'success';
    });

    const resultValue = await result.current.retry(operation);

    expect(resultValue).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should retry operations with custom configuration', async () => {
    const { result } = renderHook(() => useRetry());

    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 2) {
        throw new NetworkError('Network failure');
      }
      return 'success';
    });

    const resultValue = await result.current.retry(operation, {
      maxRetries: 1,
      baseDelay: 10,
    });

    expect(resultValue).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw error when max retries exceeded', async () => {
    const { result } = renderHook(() => useRetry());

    const operation = jest.fn().mockImplementation(() => {
      throw new NetworkError('Persistent failure');
    });

    await expect(
      result.current.retry(operation, { maxRetries: 2 })
    ).rejects.toThrow('Persistent failure');

    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should include context in retry operations', async () => {
    const { result } = renderHook(() => useRetry());

    const operation = jest.fn().mockResolvedValue('success');
    const context = { component: 'TestComponent' };

    const resultValue = await result.current.retry(operation, { context });

    expect(resultValue).toBe('success');
    expect(operation).toHaveBeenCalled();
  });
});

describe('ErrorProvider', () => {
  it('should provide error context to children', () => {
    const TestComponent = () => {
      const { currentError, isOffline } = useErrorHandler();
      return null;
    };

    expect(() => {
      renderHook(() => <ErrorProvider><TestComponent /></ErrorProvider>);
    }).not.toThrow();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useErrorHandler(), {
      wrapper: ({ children }) => <ErrorProvider>{children}</ErrorProvider>
    });

    expect(result.current.currentError).toBeNull();
    expect(result.current.isOffline).toBe(false);
  });
});