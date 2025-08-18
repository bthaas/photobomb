import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../stores/appStore';
import { PhotoRepository, PhotoFilter, PhotoSort } from '../services/storage/PhotoRepository';
import { ClusterRepository } from '../services/storage/ClusterRepository';
import {
  PhotoGridView,
  ClusterView,
  PhotoDetailView,
  SearchAndFilter,
  BatchOperations,
  SearchFilters,
  SortOptions,
} from '../components/library';
import { Photo, PhotoCluster } from '../types';

type ViewMode = 'grid' | 'clusters';

export const LibraryScreen: React.FC = () => {
  const { photos, clusters, selectedPhotos, setPhotos, setClusters, setSelectedPhotos, togglePhotoSelection } = useAppStore();
  
  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Search and filter state
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchText: '',
  });
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'date',
    direction: 'desc',
  });

  // Repository instances
  const photoRepository = useMemo(() => new PhotoRepository(), []);
  const clusterRepository = useMemo(() => new ClusterRepository(), []);

  // Load photos and clusters
  const loadPhotos = useCallback(async (page = 0, append = false) => {
    try {
      setLoading(!append);
      
      // Convert search filters to repository filters
      const filter: PhotoFilter = {};
      if (searchFilters.hasFeatures !== undefined) {
        filter.hasFeatures = searchFilters.hasFeatures;
      }
      if (searchFilters.hasFaces !== undefined) {
        filter.hasFaces = searchFilters.hasFaces;
      }
      if (searchFilters.qualityThreshold !== undefined) {
        filter.qualityThreshold = searchFilters.qualityThreshold;
      }

      const sort: PhotoSort = {
        field: sortOptions.field === 'date' ? 'timestamp' : 
               sortOptions.field === 'quality' ? 'quality_overall' :
               sortOptions.field === 'size' ? 'created_at' : 'created_at',
        direction: sortOptions.direction === 'asc' ? 'ASC' : 'DESC',
      };

      const limit = 50;
      const offset = page * limit;
      
      const loadedPhotos = await photoRepository.find(filter, sort, limit, offset);
      
      // Filter by search text if provided
      let filteredPhotos = loadedPhotos;
      if (searchFilters.searchText.trim()) {
        const searchText = searchFilters.searchText.toLowerCase();
        filteredPhotos = loadedPhotos.filter(photo => {
          // Search in detected objects and scenes
          const objectLabels = photo.features?.objects.map(obj => obj.label.toLowerCase()) || [];
          const sceneLabels = photo.features?.scenes.map(scene => scene.label.toLowerCase()) || [];
          const allLabels = [...objectLabels, ...sceneLabels];
          
          return allLabels.some(label => label.includes(searchText)) ||
                 photo.uri.toLowerCase().includes(searchText);
        });
      }

      if (append) {
        setPhotos([...photos, ...filteredPhotos]);
      } else {
        setPhotos(filteredPhotos);
      }
      
      setHasMore(loadedPhotos.length === limit);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [photoRepository, searchFilters, sortOptions, photos, setPhotos]);

  const loadClusters = useCallback(async () => {
    try {
      const loadedClusters = await clusterRepository.findAll();
      setClusters(loadedClusters);
    } catch (error) {
      console.error('Error loading clusters:', error);
      Alert.alert('Error', 'Failed to load clusters');
    }
  }, [clusterRepository, setClusters]);

  // Initial load
  useEffect(() => {
    loadPhotos(0, false);
    loadClusters();
  }, []);

  // Reload when filters or sort options change
  useEffect(() => {
    loadPhotos(0, false);
  }, [searchFilters, sortOptions]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadPhotos(0, false),
      loadClusters(),
    ]);
  }, [loadPhotos, loadClusters]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadPhotos(currentPage + 1, true);
    }
  }, [hasMore, loading, currentPage, loadPhotos]);

  const handlePhotoPress = useCallback((photo: Photo) => {
    if (selectedPhotos.size > 0) {
      togglePhotoSelection(photo.id);
    } else {
      setSelectedPhoto(photo);
    }
  }, [selectedPhotos.size, togglePhotoSelection]);

  const handlePhotoLongPress = useCallback((photo: Photo) => {
    togglePhotoSelection(photo.id);
  }, [togglePhotoSelection]);

  const handleSelectionChange = useCallback((newSelection: Set<string>) => {
    setSelectedPhotos(Array.from(newSelection));
  }, [setSelectedPhotos]);

  const handleClearSelection = useCallback(() => {
    setSelectedPhotos([]);
  }, [setSelectedPhotos]);

  const handleDeletePhotos = useCallback(async (photoIds: string[]) => {
    try {
      for (const photoId of photoIds) {
        await photoRepository.delete(photoId);
      }
      
      // Reload photos
      await loadPhotos(0, false);
      
      Alert.alert('Success', `${photoIds.length} photo${photoIds.length > 1 ? 's' : ''} deleted`);
    } catch (error) {
      console.error('Error deleting photos:', error);
      Alert.alert('Error', 'Failed to delete photos');
    }
  }, [photoRepository, loadPhotos]);

  const handleSharePhotos = useCallback(async (photoIds: string[]) => {
    try {
      const photosToShare = photos.filter(p => photoIds.includes(p.id));
      const urls = photosToShare.map(p => p.uri);
      
      await Share.share({
        message: `Sharing ${urls.length} photo${urls.length > 1 ? 's' : ''}`,
        url: urls[0], // Share first photo URL
      });
    } catch (error) {
      console.error('Error sharing photos:', error);
      Alert.alert('Error', 'Failed to share photos');
    }
  }, [photos]);

  const handleEditPhoto = useCallback((photo: Photo) => {
    setSelectedPhoto(null);
    // Navigate to photo editing screen
    // This would typically use navigation
    console.log('Edit photo:', photo.id);
  }, []);

  const handleDeletePhoto = useCallback(async (photo: Photo) => {
    try {
      await photoRepository.delete(photo.id);
      setSelectedPhoto(null);
      await loadPhotos(0, false);
      Alert.alert('Success', 'Photo deleted');
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo');
    }
  }, [photoRepository, loadPhotos]);

  const selectedPhotosSet = useMemo(() => new Set(selectedPhotos), [selectedPhotos]);
  const showSelectionMode = selectedPhotos.length > 0;

  // Get available tags for filtering
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    photos.forEach(photo => {
      photo.features?.objects.forEach(obj => tags.add(obj.label));
      photo.features?.scenes.forEach(scene => tags.add(scene.label));
    });
    return Array.from(tags).sort();
  }, [photos]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Photo Library</Text>
        
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[styles.viewModeButtonText, viewMode === 'grid' && styles.viewModeButtonTextActive]}>
              Grid
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'clusters' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('clusters')}
          >
            <Text style={[styles.viewModeButtonText, viewMode === 'clusters' && styles.viewModeButtonTextActive]}>
              Clusters
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <SearchAndFilter
        filters={searchFilters}
        sortOptions={sortOptions}
        onFiltersChange={setSearchFilters}
        onSortChange={setSortOptions}
        availableTags={availableTags}
        showFilterModal={showFilterModal}
        onToggleFilterModal={() => setShowFilterModal(!showFilterModal)}
      />

      {/* Content */}
      <View style={styles.content}>
        {viewMode === 'grid' ? (
          <PhotoGridView
            photos={photos}
            selectedPhotos={selectedPhotosSet}
            onPhotoPress={handlePhotoPress}
            onPhotoLongPress={handlePhotoLongPress}
            onSelectionChange={handleSelectionChange}
            loading={loading}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            hasMore={hasMore}
            showSelectionMode={showSelectionMode}
          />
        ) : (
          <ClusterView
            clusters={clusters}
            onPhotoPress={handlePhotoPress}
            selectedPhotos={selectedPhotosSet}
            onSelectionChange={handleSelectionChange}
            showSelectionMode={showSelectionMode}
          />
        )}
      </View>

      {/* Batch Operations */}
      <BatchOperations
        selectedPhotos={selectedPhotosSet}
        photos={photos}
        onClearSelection={handleClearSelection}
        onDeletePhotos={handleDeletePhotos}
        onSharePhotos={handleSharePhotos}
        visible={showSelectionMode}
      />

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <PhotoDetailView
          photo={selectedPhoto}
          visible={true}
          onClose={() => setSelectedPhoto(null)}
          onEdit={handleEditPhoto}
          onDelete={handleDeletePhoto}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#007AFF',
  },
  viewModeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
});
