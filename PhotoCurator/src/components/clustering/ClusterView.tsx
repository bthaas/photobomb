/**
 * ClusterView - Component for displaying and managing photo clusters
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { PhotoCluster, Photo, ClusterType } from '../../types';

interface ClusterViewProps {
  cluster: PhotoCluster;
  onPhotoPress: (photo: Photo) => void;
  onClusterUpdate: (cluster: PhotoCluster) => void;
  onMergeRequest: (clusterId: string) => void;
  onSplitRequest: (clusterId: string) => void;
  onDeleteCluster: (clusterId: string) => void;
}

export const ClusterView: React.FC<ClusterViewProps> = ({
  cluster,
  onPhotoPress,
  onClusterUpdate,
  onMergeRequest,
  onSplitRequest,
  onDeleteCluster
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState(cluster.label || '');
  const [showActions, setShowActions] = useState(false);

  const handleLabelSave = useCallback(() => {
    const updatedCluster = {
      ...cluster,
      label: labelText.trim() || undefined,
      updatedAt: new Date()
    };
    onClusterUpdate(updatedCluster);
    setIsEditingLabel(false);
  }, [cluster, labelText, onClusterUpdate]);

  const handleMerge = useCallback(() => {
    Alert.alert(
      'Merge Cluster',
      'Select another cluster to merge with this one.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Select', onPress: () => onMergeRequest(cluster.id) }
      ]
    );
  }, [cluster.id, onMergeRequest]);

  const handleSplit = useCallback(() => {
    Alert.alert(
      'Split Cluster',
      'This will split the cluster into smaller groups. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Split', onPress: () => onSplitRequest(cluster.id) }
      ]
    );
  }, [cluster.id, onSplitRequest]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Cluster',
      'This will ungroup all photos in this cluster. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteCluster(cluster.id) }
      ]
    );
  }, [cluster.id, onDeleteCluster]);

  const getClusterTypeIcon = (type: ClusterType): string => {
    switch (type) {
      case ClusterType.VISUAL_SIMILARITY:
        return '🎨';
      case ClusterType.FACE_GROUP:
        return '👥';
      case ClusterType.EVENT:
        return '📅';
      case ClusterType.LOCATION:
        return '📍';
      case ClusterType.TIME_PERIOD:
        return '⏰';
      default:
        return '📁';
    }
  };

  const getClusterTypeName = (type: ClusterType): string => {
    switch (type) {
      case ClusterType.VISUAL_SIMILARITY:
        return 'Similar Photos';
      case ClusterType.FACE_GROUP:
        return 'Face Group';
      case ClusterType.EVENT:
        return 'Event';
      case ClusterType.LOCATION:
        return 'Location';
      case ClusterType.TIME_PERIOD:
        return 'Time Period';
      default:
        return 'Cluster';
    }
  };

  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => (
    <TouchableOpacity
      style={[styles.photoContainer, index === 0 && styles.firstPhoto]}
      onPress={() => onPhotoPress(item)}
    >
      <Image source={{ uri: item.uri }} style={styles.photo} />
      {index === 0 && cluster.photos.length > 1 && (
        <View style={styles.photoCount}>
          <Text style={styles.photoCountText}>+{cluster.photos.length - 1}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderExpandedPhotos = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.expandedPhoto}
      onPress={() => onPhotoPress(item)}
    >
      <Image source={{ uri: item.uri }} style={styles.expandedPhotoImage} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Cluster Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerContent}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={styles.typeIcon}>{getClusterTypeIcon(cluster.type)}</Text>
          <View style={styles.headerText}>
            {isEditingLabel ? (
              <TextInput
                style={styles.labelInput}
                value={labelText}
                onChangeText={setLabelText}
                onBlur={handleLabelSave}
                onSubmitEditing={handleLabelSave}
                autoFocus
                placeholder="Enter cluster label"
              />
            ) : (
              <TouchableOpacity onLongPress={() => setIsEditingLabel(true)}>
                <Text style={styles.clusterLabel}>
                  {cluster.label || getClusterTypeName(cluster.type)}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.clusterInfo}>
              {cluster.photos.length} photos • {Math.round(cluster.confidence * 100)}% confidence
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionsButton}
          onPress={() => setShowActions(true)}
        >
          <Text style={styles.actionsButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Preview */}
      {!isExpanded && (
        <FlatList
          data={cluster.photos.slice(0, 4)}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoPreview}
        />
      )}

      {/* Expanded Photo Grid */}
      {isExpanded && (
        <FlatList
          data={cluster.photos}
          renderItem={renderExpandedPhotos}
          keyExtractor={(item) => item.id}
          numColumns={3}
          style={styles.expandedGrid}
          contentContainerStyle={styles.expandedGridContent}
        />
      )}

      {/* Actions Modal */}
      <Modal
        visible={showActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActions(false)}
        >
          <View style={styles.actionsModal}>
            <TouchableOpacity style={styles.actionItem} onPress={handleMerge}>
              <Text style={styles.actionText}>🔗 Merge with Another Cluster</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleSplit}>
              <Text style={styles.actionText}>✂️ Split Cluster</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setIsEditingLabel(true);
                setShowActions(false);
              }}
            >
              <Text style={styles.actionText}>✏️ Edit Label</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionItem, styles.deleteAction]} onPress={handleDelete}>
              <Text style={[styles.actionText, styles.deleteActionText]}>🗑️ Delete Cluster</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionItem, styles.cancelAction]}
              onPress={() => setShowActions(false)}
            >
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  clusterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clusterInfo: {
    fontSize: 12,
    color: '#666',
  },
  labelInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingVertical: 2,
    marginBottom: 4,
  },
  actionsButton: {
    padding: 8,
  },
  actionsButtonText: {
    fontSize: 20,
    color: '#666',
  },
  photoPreview: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  photoContainer: {
    marginRight: 8,
    position: 'relative',
  },
  firstPhoto: {
    marginRight: 8,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoCount: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  expandedGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  expandedGridContent: {
    paddingBottom: 8,
  },
  expandedPhoto: {
    flex: 1,
    margin: 2,
    aspectRatio: 1,
  },
  expandedPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 250,
    maxWidth: 300,
    overflow: 'hidden',
  },
  actionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    color: '#333',
  },
  deleteAction: {
    backgroundColor: '#fff5f5',
  },
  deleteActionText: {
    color: '#dc3545',
  },
  cancelAction: {
    borderBottomWidth: 0,
    backgroundColor: '#f8f9fa',
  },
});