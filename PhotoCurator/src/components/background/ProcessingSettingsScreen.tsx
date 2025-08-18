import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useBackgroundProcessing } from '../../hooks/useBackgroundProcessing';
import { ProcessingIntensity } from '../../types/background';

export const ProcessingSettingsScreen: React.FC = () => {
  const { state, updateSettings, clearQueue, getTaskStats } = useBackgroundProcessing();
  const [localSettings, setLocalSettings] = useState(state?.settings);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    updateSettings({ [key]: value });
  };

  const handleClearQueue = () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear all pending tasks?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: clearQueue 
        },
      ]
    );
  };

  const getIntensityDescription = (intensity: ProcessingIntensity) => {
    switch (intensity) {
      case ProcessingIntensity.LOW:
        return 'Minimal processing, preserves battery';
      case ProcessingIntensity.MEDIUM:
        return 'Balanced processing and battery usage';
      case ProcessingIntensity.HIGH:
        return 'Fast processing, higher battery usage';
      case ProcessingIntensity.AGGRESSIVE:
        return 'Maximum speed, significant battery usage';
      default:
        return '';
    }
  };

  const taskStats = getTaskStats();

  if (!state || !localSettings) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Processing Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { color: state.isProcessing ? '#4CAF50' : '#FF9800' }]}>
            {state.isProcessing ? 'Processing' : 'Paused'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Queue Length:</Text>
          <Text style={styles.value}>{state.queueLength} tasks</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Progress:</Text>
          <Text style={styles.value}>{Math.round(state.totalProgress)}%</Text>
        </View>
        {state.estimatedTimeRemaining && (
          <View style={styles.statusRow}>
            <Text style={styles.label}>Time Remaining:</Text>
            <Text style={styles.value}>{Math.ceil(state.estimatedTimeRemaining / 60)}m</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Processing Intensity</Text>
        {Object.values(ProcessingIntensity).map((intensity) => (
          <TouchableOpacity
            key={intensity}
            style={[
              styles.intensityOption,
              localSettings.intensity === intensity && styles.selectedOption
            ]}
            onPress={() => handleSettingChange('intensity', intensity)}
          >
            <View style={styles.intensityHeader}>
              <Text style={[
                styles.intensityTitle,
                localSettings.intensity === intensity && styles.selectedText
              ]}>
                {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
              </Text>
              <View style={[
                styles.radio,
                localSettings.intensity === intensity && styles.radioSelected
              ]} />
            </View>
            <Text style={styles.intensityDescription}>
              {getIntensityDescription(intensity)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resource Management</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Pause on Low Battery</Text>
            <Text style={styles.settingDescription}>
              Pause processing when battery is below {Math.round(localSettings.batteryThreshold * 100)}%
            </Text>
          </View>
          <Switch
            value={localSettings.pauseOnLowBattery}
            onValueChange={(value) => handleSettingChange('pauseOnLowBattery', value)}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Pause on High Memory Usage</Text>
            <Text style={styles.settingDescription}>
              Pause processing when memory usage exceeds {Math.round(localSettings.memoryThreshold * 100)}%
            </Text>
          </View>
          <Switch
            value={localSettings.pauseOnHighMemory}
            onValueChange={(value) => handleSettingChange('pauseOnHighMemory', value)}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Pause on Thermal Throttling</Text>
            <Text style={styles.settingDescription}>
              Pause processing when device gets too hot
            </Text>
          </View>
          <Switch
            value={localSettings.pauseOnThermalThrottling}
            onValueChange={(value) => handleSettingChange('pauseOnThermalThrottling', value)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Max Concurrent Tasks</Text>
            <Text style={styles.settingDescription}>
              Currently: {localSettings.maxConcurrentTasks} tasks
            </Text>
          </View>
        </View>
        
        <View style={styles.concurrentTasksContainer}>
          {[1, 2, 3, 4].map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.taskCountButton,
                localSettings.maxConcurrentTasks === count && styles.selectedTaskCount
              ]}
              onPress={() => handleSettingChange('maxConcurrentTasks', count)}
            >
              <Text style={[
                styles.taskCountText,
                localSettings.maxConcurrentTasks === count && styles.selectedText
              ]}>
                {count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Completed Tasks:</Text>
          <Text style={styles.value}>{taskStats.completed}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Failed Tasks:</Text>
          <Text style={styles.value}>{taskStats.failed}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Total Processing Time:</Text>
          <Text style={styles.value}>{Math.round(taskStats.totalTime / 1000)}s</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleClearQueue}>
          <Text style={styles.actionButtonText}>Clear Queue</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resource Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Battery Level:</Text>
          <Text style={styles.value}>
            {Math.round(state.resourceStatus.batteryLevel * 100)}%
            {state.resourceStatus.isCharging ? ' (Charging)' : ''}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Memory Usage:</Text>
          <Text style={styles.value}>
            {Math.round(state.resourceStatus.memoryUsage * 100)}%
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Thermal State:</Text>
          <Text style={[
            styles.value,
            { color: state.resourceStatus.thermalState === 'critical' ? '#F44336' : '#4CAF50' }
          ]}>
            {state.resourceStatus.thermalState}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  intensityOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedOption: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  intensityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  intensityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedText: {
    color: '#2196F3',
  },
  intensityDescription: {
    fontSize: 14,
    color: '#666',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  radioSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  concurrentTasksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  taskCountButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTaskCount: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  taskCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#FF5722',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});