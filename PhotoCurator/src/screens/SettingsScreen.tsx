import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Slider,
} from 'react-native';
import { PreferencesService, AppPreferences } from '../services/preferences/PreferencesService';
import { useAccessibility } from '../components/accessibility/AccessibilityProvider';

export const SettingsScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const preferencesService = PreferencesService.getInstance();
  const { announceForAccessibility } = useAccessibility();

  useEffect(() => {
    loadPreferences();
    
    const unsubscribe = preferencesService.addListener((newPreferences) => {
      setPreferences(newPreferences);
    });

    return unsubscribe;
  }, []);

  const loadPreferences = async () => {
    try {
      await preferencesService.initialize();
      setPreferences(preferencesService.getPreferences());
    } catch (error) {
      console.error('Failed to load preferences:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (updates: Partial<AppPreferences>) => {
    try {
      await preferencesService.updatePreferences(updates);
      announceForAccessibility('Setting updated');
    } catch (error) {
      console.error('Failed to update preference:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await preferencesService.resetToDefaults();
              announceForAccessibility('Settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );

  const renderToggleSetting = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    description?: string
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessible={true}
        accessibilityLabel={`${label} ${value ? 'enabled' : 'disabled'}`}
        accessibilityRole="switch"
      />
    </View>
  );

  const renderSliderSetting = (
    label: string,
    value: number,
    minimumValue: number,
    maximumValue: number,
    step: number,
    onValueChange: (value: number) => void,
    formatValue?: (value: number) => string
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>
          {formatValue ? formatValue(value) : value}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onValueChange}
        accessible={true}
        accessibilityLabel={`${label} slider`}
        accessibilityValue={{ text: formatValue ? formatValue(value) : value.toString() }}
      />
    </View>
  );

  const renderPickerSetting = (
    label: string,
    value: string,
    options: Array<{ label: string; value: string }>,
    onValueChange: (value: string) => void
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
      <View style={styles.pickerContainer}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.pickerOption,
              value === option.value && styles.pickerOptionSelected,
            ]}
            onPress={() => onValueChange(option.value)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Select ${option.label}`}
            accessibilityState={{ selected: value === option.value }}
          >
            <Text
              style={[
                styles.pickerOptionText,
                value === option.value && styles.pickerOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (loading || !preferences) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {renderSection('Processing', (
        <>
          {renderToggleSetting(
            'Background Processing',
            preferences.backgroundProcessingEnabled,
            (value) => updatePreference({ backgroundProcessingEnabled: value }),
            'Process photos when app is in background'
          )}
          
          {renderPickerSetting(
            'Processing Intensity',
            preferences.processingIntensity,
            [
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
            ],
            (value) => updatePreference({ processingIntensity: value as any })
          )}
          
          {renderToggleSetting(
            'Battery Optimization',
            preferences.batteryOptimizationEnabled,
            (value) => updatePreference({ batteryOptimizationEnabled: value }),
            'Reduce processing when battery is low'
          )}
          
          {renderToggleSetting(
            'WiFi Only Processing',
            preferences.wifiOnlyProcessing,
            (value) => updatePreference({ wifiOnlyProcessing: value }),
            'Only process photos when connected to WiFi'
          )}
        </>
      ))}

      {renderSection('Curation', (
        <>
          {renderPickerSetting(
            'Default Curation Goal',
            preferences.defaultCurationGoal,
            [
              { label: 'Best Scenic', value: 'best_scenic' },
              { label: 'Best Portraits', value: 'best_portraits' },
              { label: 'Most Creative', value: 'most_creative' },
              { label: 'Balanced', value: 'balanced' },
            ],
            (value) => updatePreference({ defaultCurationGoal: value as any })
          )}
          
          {renderToggleSetting(
            'Auto-Select Best Shots',
            preferences.autoSelectBestShots,
            (value) => updatePreference({ autoSelectBestShots: value }),
            'Automatically select the best photos from each cluster'
          )}
          
          {renderSliderSetting(
            'Max Photos Per Cluster',
            preferences.maxPhotosPerCluster,
            1,
            20,
            1,
            (value) => updatePreference({ maxPhotosPerCluster: Math.round(value) })
          )}
        </>
      ))}

      {renderSection('Display', (
        <>
          {renderSliderSetting(
            'Grid Columns',
            preferences.gridColumns,
            1,
            5,
            1,
            (value) => updatePreference({ gridColumns: Math.round(value) })
          )}
          
          {renderToggleSetting(
            'Show Quality Scores',
            preferences.showQualityScores,
            (value) => updatePreference({ showQualityScores: value }),
            'Display AI quality scores on photos'
          )}
          
          {renderToggleSetting(
            'Haptic Feedback',
            preferences.enableHapticFeedback,
            (value) => updatePreference({ enableHapticFeedback: value }),
            'Vibrate for button presses and interactions'
          )}
          
          {renderToggleSetting(
            'Animations',
            preferences.enableAnimations,
            (value) => updatePreference({ enableAnimations: value }),
            'Enable smooth transitions and animations'
          )}
        </>
      ))}

      {renderSection('Sync', (
        <>
          {renderToggleSetting(
            'Auto Sync',
            preferences.autoSyncEnabled,
            (value) => updatePreference({ autoSyncEnabled: value }),
            'Automatically sync curated photos to cloud'
          )}
          
          {renderToggleSetting(
            'WiFi Only Sync',
            preferences.syncOnlyWifi,
            (value) => updatePreference({ syncOnlyWifi: value }),
            'Only sync when connected to WiFi'
          )}
          
          {renderToggleSetting(
            'Sync Curated Only',
            preferences.syncCuratedOnly,
            (value) => updatePreference({ syncCuratedOnly: value }),
            'Only sync photos marked as favorites'
          )}
          
          {renderSliderSetting(
            'Max Sync Size (MB)',
            preferences.maxSyncSize,
            10,
            1000,
            10,
            (value) => updatePreference({ maxSyncSize: Math.round(value) }),
            (value) => `${value} MB`
          )}
        </>
      ))}

      {renderSection('Privacy', (
        <>
          {renderToggleSetting(
            'Analytics',
            preferences.analyticsEnabled,
            (value) => updatePreference({ analyticsEnabled: value }),
            'Help improve the app by sharing anonymous usage data'
          )}
          
          {renderToggleSetting(
            'Crash Reporting',
            preferences.crashReportingEnabled,
            (value) => updatePreference({ crashReportingEnabled: value }),
            'Automatically report crashes to help fix bugs'
          )}
        </>
      ))}

      {renderSection('Notifications', (
        <>
          {renderToggleSetting(
            'Processing Complete',
            preferences.processingCompleteNotifications,
            (value) => updatePreference({ processingCompleteNotifications: value }),
            'Notify when photo processing is complete'
          )}
          
          {renderToggleSetting(
            'Sync Complete',
            preferences.syncCompleteNotifications,
            (value) => updatePreference({ syncCompleteNotifications: value }),
            'Notify when sync operations complete'
          )}
          
          {renderToggleSetting(
            'Weekly Digest',
            preferences.weeklyDigestEnabled,
            (value) => updatePreference({ weeklyDigestEnabled: value }),
            'Receive weekly summaries of your photo activity'
          )}
        </>
      ))}

      <View style={styles.actionSection}>
        <Pressable
          style={styles.resetButton}
          onPress={handleResetSettings}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Reset all settings to defaults"
        >
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 16,
  },
  settingInfo: {
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingValue: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  actionSection: {
    marginTop: 32,
    marginHorizontal: 16,
  },
  resetButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});