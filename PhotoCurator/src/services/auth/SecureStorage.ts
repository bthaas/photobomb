import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from '../../types/auth';

export class SecureStorage {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_DATA_KEY = 'user_data';
  private static readonly KEYCHAIN_SERVICE = 'PhotoCuratorAuth';

  /**
   * Store authentication tokens securely in Keychain
   */
  static async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      const tokenData = JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      });

      await Keychain.setInternetCredentials(
        this.KEYCHAIN_SERVICE,
        this.ACCESS_TOKEN_KEY,
        tokenData
      );
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Retrieve authentication tokens from Keychain
   */
  static async getTokens(): Promise<AuthTokens | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.KEYCHAIN_SERVICE);
      
      if (!credentials || credentials === false) {
        return null;
      }

      const tokenData = JSON.parse(credentials.password);
      
      return {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: new Date(tokenData.expiresAt),
      };
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Remove authentication tokens from Keychain
   */
  static async removeTokens(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(this.KEYCHAIN_SERVICE);
    } catch (error) {
      console.error('Failed to remove tokens:', error);
      throw new Error('Failed to remove authentication tokens');
    }
  }

  /**
   * Store user data in AsyncStorage (non-sensitive data)
   */
  static async storeUserData(userData: any): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  /**
   * Retrieve user data from AsyncStorage
   */
  static async getUserData(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  /**
   * Remove user data from AsyncStorage
   */
  static async removeUserData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USER_DATA_KEY);
    } catch (error) {
      console.error('Failed to remove user data:', error);
      throw new Error('Failed to remove user data');
    }
  }

  /**
   * Check if tokens exist and are valid
   */
  static async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      
      if (!tokens) {
        return false;
      }

      // Check if token is expired (with 5 minute buffer)
      const now = new Date();
      const expiresAt = new Date(tokens.expiresAt);
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      return expiresAt.getTime() > (now.getTime() + bufferTime);
    } catch (error) {
      console.error('Failed to check token validity:', error);
      return false;
    }
  }

  /**
   * Clear all stored authentication data
   */
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.removeTokens(),
        this.removeUserData(),
      ]);
    } catch (error) {
      console.error('Failed to clear all auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }
}