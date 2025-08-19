import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppPreferences {
  // Processing preferences
  backgroundProcessingEnabled: boolean;
  processingIntensity: 'low' | 'medium' | 'high';
  batteryOptimizationEnabled: boolean;
  wifiOnlyProcessing: boolean;
  
  // Curation preferences
  defaultCurationGoal: 'best_scenic' | 'best_portraits' | 'most_creative' | 'balanced';
  autoSelectBestShots: boolean;
  maxPhotosPerCluster: number;
  
  // UI preferences
  gridColumns: number;
  showQualityScores: boolean;
  enableHapticFeedback: boolean;
  enableAnimations: boolean;
  
  // Sync preferences
  autoSyncEnabled: boolean;
  syncOnlyWifi: boolean;
  syncCuratedOnly: boolean;
  maxSyncSize: number; // in MB
  
  // Privacy preferences
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  
  // Accessibility preferences
  highContrastMode: boolean;
  largeTextMode: boolean;
  reduceMotion: boolean;
  
  // Notification preferences
  processingCompleteNotifications: boolean;
  syncCompleteNotifications: boolean;
  weeklyDigestEnabled: boolean;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  backgroundProcessingEnabled: true,
  processingIntensity: 'medium',
  batteryOptimizationEnabled: true,
  wifiOnlyProcessing: false,
  
  defaultCurationGoal: 'balanced',
  autoSelectBestShots: true,
  maxPhotosPerCluster: 10,
  
  gridColumns: 3,
  showQualityScores: false,
  enableHapticFeedback: true,
  enableAnimations: true,
  
  autoSyncEnabled: true,
  syncOnlyWifi: true,
  syncCuratedOnly: true,
  maxSyncSize: 100,
  
  analyticsEnabled: true,
  crashReportingEnabled: true,
  
  highContrastMode: false,
  largeTextMode: false,
  reduceMotion: false,
  
  processingCompleteNotifications: true,
  syncCompleteNotifications: true,
  weeklyDigestEnabled: true,
};

const PREFERENCES_KEY = '@PhotoCurator:preferences';

export class PreferencesService {
  private static instance: PreferencesService;
  private preferences: AppPreferences = DEFAULT_PREFERENCES;
  private listeners: Array<(preferences: AppPreferences) => void> = [];

  static getInstance(): PreferencesService {
    if (!PreferencesService.instance) {
      PreferencesService.instance = new PreferencesService();
    }
    return PreferencesService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsedPreferences = JSON.parse(stored);
        this.preferences = { ...DEFAULT_PREFERENCES, ...parsedPreferences };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      this.preferences = DEFAULT_PREFERENCES;
    }
  }

  getPreferences(): AppPreferences {
    return { ...this.preferences };
  }

  async updatePreferences(updates: Partial<AppPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw new Error('Failed to save preferences');
    }
  }

  async resetToDefaults(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      throw new Error('Failed to reset preferences');
    }
  }

  // Specific preference getters
  getProcessingIntensity(): 'low' | 'medium' | 'high' {
    return this.preferences.processingIntensity;
  }

  isBackgroundProcessingEnabled(): boolean {
    return this.preferences.backgroundProcessingEnabled;
  }

  isBatteryOptimizationEnabled(): boolean {
    return this.preferences.batteryOptimizationEnabled;
  }

  getDefaultCurationGoal(): string {
    return this.preferences.defaultCurationGoal;
  }

  getGridColumns(): number {
    return this.preferences.gridColumns;
  }

  isAutoSyncEnabled(): boolean {
    return this.preferences.autoSyncEnabled;
  }

  isAnalyticsEnabled(): boolean {
    return this.preferences.analyticsEnabled;
  }

  isHapticFeedbackEnabled(): boolean {
    return this.preferences.enableHapticFeedback;
  }

  areAnimationsEnabled(): boolean {
    return this.preferences.enableAnimations;
  }

  // Specific preference setters
  async setProcessingIntensity(intensity: 'low' | 'medium' | 'high'): Promise<void> {
    await this.updatePreferences({ processingIntensity: intensity });
  }

  async setBackgroundProcessingEnabled(enabled: boolean): Promise<void> {
    await this.updatePreferences({ backgroundProcessingEnabled: enabled });
  }

  async setBatteryOptimizationEnabled(enabled: boolean): Promise<void> {
    await this.updatePreferences({ batteryOptimizationEnabled: enabled });
  }

  async setDefaultCurationGoal(goal: AppPreferences['defaultCurationGoal']): Promise<void> {
    await this.updatePreferences({ defaultCurationGoal: goal });
  }

  async setGridColumns(columns: number): Promise<void> {
    await this.updatePreferences({ gridColumns: Math.max(1, Math.min(5, columns)) });
  }

  async setAutoSyncEnabled(enabled: boolean): Promise<void> {
    await this.updatePreferences({ autoSyncEnabled: enabled });
  }

  async setAnalyticsEnabled(enabled: boolean): Promise<void> {
    await this.updatePreferences({ analyticsEnabled: enabled });
  }

  // Listener management
  addListener(listener: (preferences: AppPreferences) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.preferences);
      } catch (error) {
        console.error('Error in preferences listener:', error);
      }
    });
  }

  // Export/Import preferences
  async exportPreferences(): Promise<string> {
    return JSON.stringify(this.preferences, null, 2);
  }

  async importPreferences(preferencesJson: string): Promise<void> {
    try {
      const importedPreferences = JSON.parse(preferencesJson);
      
      // Validate imported preferences
      const validatedPreferences = this.validatePreferences(importedPreferences);
      
      await this.updatePreferences(validatedPreferences);
    } catch (error) {
      throw new Error('Invalid preferences format');
    }
  }

  private validatePreferences(preferences: any): Partial<AppPreferences> {
    const validated: Partial<AppPreferences> = {};

    // Validate each preference with type checking and bounds
    if (typeof preferences.backgroundProcessingEnabled === 'boolean') {
      validated.backgroundProcessingEnabled = preferences.backgroundProcessingEnabled;
    }

    if (['low', 'medium', 'high'].includes(preferences.processingIntensity)) {
      validated.processingIntensity = preferences.processingIntensity;
    }

    if (typeof preferences.batteryOptimizationEnabled === 'boolean') {
      validated.batteryOptimizationEnabled = preferences.batteryOptimizationEnabled;
    }

    if (['best_scenic', 'best_portraits', 'most_creative', 'balanced'].includes(preferences.defaultCurationGoal)) {
      validated.defaultCurationGoal = preferences.defaultCurationGoal;
    }

    if (typeof preferences.gridColumns === 'number' && preferences.gridColumns >= 1 && preferences.gridColumns <= 5) {
      validated.gridColumns = preferences.gridColumns;
    }

    if (typeof preferences.autoSyncEnabled === 'boolean') {
      validated.autoSyncEnabled = preferences.autoSyncEnabled;
    }

    if (typeof preferences.analyticsEnabled === 'boolean') {
      validated.analyticsEnabled = preferences.analyticsEnabled;
    }

    if (typeof preferences.enableHapticFeedback === 'boolean') {
      validated.enableHapticFeedback = preferences.enableHapticFeedback;
    }

    if (typeof preferences.enableAnimations === 'boolean') {
      validated.enableAnimations = preferences.enableAnimations;
    }

    return validated;
  }
}