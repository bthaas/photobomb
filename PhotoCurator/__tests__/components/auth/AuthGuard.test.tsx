import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { AuthGuard } from '../../../src/components/auth/AuthGuard';
import { useAuth } from '../../../src/hooks/useAuth';

// Mock the useAuth hook
jest.mock('../../../src/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock StyleSheet to avoid React Native parsing issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

describe('AuthGuard', () => {
  const ProtectedComponent = () => <Text>Protected Content</Text>;
  const FallbackComponent = () => <Text>Please Login</Text>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading screen when loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      checkAuthStatus: jest.fn(),
      user: null,
      tokens: null,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      clearError: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { queryByText } = render(
      <AuthGuard>
        <ProtectedComponent />
      </AuthGuard>
    );

    expect(queryByText('Protected Content')).toBeNull();
    expect(queryByText('Please Login')).toBeNull();
    // Should show loading indicator (ActivityIndicator doesn't have text)
  });

  it('should render children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      checkAuthStatus: jest.fn(),
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
      },
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      clearError: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { getByText, queryByText } = render(
      <AuthGuard>
        <ProtectedComponent />
      </AuthGuard>
    );

    expect(getByText('Protected Content')).toBeTruthy();
    expect(queryByText('Please Login')).toBeNull();
  });

  it('should render default fallback when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      checkAuthStatus: jest.fn(),
      user: null,
      tokens: null,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      clearError: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { queryByText } = render(
      <AuthGuard>
        <ProtectedComponent />
      </AuthGuard>
    );

    expect(queryByText('Protected Content')).toBeNull();
    // Should render default loading screen as fallback
  });

  it('should render custom fallback when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      checkAuthStatus: jest.fn(),
      user: null,
      tokens: null,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      clearError: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { getByText, queryByText } = render(
      <AuthGuard fallback={<FallbackComponent />}>
        <ProtectedComponent />
      </AuthGuard>
    );

    expect(queryByText('Protected Content')).toBeNull();
    expect(getByText('Please Login')).toBeTruthy();
  });

  it('should call checkAuthStatus on mount', () => {
    const mockCheckAuthStatus = jest.fn();
    
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      checkAuthStatus: mockCheckAuthStatus,
      user: null,
      tokens: null,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      clearError: jest.fn(),
      refreshToken: jest.fn(),
    });

    render(
      <AuthGuard>
        <ProtectedComponent />
      </AuthGuard>
    );

    expect(mockCheckAuthStatus).toHaveBeenCalled();
  });

  it('should handle authentication state changes', () => {
    const mockCheckAuthStatus = jest.fn();
    
    // First render - not authenticated
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      checkAuthStatus: mockCheckAuthStatus,
      user: null,
      tokens: null,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      clearError: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { rerender, queryByText } = render(
      <AuthGuard fallback={<FallbackComponent />}>
        <ProtectedComponent />
      </AuthGuard>
    );

    expect(queryByText('Protected Content')).toBeNull();
    expect(queryByText('Please Login')).toBeTruthy();

    // Second render - authenticated
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      checkAuthStatus: mockCheckAuthStatus,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
      },
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      clearError: jest.fn(),
      refreshToken: jest.fn(),
    });

    rerender(
      <AuthGuard fallback={<FallbackComponent />}>
        <ProtectedComponent />
      </AuthGuard>
    );

    expect(queryByText('Protected Content')).toBeTruthy();
    expect(queryByText('Please Login')).toBeNull();
  });
});