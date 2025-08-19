import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';
import { AppError, ErrorContext as ErrorContextType } from '../types/error';
import { ErrorHandler } from '../services/error/ErrorHandler';
import { OfflineModeManager } from '../services/error/OfflineModeManager';

interface ErrorContextValue {
  currentError: AppError | null;
  isOffline: boolean;
  showError: (error: AppError) => void;
  hideError: () => void;
  handleError: (error: Error | AppError, context?: ErrorContextType) => Promise<void>;
  retryLastOperation: () => Promise<void>;
  isFeatureAvailable: (feature: string) => boolean;
  getFeatureFallbackMessage: (feature: string) => string;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export const useErrorHandler = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastOperation, setLastOperation] = useState<(() => Promise<void>) | null>(null);
  
  const errorHandler = new ErrorHandler();
  const offlineModeManager = new OfflineModeManager();

  // Setup offline mode monitoring
  React.useEffect(() => {
    // Load initial offline state
    offlineModeManager.loadOfflineState().then(() => {
      setIsOffline(offlineModeManager.isOfflineMode());
    });

    // Set up periodic check for offline state
    const interval = setInterval(() => {
      setIsOffline(offlineModeManager.isOfflineMode());
    }, 5000);

    return () => {
      clearInterval(interval);
      offlineModeManager.destroy();
    };
  }, []);

  const showError = useCallback((error: AppError) => {
    setCurrentError(error);
  }, []);

  const hideError = useCallback(() => {
    setCurrentError(null);
  }, []);

  const handleError = useCallback(async (error: Error | AppError, context?: ErrorContextType) => {
    try {
      await errorHandler.handleError(error, context);
      
      if (error instanceof AppError) {
        showError(error);
      }
    } catch (handlingError) {
      console.error('Error handling failed:', handlingError);
    }
  }, [showError]);

  const retryLastOperation = useCallback(async () => {
    if (lastOperation) {
      try {
        await lastOperation();
        hideError();
      } catch (error) {
        await handleError(error as Error);
      }
    }
  }, [lastOperation, hideError, handleError]);

  const isFeatureAvailable = useCallback((feature: string) => {
    return offlineModeManager.isFeatureAvailable(feature);
  }, []);

  const getFeatureFallbackMessage = useCallback((feature: string) => {
    return offlineModeManager.getFeatureFallbackMessage(feature);
  }, []);

  const contextValue: ErrorContextValue = {
    currentError,
    isOffline,
    showError,
    hideError,
    handleError,
    retryLastOperation,
    isFeatureAvailable,
    getFeatureFallbackMessage,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

// Hook for wrapping operations with error handling
export const useErrorBoundary = () => {
  const { handleError } = useErrorHandler();

  const withErrorBoundary = useCallback(
    <T extends any[], R>(
      operation: (...args: T) => Promise<R>,
      context?: ErrorContextType
    ) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          return await operation(...args);
        } catch (error) {
          await handleError(error as Error, context);
          return undefined;
        }
      };
    },
    [handleError]
  );

  return { withErrorBoundary };
};

// Hook for retry operations
export const useRetry = () => {
  const errorHandler = new ErrorHandler();

  const retry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options?: {
        maxRetries?: number;
        baseDelay?: number;
        context?: ErrorContextType;
      }
    ): Promise<T> => {
      return errorHandler.retryWithBackoff(operation, {
        maxRetries: options?.maxRetries || 3,
        baseDelay: options?.baseDelay || 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: ['NETWORK', 'SYNC'] as any,
      });
    },
    []
  );

  return { retry };
};