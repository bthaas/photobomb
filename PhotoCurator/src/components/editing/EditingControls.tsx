/**
 * Editing Controls Component - Reusable editing interface controls
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Slider,
  ScrollView,
} from 'react-native';
import { EnhancementSettings } from '../../types/editing';

interface EditingControlsProps {
  settings: EnhancementSettings;
  onSettingsChange: (settings: EnhancementSettings) => void;
  onApply: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export const EditingControls: React.FC<EditingControlsProps> = ({
  settings,
  onSettingsChange,
  onApply,
  onReset,
  disabled = false,
}) => {
  const [activeControl, setActiveControl] = useState<keyof EnhancementSettings | null>(null);

  const handleSliderChange = (key: keyof EnhancementSettings, value: number) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const renderSlider = (
    key: keyof EnhancementSettings,
    label: string,
    min: number = -1,
    max: number = 1,
    step: number = 0.01
  ) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>
          {Math.round(settings[key] * 100)}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={settings[key]}
        onValueChange={(value) => handleSliderChange(key, value)}
        minimumTrackTintColor="#007AFF"
        maximumTrackTintColor="#666"
        thumbStyle={styles.sliderThumb}
        disabled={disabled}
      />
    </View>
  );

  const renderControlTabs = () => {
    const tabs = [
      { key: 'basic', label: 'Basic' },
      { key: 'color', label: 'Color' },
      { key: 'detail', label: 'Detail' },
    ];

    return (
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeControl === tab.key && styles.activeTab,
            ]}
            onPress={() => setActiveControl(tab.key as keyof EnhancementSettings)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.tabText,
                activeControl === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderBasicControls = () => (
    <View style={styles.controlsSection}>
      {renderSlider('exposure', 'Exposure')}
      {renderSlider('contrast', 'Contrast')}
      {renderSlider('highlights', 'Highlights')}
      {renderSlider('shadows', 'Shadows')}
    </View>
  );

  const renderColorControls = () => (
    <View style={styles.controlsSection}>
      {renderSlider('vibrance', 'Vibrance')}
      {renderSlider('saturation', 'Saturation')}
    </View>
  );

  const renderDetailControls = () => (
    <View style={styles.controlsSection}>
      {renderSlider('sharpness', 'Sharpness', 0, 2)}
      {renderSlider('noise_reduction', 'Noise Reduction', 0, 1)}
    </View>
  );

  const renderControls = () => {
    switch (activeControl) {
      case 'basic':
        return renderBasicControls();
      case 'color':
        return renderColorControls();
      case 'detail':
        return renderDetailControls();
      default:
        return renderBasicControls();
    }
  };

  const hasChanges = () => {
    const defaultSettings: EnhancementSettings = {
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      vibrance: 0,
      saturation: 0,
      sharpness: 0,
      noise_reduction: 0,
    };

    return Object.keys(settings).some(
      (key) => settings[key as keyof EnhancementSettings] !== defaultSettings[key as keyof EnhancementSettings]
    );
  };

  return (
    <View style={styles.container}>
      {renderControlTabs()}
      
      <ScrollView style={styles.controlsContainer}>
        {renderControls()}
      </ScrollView>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={onReset}
          disabled={disabled || !hasChanges()}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.applyButton]}
          onPress={onApply}
          disabled={disabled}
        >
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
  },
  controlsContainer: {
    maxHeight: 300,
  },
  controlsSection: {
    padding: 20,
  },
  sliderContainer: {
    marginBottom: 25,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  sliderValue: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  resetButton: {
    backgroundColor: '#666',
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});