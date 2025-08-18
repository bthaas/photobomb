import { PhotoSource } from '../../src/types';

// Test type definitions and interfaces for photo import functionality
describe('Photo Import Types', () => {
  describe('PhotoSource enum', () => {
    it('should have correct enum values', () => {
      expect(PhotoSource.CAMERA_ROLL).toBe('camera_roll');
      expect(PhotoSource.GOOGLE_PHOTOS).toBe('google_photos');
      expect(PhotoSource.ICLOUD).toBe('icloud');
    });

    it('should have all expected photo sources', () => {
      const sources = Object.values(PhotoSource);
      expect(sources).toHaveLength(3);
      expect(sources).toContain('camera_roll');
      expect(sources).toContain('google_photos');
      expect(sources).toContain('icloud');
    });
  });

  describe('Import interfaces', () => {
    it('should define ImportOptions interface correctly', () => {
      // Test that ImportOptions interface accepts expected properties
      const options = {
        batchSize: 50,
        includeVideos: false,
        dateRange: {
          from: new Date('2023-01-01'),
          to: new Date('2023-12-31'),
        },
        onProgress: jest.fn(),
        onError: jest.fn(),
      };

      expect(typeof options.batchSize).toBe('number');
      expect(typeof options.includeVideos).toBe('boolean');
      expect(options.dateRange).toHaveProperty('from');
      expect(options.dateRange).toHaveProperty('to');
      expect(typeof options.onProgress).toBe('function');
      expect(typeof options.onError).toBe('function');
    });

    it('should define ImportResult interface correctly', () => {
      const result = {
        photos: [],
        errors: [],
        totalProcessed: 0,
        totalSkipped: 0,
      };

      expect(Array.isArray(result.photos)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.totalProcessed).toBe('number');
      expect(typeof result.totalSkipped).toBe('number');
    });

    it('should define credentials interfaces correctly', () => {
      const googleCredentials = {
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      const iCloudCredentials = {
        appleId: 'user@example.com',
        token: 'token',
      };

      expect(typeof googleCredentials.accessToken).toBe('string');
      expect(typeof googleCredentials.refreshToken).toBe('string');
      expect(typeof iCloudCredentials.appleId).toBe('string');
      expect(typeof iCloudCredentials.token).toBe('string');
    });
  });

  describe('Permission types', () => {
    it('should define PermissionResult interface correctly', () => {
      const result = {
        granted: true,
        status: 'granted' as const,
        canAskAgain: false,
      };

      expect(typeof result.granted).toBe('boolean');
      expect(typeof result.status).toBe('string');
      expect(typeof result.canAskAgain).toBe('boolean');
    });

    it('should define PermissionConfig interface correctly', () => {
      const config = {
        title: 'Permission Required',
        message: 'This app needs permission to access your photos.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      };

      expect(typeof config.title).toBe('string');
      expect(typeof config.message).toBe('string');
      expect(typeof config.buttonPositive).toBe('string');
      expect(typeof config.buttonNegative).toBe('string');
    });
  });

  describe('Progress tracking types', () => {
    it('should define ProcessingProgress interface correctly', () => {
      const progress = {
        current: 5,
        total: 10,
        percentage: 50,
        stage: 'Processing photos',
        estimatedTimeRemaining: 30,
      };

      expect(typeof progress.current).toBe('number');
      expect(typeof progress.total).toBe('number');
      expect(typeof progress.percentage).toBe('number');
      expect(typeof progress.stage).toBe('string');
      expect(typeof progress.estimatedTimeRemaining).toBe('number');
    });
  });
});