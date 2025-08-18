import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { LoginScreen } from '../../src/screens/LoginScreen';
import { useAuthStore } from '../../src/stores/authStore';

// Mock the auth store
jest.mock('../../src/stores/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

describe('LoginScreen', () => {
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      user: null,
      tokens: null,
      isAuthenticated: false,
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      checkAuthStatus: jest.fn(),
      refreshToken: jest.fn(),
    });
  });

  it('should render login form correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to your account')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Forgot Password?')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('should handle email input correctly', () => {
    const { getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'test@example.com');

    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('should handle password input correctly', () => {
    const { getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const passwordInput = getByPlaceholderText('Enter your password');
    fireEvent.changeText(passwordInput, 'password123');

    expect(passwordInput.props.value).toBe('password123');
  });

  it('should toggle password visibility', () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const passwordInput = getByPlaceholderText('Enter your password');
    const showButton = getByText('Show');

    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(showButton);
    expect(passwordInput.props.secureTextEntry).toBe(false);
    expect(getByText('Hide')).toBeTruthy();

    fireEvent.press(getByText('Hide'));
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('should show alert for empty fields', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const loginButton = getByText('Sign In');
    fireEvent.press(loginButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Please enter both email and password'
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should call login with correct credentials', async () => {
    mockLogin.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should handle login error', async () => {
    const error = new Error('Invalid credentials');
    mockLogin.mockRejectedValue(error);

    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Login Failed',
        'Invalid credentials'
      );
    });
  });

  it('should show loading state during login', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
      clearError: mockClearError,
      user: null,
      tokens: null,
      isAuthenticated: false,
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      checkAuthStatus: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { getByTestId, queryByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    // Should show loading indicator instead of text
    expect(queryByText('Sign In')).toBeNull();
    // Note: ActivityIndicator doesn't have testID by default, 
    // but we can check that inputs are disabled
    const emailInput = getByPlaceholderText('Enter your email');
    expect(emailInput.props.editable).toBe(false);
  });

  it('should display error message', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: 'Invalid credentials',
      clearError: mockClearError,
      user: null,
      tokens: null,
      isAuthenticated: false,
      register: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      changePassword: jest.fn(),
      checkAuthStatus: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    expect(getByText('Invalid credentials')).toBeTruthy();
  });

  it('should navigate to register screen', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const signUpLink = getByText('Sign Up');
    fireEvent.press(signUpLink);

    expect(mockClearError).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });

  it('should navigate to forgot password screen', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const forgotPasswordLink = getByText('Forgot Password?');
    fireEvent.press(forgotPasswordLink);

    expect(mockClearError).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('should trim and lowercase email', async () => {
    mockLogin.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Sign In');

    fireEvent.changeText(emailInput, '  TEST@EXAMPLE.COM  ');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});