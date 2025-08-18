import { JWTService } from '../../../src/services/auth/JWTService';
import jwtDecode from 'jwt-decode';

// Mock jwt-decode
jest.mock('jwt-decode', () => jest.fn());
const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;

describe('JWTService', () => {
  const mockPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIiLCJpYXQiOjE2MzQ1NjcwMDAsImV4cCI6MTYzNDU3MDYwMH0.signature';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('decodeToken', () => {
    it('should decode valid JWT token', () => {
      mockJwtDecode.mockReturnValue(mockPayload);

      const result = JWTService.decodeToken(validToken);

      expect(result).toEqual(mockPayload);
      expect(mockJwtDecode).toHaveBeenCalledWith(validToken);
    });

    it('should return null for invalid token', () => {
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = JWTService.decodeToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      mockJwtDecode.mockReturnValue({ ...mockPayload, exp: futureExp });

      const result = JWTService.isTokenExpired(validToken);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      mockJwtDecode.mockReturnValue({ ...mockPayload, exp: pastExp });

      const result = JWTService.isTokenExpired(validToken);

      expect(result).toBe(true);
    });

    it('should return true for invalid token', () => {
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = JWTService.isTokenExpired('invalid-token');

      expect(result).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      mockJwtDecode.mockReturnValue({ ...mockPayload, exp });

      const result = JWTService.getTokenExpiration(validToken);

      expect(result).toEqual(new Date(exp * 1000));
    });

    it('should return null for invalid token', () => {
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = JWTService.getTokenExpiration('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('getUserFromToken', () => {
    it('should extract user information from valid token', () => {
      mockJwtDecode.mockReturnValue(mockPayload);

      const result = JWTService.getUserFromToken(validToken);

      expect(result).toEqual({
        id: mockPayload.sub,
        email: mockPayload.email,
        name: mockPayload.name,
      });
    });

    it('should return null for invalid token', () => {
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = JWTService.getUserFromToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('validateTokenFormat', () => {
    it('should return true for valid token format', () => {
      mockJwtDecode.mockReturnValue(mockPayload);

      const result = JWTService.validateTokenFormat(validToken);

      expect(result).toBe(true);
    });

    it('should return false for token with wrong number of parts', () => {
      const result = JWTService.validateTokenFormat('invalid.token');

      expect(result).toBe(false);
    });

    it('should return false for token with missing required fields', () => {
      mockJwtDecode.mockReturnValue({ sub: 'user-123' }); // Missing required fields

      const result = JWTService.validateTokenFormat(validToken);

      expect(result).toBe(false);
    });

    it('should return false for undecipherable token', () => {
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = JWTService.validateTokenFormat('header.payload.signature');

      expect(result).toBe(false);
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return time until expiration in milliseconds', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      mockJwtDecode.mockReturnValue({ ...mockPayload, exp });

      const result = JWTService.getTimeUntilExpiration(validToken);

      expect(result).toBeGreaterThan(3590000); // Should be close to 1 hour (3600000ms)
      expect(result).toBeLessThan(3600000);
    });

    it('should return negative value for expired token', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      mockJwtDecode.mockReturnValue({ ...mockPayload, exp });

      const result = JWTService.getTimeUntilExpiration(validToken);

      expect(result).toBeLessThan(0);
    });

    it('should return null for invalid token', () => {
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = JWTService.getTimeUntilExpiration('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('needsRefresh', () => {
    it('should return false for token with plenty of time left', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      mockJwtDecode.mockReturnValue({ ...mockPayload, exp });

      const result = JWTService.needsRefresh(validToken, 15); // 15 minute threshold

      expect(result).toBe(false);
    });

    it('should return true for token expiring within threshold', () => {
      const exp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      mockJwtDecode.mockReturnValue({ ...mockPayload, exp });

      const result = JWTService.needsRefresh(validToken, 15); // 15 minute threshold

      expect(result).toBe(true);
    });

    it('should return true for expired token', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      mockJwtDecode.mockReturnValue({ ...mockPayload, exp });

      const result = JWTService.needsRefresh(validToken, 15);

      expect(result).toBe(true);
    });

    it('should return true for invalid token', () => {
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = JWTService.needsRefresh('invalid-token', 15);

      expect(result).toBe(true);
    });
  });
});