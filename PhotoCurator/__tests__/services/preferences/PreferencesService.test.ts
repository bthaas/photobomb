import { PreferencesService } from '../../../src/services/preferences/PreferencesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('PreferencesService', () => {
  let preferencesService: PreferencesService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance for testing
    (PreferencesService as any).instance = undefined;
    preferencesService = PreferencesService.getInstance();
  });

  describe('Initialization', () => {
    it('should initialize with default preferences when no stored data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await preferencesService.initialize();
      const preferences = preferencesService.getPreferences();

      expect(preferences.backgroundProcessingEnabled).toBe(true);
      expect(preferences.processingIntensity).toBe('medium');
      expect(preferences.defaultCurationGoal).toBe('balanced');
      expect(preferences.gridColumns).toBe(3);
    });

    it('should load stored preferences on initialization', async () => {
      const storedPreferences = {
        backgroundProcessingEnabled: false,
        processingIntensity: 'high',
        gridColumns: 4,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedPreferences));

      await preferencesService.initialize();
      const preferences = preferencesService.getPreferences();

      expect(preferences.backgroundProcessingEnabled).toBe(false);
      expect(preferences.processingIntensity).toBe('high');
      expect(preferences.gridColumns).toBe(4);
      // Should merge with defaults
      expect(preferences.defaultCurationGoal).toBe('balanced');
    });
  });

  describe('Preference Updates', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await preferencesService.initialize();
    });

    it('should update preferences and save to storage', async () => {
      const updates = {
        backgroundProcessingEnabled: false,
        processingIntensity: 'high' as const,
      };

      await preferencesService.updatePreferences(updates);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@PhotoCurator:preferences',
        expect.stringContaining('"backgroundProcessingEnabled":false')
      );

      const preferences = preferencesService.getPreferences();
      expect(preferences.backgroundProcessingEnabled).toBe(false);
      expect(preferences.processingIntensity).toBe('high');
    });

    it('should notify listeners when preferences change', async () => {
      const listener = jest.fn();
      const unsubscribe = preferencesService.addListener(listener);

      await preferencesService.updatePreferences({ gridColumns: 5 });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ gridColumns: 5 })
      );

      unsubscribe();
    });
  });

  describe('Specific Preference Methods', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await preferencesService.initialize();
    });

    it('should get and set processing intensity', async () => {
      expect(preferencesService.getProcessingIntensity()).toBe('medium');

      await preferencesService.setProcessingIntensity('high');
      expect(preferencesService.getProcessingIntensity()).toBe('high');
    });

    it('should get and set background processing enabled', async () => {
      expect(preferencesService.isBackgroundProcessingEnabled()).toBe(true);

      await preferencesService.setBackgroundProcessingEnabled(false);
      expect(preferencesService.isBackgroundProcessingEnabled()).toBe(false);
    });

    it('should get and set grid columns with bounds checking', async () => {
      expect(preferencesService.getGridColumns()).toBe(3);

      await preferencesService.setGridColumns(5);
      expect(preferencesService.getGridColumns()).toBe(5);

      // Test bounds
      await preferencesService.setGridColumns(10);
      expect(preferencesService.getGridColumns()).toBe(5); // Max is 5

      await preferencesService.setGridColumns(0);
      expect(preferencesService.getGridColumns()).toBe(1); // Min is 1
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset all preferences to default values', async () => {
      // First set some custom values
      await preferencesService.updatePreferences({
        backgroundProcessingEnabled: false,
        processingIntensity: 'high',
        gridColumns: 5,
      });

      // Reset to defaults
      await preferencesService.resetToDefaults();

      const preferences = preferencesService.getPreferences();
      expect(preferences.backgroundProcessingEnabled).toBe(true);
      expect(preferences.processingIntensity).toBe('medium');
      expect(preferences.gridColumns).toBe(3);
    });
  });

  describe('Import/Export', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await preferencesService.initialize();
    });

    it('should export preferences as JSON', async () => {
      const exported = await preferencesService.exportPreferences();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('backgroundProcessingEnabled');
      expect(parsed).toHaveProperty('processingIntensity');
      expect(parsed).toHaveProperty('defaultCurationGoal');
    });

    it('should import valid preferences', async () => {
      const importData = {
        backgroundProcessingEnabled: false,
        processingIntensity: 'high',
        gridColumns: 4,
      };

      await preferencesService.importPreferences(JSON.stringify(importData));

      const preferences = preferencesService.getPreferences();
      expect(preferences.backgroundProcessingEnabled).toBe(false);
      expect(preferences.processingIntensity).toBe('high');
      expect(preferences.gridColumns).toBe(4);
    });

    it('should reject invalid preferences format', async () => {
      await expect(
        preferencesService.importPreferences('invalid json')
      ).rejects.toThrow('Invalid preferences format');
    });

    it('should validate imported preferences', async () => {
      const invalidData = {
        backgroundProcessingEnabled: 'not a boolean',
        processingIntensity: 'invalid_intensity',
        gridColumns: 'not a number',
      };

      await preferencesService.importPreferences(JSON.stringify(invalidData));

      const preferences = preferencesService.getPreferences();
      // Should keep default values for invalid data
      expect(preferences.backgroundProcessingEnabled).toBe(true);
      expect(preferences.processingIntensity).toBe('medium');
      expect(preferences.gridColumns).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await preferencesService.initialize();
      const preferences = preferencesService.getPreferences();

      // Should use defaults when storage fails
      expect(preferences.backgroundProcessingEnabled).toBe(true);
      expect(preferences.processingIntensity).toBe('medium');
    });

    it('should handle save errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));

      await expect(
        preferencesService.updatePreferences({ gridColumns: 4 })
      ).rejects.toThrow('Failed to save preferences');
    });
  });
});