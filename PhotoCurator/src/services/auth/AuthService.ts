import {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordRequest,
  ResetPasswordConfirm,
  ChangePasswordRequest,
  AuthResponse,
  AuthError,
} from '../../types/auth';
import { SecureStorage } from './SecureStorage';
import { JWTService } from './JWTService';

// Mock API base URL - replace with actual backend URL
const API_BASE_URL = 'https://api.photocurator.app';

export class AuthService {
  /**
   * Login user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens securely
      await SecureStorage.storeTokens(data.tokens);
      await SecureStorage.storeUserData(data.user);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Register new user
   */
  static async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      
      // Store tokens securely
      await SecureStorage.storeTokens(data.tokens);
      await SecureStorage.storeUserData(data.user);

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logout user and clear stored data
   */
  static async logout(): Promise<void> {
    try {
      const tokens = await SecureStorage.getTokens();
      
      if (tokens) {
        // Call logout endpoint to invalidate tokens on server
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          // Continue with local logout even if server call fails
          console.warn('Server logout failed:', error);
        }
      }

      // Clear all local auth data
      await SecureStorage.clearAll();
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(): Promise<AuthTokens> {
    try {
      const tokens = await SecureStorage.getTokens();
      
      if (!tokens || !tokens.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Token refresh failed');
      }

      const data = await response.json();
      
      // Store new tokens
      await SecureStorage.storeTokens(data.tokens);

      return data.tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear invalid tokens
      await SecureStorage.clearAll();
      throw this.handleAuthError(error);
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(request: ResetPasswordRequest): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset request failed');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Confirm password reset with token
   */
  static async confirmPasswordReset(request: ResetPasswordConfirm): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset confirmation failed');
      }
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(request: ChangePasswordRequest): Promise<void> {
    try {
      const tokens = await SecureStorage.getTokens();
      
      if (!tokens) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password change failed');
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current user data
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await SecureStorage.getUserData();
      const tokens = await SecureStorage.getTokens();

      if (!userData || !tokens) {
        return null;
      }

      // Verify token is still valid
      if (JWTService.isTokenExpired(tokens.accessToken)) {
        try {
          await this.refreshToken();
          return userData;
        } catch (error) {
          return null;
        }
      }

      return userData;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await SecureStorage.getTokens();
      
      if (!tokens) {
        return false;
      }

      // Check if access token is valid
      if (JWTService.isTokenExpired(tokens.accessToken)) {
        // Try to refresh token
        try {
          await this.refreshToken();
          return true;
        } catch (error) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(): Promise<string | null> {
    try {
      const tokens = await SecureStorage.getTokens();
      
      if (!tokens) {
        return null;
      }

      // Check if token needs refresh
      if (JWTService.needsRefresh(tokens.accessToken)) {
        try {
          const newTokens = await this.refreshToken();
          return newTokens.accessToken;
        } catch (error) {
          return null;
        }
      }

      return tokens.accessToken;
    } catch (error) {
      console.error('Get valid access token error:', error);
      return null;
    }
  }

  /**
   * Handle authentication errors and convert to appropriate error types
   */
  private static handleAuthError(error: any): Error {
    if (error.message) {
      switch (error.message.toLowerCase()) {
        case 'invalid credentials':
        case 'invalid email or password':
          return new Error('Invalid credentials');
        case 'user not found':
          return new Error('User not found');
        case 'email already exists':
          return new Error('Email already exists');
        case 'weak password':
          return new Error('Weak password');
        case 'invalid token':
          return new Error('Invalid token');
        case 'token expired':
          return new Error('Token expired');
        case 'user not authenticated':
          return new Error('User not authenticated');
        default:
          if (error.message.includes('Network') || error.message.includes('fetch')) {
            return new Error(AuthError.NETWORK_ERROR);
          }
          return new Error(AuthError.UNKNOWN_ERROR);
      }
    }

    if (error.name === 'TypeError' && error.message.includes('Network')) {
      return new Error(AuthError.NETWORK_ERROR);
    }

    return new Error(AuthError.UNKNOWN_ERROR);
  }
}