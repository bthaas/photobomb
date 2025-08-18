import { SecureStorage } from '../../../src/services/auth/SecureStorage';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from '../../../src/types/auth';

// Mock dependencies
jest.mock('react-native-keychain');
jest.mock('@react-native-async-storage/async-storage');

const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('SecureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeTokens', () => {
    it('should store tokens in keychain successfully', async () => {
      const tokens: AuthTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      };

      mockKeychain.setInternetCredentials.mockResolvedValue(true);

      await SecureStorage.storeTokens(tokens);

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'PhotoCuratorAuth',
        'access_token',
        JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
        })
      );
    });

    it('should throw error when keychain storage fails', async () => {
      const tokens: AuthTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
      };

      mockKeychain.setInternetCredentials.mockRejectedValue(new Error('Keychain error'));

      await expect(SecureStorage.storeTokens(tokens)).rejects.toThrow(
        'Failed to store authentication tokens'
      );
    });
  });

  describe('getTokens', () => {
    it('should retrieve tokens from keychain successfully', async () => {
      const tokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: '2024-12-31T23:59:59.000Z',
      };

      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'access_token',
        password: JSON.stringify(tokenData),
        service: 'PhotoCuratorAuth',
        storage: 'keychain',
      });

      const result = await SecureStorage.getTokens();

      expect(result).toEqual({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: new Date(tokenData.expiresAt),
      });
    });

    it('should return null when no credentials exist', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue(false);

      const result = await SecureStorage.getTokens();

      expect(result).toBeNull();
    });

    it('should return null when keychain retrieval fails', async () => {
      mockKeychain.getInternetCredentials.mockRejectedValue(new Error('Keychain error'));

      const result = await SecureStorage.getTokens();

      expect(result).toBeNull();
    });
  });

  describe('removeTokens', () => {
    it('should remove tokens from keychain successfully', async () => {
      mockKeychain.resetInternetCredentials.mockResolvedValue(true);

      await SecureStorage.removeTokens();

      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith('PhotoCuratorAuth');
    });

    it('should throw error when keychain removal fails', async () => {
      mockKeychain.resetInternetCredentials.mockRejectedValue(new Error('Keychain error'));

      await expect(SecureStorage.removeTokens()).rejects.toThrow(
        'Failed to remove authentication tokens'
      );
    });
  });

  describe('storeUserData', () => {
    it('should store user data in AsyncStorage successfully', async () => {
      const userData = { id: '1', name: 'John Doe', email: 'john@example.com' };

      mockAsyncStorage.setItem.mockResolvedValue();

      await SecureStorage.storeUserData(userData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'user_data',
        JSON.stringify(userData)
      );
    });

    it('should throw error when AsyncStorage storage fails', async () => {
      const userData = { id: '1', name: 'John Doe' };

      mockAsyncStorage.setItem.mockRejectedValue(new Error('AsyncStorage error'));

      await expect(SecureStorage.storeUserData(userData)).rejects.toThrow(
        'Failed to store user data'
      );
    });
  });

  describe('getUserData', () => {
    it('should retrieve user data from AsyncStorage successfully', async () => {
      const userData = { id: '1', name: 'John Doe', email: 'john@example.com' };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(userData));

      const result = await SecureStorage.getUserData();

      expect(result).toEqual(userData);
    });

    it('should return null when no user data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await SecureStorage.getUserData();

      expect(result).toBeNull();
    });

    it('should return null when AsyncStorage retrieval fails', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('AsyncStorage error'));

      const result = await SecureStorage.getUserData();

      expect(result).toBeNull();
    });
  });

  describe('hasValidTokens', () => {
    it('should return true for valid non-expired tokens', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const tokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: futureDate.toISOString(),
      };

      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'access_token',
        password: JSON.stringify(tokenData),
        service: 'PhotoCuratorAuth',
        storage: 'keychain',
      });

      const result = await SecureStorage.hasValidTokens();

      expect(result).toBe(true);
    });

    it('should return false for expired tokens', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const tokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: pastDate.toISOString(),
      };

      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'access_token',
        password: JSON.stringify(tokenData),
        service: 'PhotoCuratorAuth',
        storage: 'keychain',
      });

      const result = await SecureStorage.hasValidTokens();

      expect(result).toBe(false);
    });

    it('should return false when no tokens exist', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue(false);

      const result = await SecureStorage.hasValidTokens();

      expect(result).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear all authentication data successfully', async () => {
      mockKeychain.resetInternetCredentials.mockResolvedValue(true);
      mockAsyncStorage.removeItem.mockResolvedValue();

      await SecureStorage.clearAll();

      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith('PhotoCuratorAuth');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('user_data');
    });

    it('should throw error when clearing fails', async () => {
      mockKeychain.resetInternetCredentials.mockRejectedValue(new Error('Keychain error'));

      await expect(SecureStorage.clearAll()).rejects.toThrow(
        'Failed to clear authentication data'
      );
    });
  });
});