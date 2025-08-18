import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * Custom hook for authentication management
 * Provides easy access to auth state and actions
 */
export const useAuth = () => {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    changePassword,
    checkAuthStatus,
    clearError,
    refreshToken,
  } = useAuthStore();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    // State
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    changePassword,
    checkAuthStatus,
    clearError,
    refreshToken,
  };
};