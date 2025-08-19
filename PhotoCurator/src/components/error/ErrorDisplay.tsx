import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { AppError, RecoveryAction } from '../../types/error';

interface ErrorDisplayProps {
  error: AppError | null;
  visible: boolean;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  visible,
  onDismiss,
  onRetry,
}) => {
  if (!error) return null;

  const handleRecoveryAction = async (action: RecoveryAction) => {
    try {
      await action.action();
      onDismiss();
    } catch (recoveryError) {
      Alert.alert(
        'Recovery Failed',
        'The recovery action failed. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  const getErrorIcon = () => {
    switch (error.severity) {
      case 'CRITICAL':
        return '🚨';
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '⚡';
      case 'LOW':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  const getErrorColor = () => {
    switch (error.severity) {
      case 'CRITICAL':
        return '#FF3B30';
      case 'HIGH':
        return '#FF9500';
      case 'MEDIUM':
        return '#FFCC00';
      case 'LOW':
        return '#007AFF';
      default:
        return '#8E8E93';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.icon}>{getErrorIcon()}</Text>
              <Text style={[styles.title, { color: getErrorColor() }]}>
                {error.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Error
              </Text>
            </View>

            {/* User Message */}
            <Text style={styles.userMessage}>{error.userMessage}</Text>

            {/* Technical Details (only in dev mode) */}
            {__DEV__ && (
              <View style={styles.technicalDetails}>
                <Text style={styles.technicalTitle}>Technical Details:</Text>
                <Text style={styles.technicalMessage}>{error.message}</Text>
                {error.context && (
                  <View style={styles.contextContainer}>
                    <Text style={styles.contextTitle}>Context:</Text>
                    <Text style={styles.contextText}>
                      {JSON.stringify(error.context, null, 2)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Recovery Actions */}
            {error.recoveryActions && error.recoveryActions.length > 0 && (
              <View style={styles.actionsContainer}>
                <Text style={styles.actionsTitle}>What you can do:</Text>
                {error.recoveryActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionButton,
                      action.primary && styles.primaryActionButton,
                    ]}
                    onPress={() => handleRecoveryAction(action)}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        action.primary && styles.primaryActionButtonText,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Default Actions */}
            <View style={styles.defaultActions}>
              {onRetry && (
                <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>

            {/* Timestamp */}
            <Text style={styles.timestamp}>
              Occurred at {error.timestamp.toLocaleString()}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxWidth: '100%',
    maxHeight: '80%',
    minWidth: 300,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  technicalDetails: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  technicalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  technicalMessage: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  contextContainer: {
    marginTop: 8,
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  primaryActionButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  primaryActionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  defaultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dismissButton: {
    backgroundColor: '#8E8E93',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  dismissButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});