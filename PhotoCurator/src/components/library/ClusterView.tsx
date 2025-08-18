import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { PhotoCluster, Photo, ClusterType } from '../../types';

interface ClusterViewProps {
  clusters: PhotoCluster[];
  onPhotoPress: (photo: Photo) => void;
  onClusterPress?: (cluster: PhotoCluster) => void;
  selectedPhotos: Set<string>;
  onSelectionChange: (selectedPhotos: Set<string>) => void;
  showSelectionMode?: boolean;
}

interface ClusterItemProps {
  cluster: PhotoCluster;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPhotoPress: (photo: Photo) => void;
  onClusterPress?: (cluster: PhotoCluster) => void;
  selectedPhotos: Set<string>;
  onSelectionChange: (selectedPhotos: Set<string>) => void;
  showSelectionMode: boolean;
}

const ClusterItem: React.FC<ClusterItemProps> = ({
  cluster,
  isExpanded,
  onToggleExpand,
  onPhotoPress,
  onClusterPress,
  selectedPhotos,
  onSelectionChange,
  showSelectionMode,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const photoSize = (screenWidth - 48) / 4; // 4 photos per row with margins
  
  const getClusterIcon = (type: ClusterType) => {
    switch (type) {
      case ClusterType.FACE_GROUP:
        return '👤';
      case ClusterType.EVENT:
        return '📅';
      case ClusterType.LOCATION:
        return '📍';
      case ClusterType.TIME_PERIOD:
        return '🕒';
      case ClusterType.VISUAL_SIMILARITY:
      default:
        return '🖼️';
    }
  };

  const getClusterTypeLabel = (type: ClusterType) => {
    switch (type) {
      case ClusterType.FACE_GROUP:
        return 'People';
      case ClusterType.EVENT:
        return 'Event';
      case ClusterType.LOCATION:
        return 'Location';
      case ClusterType.TIME_PERIOD:
        return 'Time Period';
      case ClusterType.VISUAL_SIMILARITY:
      default:
        return 'Similar Photos';
    }
  };

  const handlePhotoPress = useCallback((photo: Photo) => {
    if (showSelectionMode) {
      const newSelection = new Set(selectedPhotos);
      if (newSelection.has(photo.id)) {
        newSelection.delete(photo.id);
      } else {
        newSelection.add(photo.id);
      }
      onSelectionChange(newSelection);
    } else {
      onPhotoPress(photo);
    }
  }, [showSelectionMode, selectedPhotos, onSelectionChange, onPhotoPress]);

  const handleClusterHeaderPress = useCallback(() => {
    if (onClusterPress) {
      onClusterPress(cluster);
    } else {
      onToggleExpand();
    }
  }, [onClusterPress, cluster, onToggleExpand]);

  const renderPhoto = useCallback(({ item }: { item: Photo }) => {
    const isSelected = selectedPhotos.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.photoItem, { width: photoSize, height: photoSize }]}
        onPress={() => handlePhotoPress(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.photoImage}
          resizeMode="cover"
        />
        
        {/* Quality indicator */}
        {item.qualityScore && item.qualityScore.overall > 0.8 && (
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityBadgeText}>★</Text>
          </View>
        )}
        
        {/* Selection overlay */}
        {isSelected && (
          <View style={styles.selectionOverlay}>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [photoSize, selectedPhotos, handlePhotoPress]);

  const previewPhotos = cluster.photos.slice(0, 4);
  const remainingCount = Math.max(0, cluster.photos.length - 4);

  return (
    <View style={styles.clusterContainer}>
      {/* Cluster Header */}
      <TouchableOpacity
        style={styles.clusterHeader}
        onPress={handleClusterHeaderPress}
        activeOpacity={0.7}
      >
        <View style={styles.clusterInfo}>
          <View style={styles.clusterTitleRow}>
            <Text style={styles.clusterIcon}>
              {getClusterIcon(cluster.type)}
            </Text>
            <Text style={styles.clusterTitle}>
              {cluster.label || getClusterTypeLabel(cluster.type)}
            </Text>
            <Text style={styles.photoCount}>
              ({cluster.photos.length})
            </Text>
          </View>
          
          <Text style={styles.clusterSubtitle}>
            {getClusterTypeLabel(cluster.type)} • {Math.round(cluster.confidence * 100)}% confidence
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.expandButton}
          onPress={onToggleExpand}
        >
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Photo Preview (always visible) */}
      <View style={styles.photoPreview}>
        {previewPhotos.map((photo, index) => (
          <TouchableOpacity
            key={photo.id}
            style={[styles.previewPhoto, { width: photoSize, height: photoSize }]}
            onPress={() => handlePhotoPress(photo)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: photo.uri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
            
            {selectedPhotos.has(photo.id) && (
              <View style={styles.selectionOverlay}>
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
        
        {remainingCount > 0 && (
          <View style={[styles.remainingCount, { width: photoSize, height: photoSize }]}>
            <Text style={styles.remainingCountText}>+{remainingCount}</Text>
          </View>
        )}
      </View>

      {/* Expanded Photo Grid */}
      {isExpanded && cluster.photos.length > 4 && (
        <View style={styles.expandedPhotos}>
          <FlatList
            data={cluster.photos.slice(4)} // Skip the first 4 already shown
            renderItem={renderPhoto}
            keyExtractor={(item) => item.id}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={styles.expandedGrid}
          />
        </View>
      )}
    </View>
  );
};

export const ClusterView: React.FC<ClusterViewProps> = ({
  clusters,
  onPhotoPress,
  onClusterPress,
  selectedPhotos,
  onSelectionChange,
  showSelectionMode = false,
}) => {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((clusterId: string) => {
    setExpandedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  }, []);

  const sortedClusters = useMemo(() => {
    return [...clusters].sort((a, b) => {
      // Sort by photo count (descending), then by confidence (descending)
      if (a.photos.length !== b.photos.length) {
        return b.photos.length - a.photos.length;
      }
      return b.confidence - a.confidence;
    });
  }, [clusters]);

  const renderCluster = useCallback(({ item }: { item: PhotoCluster }) => {
    const isExpanded = expandedClusters.has(item.id);
    
    return (
      <ClusterItem
        cluster={item}
        isExpanded={isExpanded}
        onToggleExpand={() => handleToggleExpand(item.id)}
        onPhotoPress={onPhotoPress}
        onClusterPress={onClusterPress}
        selectedPhotos={selectedPhotos}
        onSelectionChange={onSelectionChange}
        showSelectionMode={showSelectionMode}
      />
    );
  }, [expandedClusters, handleToggleExpand, onPhotoPress, onClusterPress, selectedPhotos, onSelectionChange, showSelectionMode]);

  if (clusters.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No clusters found</Text>
        <Text style={styles.emptySubtext}>Photos will be automatically grouped as they are analyzed</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedClusters}
        renderItem={renderCluster}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  clusterContainer: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clusterInfo: {
    flex: 1,
  },
  clusterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clusterIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  clusterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  photoCount: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  clusterSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  expandButton: {
    padding: 8,
  },
  expandIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  photoPreview: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  previewPhoto: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photoItem: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    margin: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  qualityBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  remainingCount: {
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remainingCountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expandedPhotos: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  expandedGrid: {
    gap: 4,
  },
});

export default ClusterView;