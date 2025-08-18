import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useBackgroundProcessing } from '../../hooks/useBackgroundProcessing';

interface ProcessingProgressIndicatorProps {
  onPress?: () => void;
  compact?: boolean;
}

export const ProcessingProgressIndicator: React.FC<ProcessingProgressIndicatorProps> = ({
  onPress,
  compact = false,
}) => {
  const { state, pauseProcessing, resumeProcessing } = useBackgroundProcessing();

  if (!state || (!state.isProcessing && state.queueLength === 0)) {
    return null;
  }

  const handleToggleProcessing = () => {
    if (state.isProcessing) {
      pauseProcessing();
    } else {
      resumeProcessing();
    }
  };

  const getStatusText = () => {
    if (!state.isProcessing && state.queueLength > 0) {
      return 'Processing Paused';
    }
    
    if (state.currentTask) {
      switch (state.currentTask.type) {
        case 'photo_analysis':
          return 'Analyzing Photos';
        case 'face_detection':
          return 'Detecting Faces';
        case 'clustering':
          return 'Organizing Photos';
        case 'curation':
          return 'Curating Best Shots';
        default:
          return 'Processing Photos';
      }
    }
    
    return 'Processing';
  };

  const getProgressText = () => {
    if (state.currentTask) {
      return `${Math.round(state.currentTask.progress)}%`;
    }
    
    if (state.queueLength > 0) {
      return `${state.queueLength} tasks`;
    }
    
    return '';
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress}>
        <View style={styles.compactProgressBar}>
          <View 
            style={[
              styles.compactProgressFill,
              { width: `${state.totalProgress}%` }
            ]} 
          />
        </View>
        <Text style={styles.compactText}>{getProgressText()}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={handleToggleProcessing}
        >
          <Text style={styles.toggleButtonText}>
            {state.isProcessing ? 'Pause' : 'Resume'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              { width: `${state.totalProgress}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{getProgressText()}</Text>
      </View>
      
      {state.currentTask && (
        <Text style={styles.detailText}>
          {state.currentTask.data?.photos?.length || 0} photos
        </Text>
      )}
      
      {state.estimatedTimeRemaining && (
        <Text style={styles.timeText}>
          {Math.ceil(state.estimatedTimeRemaining / 60)}m remaining
        </Text>
      )}
      
      <View style={styles.resourceStatus}>
        <View style={styles.resourceItem}>
          <Text style={styles.resourceLabel}>Battery</Text>
          <Text style={[
            styles.resourceValue,
            { color: state.resourceStatus.batteryLevel < 0.2 ? '#FF5722' : '#4CAF50' }
          ]}>
            {Math.round(state.resourceStatus.batteryLevel * 100)}%
          </Text>
        </View>
        
        <View style={styles.resourceItem}>
          <Text style={styles.resourceLabel}>Memory</Text>
          <Text style={[
            styles.resourceValue,
            { color: state.resourceStatus.memoryUsage > 0.8 ? '#FF5722' : '#4CAF50' }
          ]}>
            {Math.round(state.resourceStatus.memoryUsage * 100)}%
          </Text>
        </View>
        
        <View style={styles.resourceItem}>
          <Text style={styles.resourceLabel}>Queue</Text>
          <Text style={styles.resourceValue}>
            {state.queueLength}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  compactProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderRadius: 2,
    marginRight: 8,
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    minWidth: 50,
    textAlign: 'right',
  },
  compactText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  resourceStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  resourceItem: {
    alignItems: 'center',
  },
  resourceLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  resourceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});