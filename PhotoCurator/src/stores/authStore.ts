import { create } from 'zustand';
import {
  User,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordRequest,
  ResetPasswordConfirm,
  ChangePasswordRequest,
} from '../types/auth';
import { AuthService } from '../services/auth/AuthService';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (request: ResetPasswordRequest) => Promise<void>;
  confirmPasswordReset: (request: ResetPasswordConfirm) => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await AuthService.login(credentials);
      
      set({
        user: response.user,
        tokens: response.tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  },

  register: async (credentials: RegisterCredentials) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await AuthService.register(credentials);
      
      set({
        user: response.user,
        tokens: response.tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    
    try {
      await AuthService.logout();
      
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
      throw error;
    }
  },

  requestPasswordReset: async (request: ResetPasswordRequest) => {
    set({ isLoading: true, error: null });
    
    try {
      await AuthService.requestPasswordReset(request);
      
      set({
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Password reset request failed',
      });
      throw error;
    }
  },

  confirmPasswordReset: async (request: ResetPasswordConfirm) => {
    set({ isLoading: true, error: null });
    
    try {
      await AuthService.confirmPasswordReset(request);
      
      set({
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Password reset confirmation failed',
      });
      throw error;
    }
  },

  changePassword: async (request: ChangePasswordRequest) => {
    set({ isLoading: true, error: null });
    
    try {
      await AuthService.changePassword(request);
      
      set({
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Password change failed',
      });
      throw error;
    }
  },

  checkAuthStatus: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const isAuthenticated = await AuthService.isAuthenticated();
      
      if (isAuthenticated) {
        const user = await AuthService.getCurrentUser();
        
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication check failed',
      });
    }
  },

  refreshToken: async () => {
    try {
      const tokens = await AuthService.refreshToken();
      
      set({
        tokens,
        error: null,
      });
    } catch (error) {
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));