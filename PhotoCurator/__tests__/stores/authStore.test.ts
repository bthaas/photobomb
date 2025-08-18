import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthStore } from '../../src/stores/authStore';
import { AuthService } from '../../src/services/auth/AuthService';
import { LoginCredentials, RegisterCredentials, AuthError } from '../../src/types/auth';

// Mock AuthService
jest.mock('../../src/services/auth/AuthService');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('authStore', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3600000),
  };

  const mockAuthResponse = {
    user: mockUser,
    tokens: mockTokens,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  describe('login', () => {
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const error = new Error(AuthError.INVALID_CREDENTIALS);
      mockAuthService.login.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(AuthError.INVALID_CREDENTIALS);
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockAuthService.login.mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login(credentials);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin!(mockAuthResponse);
        await loginPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    const credentials: RegisterCredentials = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register successfully', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register(credentials);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle registration failure', async () => {
      const error = new Error(AuthError.EMAIL_ALREADY_EXISTS);
      mockAuthService.register.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.register(credentials);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe(AuthError.EMAIL_ALREADY_EXISTS);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
      });

      mockAuthService.logout.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle logout failure', async () => {
      const error = new Error('Logout failed');
      mockAuthService.logout.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.logout();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Logout failed');
    });
  });

  describe('checkAuthStatus', () => {
    it('should set authenticated state when user is authenticated', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set unauthenticated state when user is not authenticated', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(false);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle auth check failure', async () => {
      const error = new Error('Auth check failed');
      mockAuthService.isAuthenticated.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Auth check failed');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const newTokens = { ...mockTokens, accessToken: 'new-access-token' };
      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.tokens).toEqual(newTokens);
      expect(result.current.error).toBeNull();
    });

    it('should handle token refresh failure', async () => {
      const error = new Error(AuthError.TOKEN_EXPIRED);
      mockAuthService.refreshToken.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe(AuthError.TOKEN_EXPIRED);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const request = { email: 'test@example.com' };
      mockAuthService.requestPasswordReset.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.requestPasswordReset(request);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle password reset request failure', async () => {
      const request = { email: 'test@example.com' };
      const error = new Error('Reset request failed');
      mockAuthService.requestPasswordReset.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.requestPasswordReset(request);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Reset request failed');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const request = { currentPassword: 'old', newPassword: 'new' };
      mockAuthService.changePassword.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.changePassword(request);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle password change failure', async () => {
      const request = { currentPassword: 'old', newPassword: 'new' };
      const error = new Error('Password change failed');
      mockAuthService.changePassword.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.changePassword(request);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Password change failed');
    });
  });
});