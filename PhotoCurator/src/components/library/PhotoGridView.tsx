import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Photo } from '../../types';

interface PhotoGridViewProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onPhotoPress: (photo: Photo) => void;
  onPhotoLongPress?: (photo: Photo) => void;
  onSelectionChange: (selectedPhotos: Set<string>) => void;
  numColumns?: number;
  loading?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  showQualityIndicator?: boolean;
  showSelectionMode?: boolean;
}

interface PhotoItemProps {
  photo: Photo;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  itemSize: number;
  showQualityIndicator: boolean;
}

const PhotoItem: React.FC<PhotoItemProps> = React.memo(({
  photo,
  isSelected,
  onPress,
  onLongPress,
  itemSize,
  showQualityIndicator,
}) => {
  const qualityScore = photo.qualityScore?.overall;
  const hasHighQuality = qualityScore && qualityScore > 0.8;
  
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
      
      {/* Quality indicator */}
      {showQualityIndicator && hasHighQuality && (
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityBadgeText}>★</Text>
        </View>
      )}
      
      {/* Face count indicator */}
      {photo.faces && photo.faces.length > 0 && (
        <View style={styles.faceBadge}>
          <Text style={styles.faceBadgeText}>{photo.faces.length}</Text>
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
      
      {/* Cluster indicator */}
      {photo.clusterId && (
        <View style={styles.clusterIndicator} />
      )}
    </TouchableOpacity>
  );
});

export const PhotoGridView: React.FC<PhotoGridViewProps> = ({
  photos,
  selectedPhotos,
  onPhotoPress,
  onPhotoLongPress,
  onSelectionChange,
  numColumns = 3,
  loading = false,
  onRefresh,
  onEndReached,
  hasMore = false,
  showQualityIndicator = true,
  showSelectionMode = false,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  const screenWidth = Dimensions.get('window').width;
  const itemSize = (screenWidth - (numColumns + 1) * 8) / numColumns;

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  }, [onRefresh]);

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

  const handlePhotoLongPress = useCallback((photo: Photo) => {
    if (onPhotoLongPress) {
      onPhotoLongPress(photo);
    } else {
      // Default behavior: start selection mode
      const newSelection = new Set(selectedPhotos);
      newSelection.add(photo.id);
      onSelectionChange(newSelection);
    }
  }, [onPhotoLongPress, selectedPhotos, onSelectionChange]);

  const renderPhoto = useCallback(({ item }: { item: Photo }) => {
    const isSelected = selectedPhotos.has(item.id);
    
    return (
      <PhotoItem
        photo={item}
        isSelected={isSelected}
        onPress={() => handlePhotoPress(item)}
        onLongPress={() => handlePhotoLongPress(item)}
        itemSize={itemSize}
        showQualityIndicator={showQualityIndicator}
      />
    );
  }, [selectedPhotos, handlePhotoPress, handlePhotoLongPress, itemSize, showQualityIndicator]);

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>Loading more photos...</Text>
      </View>
    );
  }, [hasMore]);

  const keyExtractor = useCallback((item: Photo) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: itemSize,
    offset: itemSize * Math.floor(index / numColumns),
    index,
  }), [itemSize, numColumns]);

  if (loading && photos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No photos found</Text>
        <Text style={styles.emptySubtext}>Import photos to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          ) : undefined
        }
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  gridContainer: {
    padding: 4,
  },
  photoItem: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  qualityBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  faceBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  faceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  clusterIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default PhotoGridView;