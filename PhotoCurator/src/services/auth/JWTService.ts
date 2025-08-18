import jwtDecode from 'jwt-decode';
import { JWTPayload, AuthError } from '../../types/auth';

export class JWTService {
  /**
   * Decode JWT token and extract payload
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      return decoded;
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return null;
    }
  }

  /**
   * Check if JWT token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      
      if (!decoded) {
        return true;
      }

      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch (error) {
      console.error('Failed to check token expiration:', error);
      return true;
    }
  }

  /**
   * Get token expiration date
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      
      if (!decoded) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      console.error('Failed to get token expiration:', error);
      return null;
    }
  }

  /**
   * Extract user information from JWT token
   */
  static getUserFromToken(token: string): { id: string; email: string; name: string } | null {
    try {
      const decoded = this.decodeToken(token);
      
      if (!decoded) {
        return null;
      }

      return {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
      };
    } catch (error) {
      console.error('Failed to extract user from token:', error);
      return null;
    }
  }

  /**
   * Validate JWT token format and structure
   */
  static validateTokenFormat(token: string): boolean {
    try {
      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Try to decode the token
      const decoded = this.decodeToken(token);
      if (!decoded) {
        return false;
      }

      // Check required fields
      return !!(decoded.sub && decoded.email && decoded.exp && decoded.iat);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  static getTimeUntilExpiration(token: string): number | null {
    try {
      const expirationDate = this.getTokenExpiration(token);
      
      if (!expirationDate) {
        return null;
      }

      const now = new Date();
      return expirationDate.getTime() - now.getTime();
    } catch (error) {
      console.error('Failed to get time until expiration:', error);
      return null;
    }
  }

  /**
   * Check if token needs refresh (expires within threshold)
   */
  static needsRefresh(token: string, thresholdMinutes: number = 15): boolean {
    try {
      const timeUntilExpiration = this.getTimeUntilExpiration(token);
      
      if (timeUntilExpiration === null) {
        return true;
      }

      const thresholdMs = thresholdMinutes * 60 * 1000;
      return timeUntilExpiration <= thresholdMs;
    } catch (error) {
      console.error('Failed to check if token needs refresh:', error);
      return true;
    }
  }
}