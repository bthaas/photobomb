import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Photo } from '../../types';

interface BatchOperationsProps {
  selectedPhotos: Set<string>;
  photos: Photo[];
  onClearSelection: () => void;
  onDeletePhotos?: (photoIds: string[]) => void;
  onExportPhotos?: (photoIds: string[]) => void;
  onAddToCluster?: (photoIds: string[]) => void;
  onRemoveFromCluster?: (photoIds: string[]) => void;
  onMarkAsFavorite?: (photoIds: string[]) => void;
  onSharePhotos?: (photoIds: string[]) => void;
  visible: boolean;
}

export const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedPhotos,
  photos,
  onClearSelection,
  onDeletePhotos,
  onExportPhotos,
  onAddToCluster,
  onRemoveFromCluster,
  onMarkAsFavorite,
  onSharePhotos,
  visible,
}) => {
  const selectedPhotoIds = Array.from(selectedPhotos);
  const selectedCount = selectedPhotoIds.length;

  const handleDelete = useCallback(() => {
    if (!onDeletePhotos) return;

    Alert.alert(
      'Delete Photos',
      `Are you sure you want to delete ${selectedCount} photo${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeletePhotos(selectedPhotoIds);
            onClearSelection();
          },
        },
      ]
    );
  }, [selectedCount, selectedPhotoIds, onDeletePhotos, onClearSelection]);

  const handleExport = useCallback(() => {
    if (!onExportPhotos) return;

    Alert.alert(
      'Export Photos',
      `Export ${selectedCount} photo${selectedCount > 1 ? 's' : ''} to device gallery?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            onExportPhotos(selectedPhotoIds);
            onClearSelection();
          },
        },
      ]
    );
  }, [selectedCount, selectedPhotoIds, onExportPhotos, onClearSelection]);

  const handleShare = useCallback(() => {
    if (!onSharePhotos) return;

    if (selectedCount > 10) {
      Alert.alert(
        'Too Many Photos',
        'You can only share up to 10 photos at once. Please select fewer photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    onSharePhotos(selectedPhotoIds);
  }, [selectedCount, selectedPhotoIds, onSharePhotos]);

  const handleAddToCluster = useCallback(() => {
    if (!onAddToCluster) return;

    // Show cluster selection UI (simplified for now)
    Alert.alert(
      'Add to Cluster',
      `Add ${selectedCount} photo${selectedCount > 1 ? 's' : ''} to a cluster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => {
            onAddToCluster(selectedPhotoIds);
            onClearSelection();
          },
        },
      ]
    );
  }, [selectedCount, selectedPhotoIds, onAddToCluster, onClearSelection]);

  const handleRemoveFromCluster = useCallback(() => {
    if (!onRemoveFromCluster) return;

    Alert.alert(
      'Remove from Cluster',
      `Remove ${selectedCount} photo${selectedCount > 1 ? 's' : ''} from their cluster${selectedCount > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: () => {
            onRemoveFromCluster(selectedPhotoIds);
            onClearSelection();
          },
        },
      ]
    );
  }, [selectedCount, selectedPhotoIds, onRemoveFromCluster, onClearSelection]);

  const handleMarkAsFavorite = useCallback(() => {
    if (!onMarkAsFavorite) return;

    onMarkAsFavorite(selectedPhotoIds);
    onClearSelection();
  }, [selectedPhotoIds, onMarkAsFavorite, onClearSelection]);

  const showMoreOptions = useCallback(() => {
    const options = ['Cancel'];
    const actions: (() => void)[] = [];

    if (onAddToCluster) {
      options.push('Add to Cluster');
      actions.push(handleAddToCluster);
    }

    if (onRemoveFromCluster) {
      options.push('Remove from Cluster');
      actions.push(handleRemoveFromCluster);
    }

    if (onMarkAsFavorite) {
      options.push('Mark as Favorite');
      actions.push(handleMarkAsFavorite);
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            actions[buttonIndex - 1]();
          }
        }
      );
    } else {
      // For Android, show a simple alert with options
      Alert.alert(
        'More Options',
        'Choose an action:',
        [
          { text: 'Cancel', style: 'cancel' },
          ...actions.map((action, index) => ({
            text: options[index + 1],
            onPress: action,
          })),
        ]
      );
    }
  }, [onAddToCluster, onRemoveFromCluster, onMarkAsFavorite, handleAddToCluster, handleRemoveFromCluster, handleMarkAsFavorite]);

  if (!visible || selectedCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.selectionInfo}>
        <Text style={styles.selectionCount}>
          {selectedCount} photo{selectedCount > 1 ? 's' : ''} selected
        </Text>
        
        <TouchableOpacity style={styles.clearButton} onPress={onClearSelection}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        {onSharePhotos && (
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShare}
          >
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        )}

        {onExportPhotos && (
          <TouchableOpacity
            style={[styles.actionButton, styles.exportButton]}
            onPress={handleExport}
          >
            <Text style={styles.actionButtonText}>Export</Text>
          </TouchableOpacity>
        )}

        {(onAddToCluster || onRemoveFromCluster || onMarkAsFavorite) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.moreButton]}
            onPress={showMoreOptions}
          >
            <Text style={styles.actionButtonText}>More</Text>
          </TouchableOpacity>
        )}

        {onDeletePhotos && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  shareButton: {
    backgroundColor: '#007AFF',
  },
  exportButton: {
    backgroundColor: '#34C759',
  },
  moreButton: {
    backgroundColor: '#8E8E93',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#fff',
  },
});

export default BatchOperations;