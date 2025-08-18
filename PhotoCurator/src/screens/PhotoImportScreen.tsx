import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoImportService, ImportResult, ImportOptions } from '../services/photo/PhotoImportService';
import { PermissionManager } from '../services/photo/PermissionManager';
import { PhotoSelectionGrid } from '../components/photo/PhotoSelectionGrid';
import { Photo, PhotoSource, ProcessingProgress } from '../types';

interface ImportProgress {
  isImporting: boolean;
  progress: ProcessingProgress | null;
  result: ImportResult | null;
  error: string | null;
}

export const PhotoImportScreen: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<PhotoSource | null>(null);
  const [availableSources, setAvailableSources] = useState<PhotoSource[]>([]);
  const [importedPhotos, setImportedPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    isImporting: false,
    progress: null,
    result: null,
    error: null,
  });

  const photoImportService = PhotoImportService.getInstance();
  const permissionManager = PermissionManager.getInstance();

  useEffect(() => {
    initializeAvailableSources();
  }, []);

  const initializeAvailableSources = async () => {
    try {
      const sources = photoImportService.getAvailablePhotoSources();
      const availableSourcesWithPermissions: PhotoSource[] = [];

      for (const source of sources) {
        const isAvailable = await photoImportService.isPhotoSourceAvailable(source);
        if (isAvailable) {
          availableSourcesWithPermissions.push(source);
        }
      }

      setAvailableSources(availableSourcesWithPermissions);
    } catch (error) {
      console.error('Error initializing available sources:', error);
    }
  };

  const handleSourceSelection = useCallback(async (source: PhotoSource) => {
    try {
      // Check permission first
      const permissionResult = await permissionManager.checkPhotoSourcePermission(source);
      
      if (!permissionResult.granted) {
        // Show rationale and request permission
        const shouldRequest = await permissionManager.showPermissionRationale(source);
        
        if (shouldRequest) {
          const requestResult = await permissionManager.requestPhotoSourcePermission(source);
          
          if (!requestResult.granted) {
            Alert.alert(
              'Permission Required',
              'Photo library access is required to import photos.',
              [{ text: 'OK' }]
            );
            return;
          }
        } else {
          return;
        }
      }

      setSelectedSource(source);
      startImport(source);
      
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to select photo source: ${(error as Error).message}`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  const startImport = useCallback(async (source: PhotoSource) => {
    setImportProgress({
      isImporting: true,
      progress: null,
      result: null,
      error: null,
    });

    const options: ImportOptions = {
      batchSize: 50,
      includeVideos: false,
      onProgress: (progress: ProcessingProgress) => {
        setImportProgress(prev => ({
          ...prev,
          progress,
        }));
      },
      onError: (error: Error) => {
        console.warn('Import error:', error.message);
      },
    };

    try {
      let result: ImportResult;

      switch (source) {
        case PhotoSource.CAMERA_ROLL:
          result = await photoImportService.importFromCameraRoll(options);
          break;
        case PhotoSource.GOOGLE_PHOTOS:
          // TODO: Implement Google Photos credentials handling
          throw new Error('Google Photos import not yet implemented');
        case PhotoSource.ICLOUD:
          // TODO: Implement iCloud credentials handling
          throw new Error('iCloud import not yet implemented');
        default:
          throw new Error('Unsupported photo source');
      }

      setImportedPhotos(result.photos);
      setImportProgress({
        isImporting: false,
        progress: null,
        result,
        error: null,
      });

      if (result.errors.length > 0) {
        Alert.alert(
          'Import Completed with Warnings',
          `Successfully imported ${result.totalProcessed} photos. ${result.errors.length} photos had errors.`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      const errorMessage = (error as Error).message;
      setImportProgress({
        isImporting: false,
        progress: null,
        result: null,
        error: errorMessage,
      });

      Alert.alert(
        'Import Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleRetryImport = useCallback(() => {
    if (selectedSource) {
      startImport(selectedSource);
    }
  }, [selectedSource, startImport]);

  const handleConfirmSelection = useCallback(() => {
    const selectedPhotoList = importedPhotos.filter(photo => 
      selectedPhotos.has(photo.id)
    );

    Alert.alert(
      'Confirm Import',
      `Import ${selectedPhotoList.length} selected photos?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            // TODO: Save selected photos to local storage and trigger AI analysis
            Alert.alert(
              'Success',
              `${selectedPhotoList.length} photos imported successfully!`,
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  }, [importedPhotos, selectedPhotos]);

  const renderSourceButton = (source: PhotoSource) => {
    const sourceLabels = {
      [PhotoSource.CAMERA_ROLL]: 'Camera Roll',
      [PhotoSource.GOOGLE_PHOTOS]: 'Google Photos',
      [PhotoSource.ICLOUD]: 'iCloud Photos',
    };

    return (
      <TouchableOpacity
        key={source}
        style={[
          styles.sourceButton,
          selectedSource === source && styles.selectedSourceButton
        ]}
        onPress={() => handleSourceSelection(source)}
        disabled={importProgress.isImporting}
      >
        <Text style={[
          styles.sourceButtonText,
          selectedSource === source && styles.selectedSourceButtonText
        ]}>
          {sourceLabels[source]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderImportProgress = () => {
    if (!importProgress.isImporting && !importProgress.progress) {
      return null;
    }

    const progress = importProgress.progress;

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Importing Photos</Text>
        
        {progress && (
          <>
            <Text style={styles.progressStage}>{progress.stage}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${progress.percentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress.current} of {progress.total} ({Math.round(progress.percentage)}%)
            </Text>
          </>
        )}
        
        <ActivityIndicator size="large" color="#007AFF" style={styles.progressIndicator} />
      </View>
    );
  };

  const renderImportResult = () => {
    if (importProgress.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Import Failed</Text>
          <Text style={styles.errorMessage}>{importProgress.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetryImport}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (importProgress.result && importedPhotos.length > 0) {
      return (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>
            Found {importedPhotos.length} photos
          </Text>
          <Text style={styles.resultSubtitle}>
            Select photos to import into your library
          </Text>
          
          <PhotoSelectionGrid
            photos={importedPhotos}
            selectedPhotos={selectedPhotos}
            onSelectionChange={setSelectedPhotos}
            showSelectionCount={true}
          />
          
          {selectedPhotos.size > 0 && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmSelection}
            >
              <Text style={styles.confirmButtonText}>
                Import {selectedPhotos.size} Photos
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Import Photos</Text>
        <Text style={styles.subtitle}>
          Choose a source to import your photos from
        </Text>

        {/* Photo source selection */}
        <View style={styles.sourcesContainer}>
          {availableSources.map(renderSourceButton)}
        </View>

        {/* Import progress */}
        {renderImportProgress()}

        {/* Import result */}
        {renderImportResult()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  sourcesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  sourceButton: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSourceButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  sourceButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  selectedSourceButtonText: {
    color: '#007AFF',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressStage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressIndicator: {
    marginTop: 8,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7d7',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e53e3e',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#c53030',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e53e3e',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  resultContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  confirmButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhotoImportScreen;