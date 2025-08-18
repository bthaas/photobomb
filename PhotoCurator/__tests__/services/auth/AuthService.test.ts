import { AuthService } from '../../../src/services/auth/AuthService';
import { SecureStorage } from '../../../src/services/auth/SecureStorage';
import { JWTService } from '../../../src/services/auth/JWTService';
import {
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthError,
} from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/auth/SecureStorage');
jest.mock('../../../src/services/auth/JWTService');

const mockSecureStorage = SecureStorage as jest.Mocked<typeof SecureStorage>;
const mockJWTService = JWTService as jest.Mocked<typeof JWTService>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AuthService', () => {
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
  });

  describe('login', () => {
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAuthResponse),
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      mockSecureStorage.storeTokens.mockResolvedValue();
      mockSecureStorage.storeUserData.mockResolvedValue();

      const result = await AuthService.login(credentials);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.photocurator.app/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        }
      );
      expect(mockSecureStorage.storeTokens).toHaveBeenCalledWith(mockTokens);
      expect(mockSecureStorage.storeUserData).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error for invalid credentials', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Invalid credentials' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      await expect(AuthService.login(credentials)).rejects.toThrow(AuthError.UNKNOWN_ERROR);
    });
  });

  describe('register', () => {
    const credentials: RegisterCredentials = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register successfully with valid credentials', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAuthResponse),
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      mockSecureStorage.storeTokens.mockResolvedValue();
      mockSecureStorage.storeUserData.mockResolvedValue();

      const result = await AuthService.register(credentials);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.photocurator.app/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        }
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error for existing email', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Email already exists' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(AuthService.register(credentials)).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse as any);
      mockSecureStorage.clearAll.mockResolvedValue();

      await AuthService.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.photocurator.app/auth/logout',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockTokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      expect(mockSecureStorage.clearAll).toHaveBeenCalled();
    });

    it('should clear local data even if server logout fails', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      mockFetch.mockRejectedValue(new Error('Server error'));
      mockSecureStorage.clearAll.mockResolvedValue();

      await AuthService.logout();

      expect(mockSecureStorage.clearAll).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      const newTokens = { ...mockTokens, accessToken: 'new-access-token' };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ tokens: newTokens }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      mockSecureStorage.storeTokens.mockResolvedValue();

      const result = await AuthService.refreshToken();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.photocurator.app/auth/refresh',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: mockTokens.refreshToken }),
        }
      );
      expect(mockSecureStorage.storeTokens).toHaveBeenCalledWith(newTokens);
      expect(result).toEqual(newTokens);
    });

    it('should clear tokens when refresh fails', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Invalid refresh token' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      mockSecureStorage.clearAll.mockResolvedValue();

      await expect(AuthService.refreshToken()).rejects.toThrow();
      expect(mockSecureStorage.clearAll).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    const request: ResetPasswordRequest = {
      email: 'test@example.com',
    };

    it('should request password reset successfully', async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse as any);

      await AuthService.requestPasswordReset(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.photocurator.app/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );
    });

    it('should throw error when request fails', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'User not found' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(AuthService.requestPasswordReset(request)).rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    const request: ChangePasswordRequest = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword',
    };

    it('should change password successfully', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse as any);

      await AuthService.changePassword(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.photocurator.app/auth/change-password',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockTokens.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );
    });

    it('should throw error when user not authenticated', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(null);

      await expect(AuthService.changePassword(request)).rejects.toThrow('User not authenticated');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      mockSecureStorage.getUserData.mockResolvedValue(mockUser);
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      mockJWTService.isTokenExpired.mockReturnValue(false);

      const result = await AuthService.getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should refresh token when expired and return user', async () => {
      mockSecureStorage.getUserData.mockResolvedValue(mockUser);
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      mockJWTService.isTokenExpired.mockReturnValue(true);
      
      // Mock successful token refresh
      const newTokens = { ...mockTokens, accessToken: 'new-access-token' };
      mockSecureStorage.getTokens.mockResolvedValueOnce(mockTokens); // First call
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ tokens: newTokens }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      mockSecureStorage.storeTokens.mockResolvedValue();

      const result = await AuthService.getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user data exists', async () => {
      mockSecureStorage.getUserData.mockResolvedValue(null);

      const result = await AuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid non-expired token', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      mockJWTService.isTokenExpired.mockReturnValue(false);

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return true after successful token refresh', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      mockJWTService.isTokenExpired.mockReturnValue(true);
      
      // Mock successful token refresh
      const newTokens = { ...mockTokens, accessToken: 'new-access-token' };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ tokens: newTokens }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      mockSecureStorage.storeTokens.mockResolvedValue();

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no tokens exist', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(null);

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(false);
    });
  });
});