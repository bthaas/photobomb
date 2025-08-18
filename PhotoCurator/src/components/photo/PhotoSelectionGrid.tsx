import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Photo } from '../../types';

interface PhotoSelectionGridProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onSelectionChange: (selectedPhotos: Set<string>) => void;
  onPhotoPress?: (photo: Photo) => void;
  numColumns?: number;
  maxSelection?: number;
  showSelectionCount?: boolean;
  loading?: boolean;
  enableBatchSelection?: boolean;
  sortBy?: 'date' | 'size' | 'name';
  sortOrder?: 'asc' | 'desc';
  filterBy?: {
    dateRange?: { from: Date; to: Date };
    minSize?: number;
    maxSize?: number;
  };
}

interface PhotoItemProps {
  photo: Photo;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  itemSize: number;
}

const PhotoItem: React.FC<PhotoItemProps> = ({
  photo,
  isSelected,
  onPress,
  onLongPress,
  itemSize,
}) => {
  return (
    <TouchableOpacity
      style={[styles.photoItem, { width: itemSize, height: itemSize }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: photo.uri }}
        style={styles.photoImage}
        resizeMode="cover"
      />
      
      {/* Selection overlay */}
      {isSelected && (
        <View style={styles.selectionOverlay}>
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        </View>
      )}
      
      {/* Photo info overlay */}
      <View style={styles.photoInfo}>
        <Text style={styles.photoDate}>
          {photo.createdAt.toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const PhotoSelectionGrid: React.FC<PhotoSelectionGridProps> = ({
  photos,
  selectedPhotos,
  onSelectionChange,
  onPhotoPress,
  numColumns = 3,
  maxSelection,
  showSelectionCount = true,
  loading = false,
  enableBatchSelection = true,
  sortBy = 'date',
  sortOrder = 'desc',
  filterBy,
}) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const itemSize = (screenWidth - (numColumns + 1) * 8) / numColumns;

  // Sort and filter photos
  const processedPhotos = useMemo(() => {
    let filtered = [...photos];

    // Apply filters
    if (filterBy) {
      if (filterBy.dateRange) {
        filtered = filtered.filter(photo => {
          const photoDate = photo.createdAt;
          return photoDate >= filterBy.dateRange!.from && photoDate <= filterBy.dateRange!.to;
        });
      }
      if (filterBy.minSize) {
        filtered = filtered.filter(photo => photo.metadata.fileSize >= filterBy.minSize!);
      }
      if (filterBy.maxSize) {
        filtered = filtered.filter(photo => photo.metadata.fileSize <= filterBy.maxSize!);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
          break;
        case 'size':
          comparison = (a.metadata?.fileSize || 0) - (b.metadata?.fileSize || 0);
          break;
        case 'name':
          comparison = (a.uri || '').localeCompare(b.uri || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [photos, filterBy, sortBy, sortOrder]);

  const handlePhotoPress = useCallback((photo: Photo) => {
    if (selectionMode) {
      handlePhotoSelection(photo);
    } else if (onPhotoPress) {
      onPhotoPress(photo);
    }
  }, [selectionMode, onPhotoPress]);

  const handlePhotoLongPress = useCallback((photo: Photo) => {
    if (!selectionMode) {
      setSelectionMode(true);
      handlePhotoSelection(photo);
    }
  }, [selectionMode]);

  const handlePhotoSelection = useCallback((photo: Photo) => {
    const newSelection = new Set(selectedPhotos);
    
    if (newSelection.has(photo.id)) {
      newSelection.delete(photo.id);
    } else {
      // Check max selection limit
      if (maxSelection && newSelection.size >= maxSelection) {
        Alert.alert(
          'Selection Limit',
          `You can only select up to ${maxSelection} photos.`,
          [{ text: 'OK' }]
        );
        return;
      }
      newSelection.add(photo.id);
    }
    
    onSelectionChange(newSelection);
    
    // Exit selection mode if no photos are selected
    if (newSelection.size === 0) {
      setSelectionMode(false);
    }
  }, [selectedPhotos, onSelectionChange, maxSelection]);

  const handleSelectAll = useCallback(() => {
    const photosToSelect = maxSelection 
      ? processedPhotos.slice(0, maxSelection)
      : processedPhotos;
    
    const newSelection = new Set(photosToSelect.map(photo => photo.id));
    onSelectionChange(newSelection);
  }, [processedPhotos, onSelectionChange, maxSelection]);

  const handleSelectRange = useCallback((startIndex: number, endIndex: number) => {
    if (!enableBatchSelection) return;
    
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const rangePhotos = processedPhotos.slice(start, end + 1);
    
    const newSelection = new Set(selectedPhotos);
    rangePhotos.forEach(photo => {
      if (maxSelection && newSelection.size >= maxSelection) return;
      newSelection.add(photo.id);
    });
    
    onSelectionChange(newSelection);
    setSelectionMode(true);
  }, [processedPhotos, selectedPhotos, onSelectionChange, maxSelection, enableBatchSelection]);

  const handleSelectBest = useCallback(() => {
    // Select photos with highest quality scores (if available)
    const photosWithScores = processedPhotos.filter(photo => photo.qualityScore);
    const sortedByQuality = photosWithScores.sort((a, b) => 
      (b.qualityScore?.overall || 0) - (a.qualityScore?.overall || 0)
    );
    
    const bestPhotos = maxSelection 
      ? sortedByQuality.slice(0, maxSelection)
      : sortedByQuality.slice(0, Math.min(10, sortedByQuality.length)); // Default to top 10
    
    const newSelection = new Set(bestPhotos.map(photo => photo.id));
    onSelectionChange(newSelection);
    setSelectionMode(true);
  }, [processedPhotos, onSelectionChange, maxSelection]);

  const handleDeselectAll = useCallback(() => {
    onSelectionChange(new Set());
    setSelectionMode(false);
  }, [onSelectionChange]);

  const renderPhoto = useCallback(({ item, index }: { item: Photo; index: number }) => {
    const isSelected = selectedPhotos.has(item.id);
    
    return (
      <PhotoItem
        photo={item}
        isSelected={isSelected}
        onPress={() => handlePhotoPress(item)}
        onLongPress={() => handlePhotoLongPress(item)}
        itemSize={itemSize}
      />
    );
  }, [selectedPhotos, handlePhotoPress, handlePhotoLongPress, itemSize]);

  const keyExtractor = useCallback((item: Photo) => item.id, []);

  const selectionCount = selectedPhotos.size;
  const hasSelection = selectionCount > 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Selection header */}
      {(selectionMode || hasSelection) && (
        <View style={styles.selectionHeader}>
          <View style={styles.selectionInfo}>
            {showSelectionCount && (
              <Text style={styles.selectionCount}>
                {selectionCount} selected
                {maxSelection && ` of ${maxSelection} max`}
              </Text>
            )}
          </View>
          
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.actionButtonText}>All</Text>
            </TouchableOpacity>
            
            {enableBatchSelection && processedPhotos.some(p => p.qualityScore) && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSelectBest}
              >
                <Text style={styles.actionButtonText}>Best</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDeselectAll}
            >
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Photo grid */}
      <FlatList
        data={processedPhotos}
        renderItem={renderPhoto}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        getItemLayout={(data, index) => ({
          length: itemSize,
          offset: itemSize * Math.floor(index / numColumns),
          index,
        })}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  gridContainer: {
    padding: 4,
  },
  photoItem: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
  },
  photoDate: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default PhotoSelectionGrid;