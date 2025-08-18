/**
 * CurationExportView - Component for exporting curated photo collections
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import {
  CurationResult,
  RankedPhoto
} from '../../types';

interface ExportOptions {
  format: 'album' | 'folder' | 'share';
  includeMetadata: boolean;
  includeRankings: boolean;
  maxPhotos?: number;
  quality: 'original' | 'high' | 'medium';
}

interface CurationExportViewProps {
  curationResult: CurationResult;
  onExport?: (options: ExportOptions, photos: RankedPhoto[]) => Promise<void>;
  visible: boolean;
  onClose: () => void;
}

export const CurationExportView: React.FC<CurationExportViewProps> = ({
  curationResult,
  onExport,
  visible,
  onClose
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'album',
    includeMetadata: true,
    includeRankings: false,
    quality: 'high'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(
    new Set(curationResult.selectedPhotos.map(p => p.photo.id))
  );

  const handleExportOptionChange = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePhotoToggle = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedPhotos(new Set(curationResult.selectedPhotos.map(p => p.photo.id)));
  };

  const handleSelectNone = () => {
    setSelectedPhotos(new Set());
  };

  const handleSelectTop = (count: number) => {
    const topPhotos = curationResult.selectedPhotos
      .slice(0, count)
      .map(p => p.photo.id);
    setSelectedPhotos(new Set(topPhotos));
  };

  const handleExport = async () => {
    if (selectedPhotos.size === 0) {
      Alert.alert('No Photos Selected', 'Please select at least one photo to export.');
      return;
    }

    const photosToExport = curationResult.selectedPhotos.filter(
      p => selectedPhotos.has(p.photo.id)
    );

    setIsExporting(true);
    
    try {
      await onExport?.(exportOptions, photosToExport);
      Alert.alert(
        'Export Complete',
        `Successfully exported ${photosToExport.length} photos.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(
        'Export Failed',
        'An error occurred while exporting photos. Please try again.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const getGoalDisplayName = (goal: string): string => {
    switch (goal) {
      case 'best_scenic':
        return 'Best Scenic';
      case 'best_portraits':
        return 'Best Portraits';
      case 'most_creative':
        return 'Most Creative';
      case 'best_technical':
        return 'Best Technical';
      case 'most_emotional':
        return 'Most Emotional';
      case 'balanced':
        return 'Balanced';
      default:
        return 'Unknown';
    }
  };

  const getFormatDescription = (format: string): string => {
    switch (format) {
      case 'album':
        return 'Create a new photo album in your device gallery';
      case 'folder':
        return 'Export photos to a folder in your device storage';
      case 'share':
        return 'Share photos directly to other apps or contacts';
      default:
        return '';
    }
  };

  const getQualityDescription = (quality: string): string => {
    switch (quality) {
      case 'original':
        return 'Full resolution (largest file size)';
      case 'high':
        return 'High quality (balanced size and quality)';
      case 'medium':
        return 'Medium quality (smaller file size)';
      default:
        return '';
    }
  };

  const renderExportOptions = () => {
    return (
      <View style={styles.optionsContainer}>
        <Text style={styles.sectionTitle}>Export Options</Text>

        {/* Format Selection */}
        <View style={styles.optionGroup}>
          <Text style={styles.optionLabel}>Export Format</Text>
          <View style={styles.formatButtons}>
            {(['album', 'folder', 'share'] as const).map(format => (
              <TouchableOpacity
                key={format}
                style={[
                  styles.formatButton,
                  exportOptions.format === format && styles.selectedFormatButton
                ]}
                onPress={() => handleExportOptionChange('format', format)}
              >
                <Text style={[
                  styles.formatButtonText,
                  exportOptions.format === format && styles.selectedFormatButtonText
                ]}>
                  {format.charAt(0).toUpperCase() + format.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.optionDescription}>
            {getFormatDescription(exportOptions.format)}
          </Text>
        </View>

        {/* Quality Selection */}
        <View style={styles.optionGroup}>
          <Text style={styles.optionLabel}>Photo Quality</Text>
          <View style={styles.formatButtons}>
            {(['original', 'high', 'medium'] as const).map(quality => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.formatButton,
                  exportOptions.quality === quality && styles.selectedFormatButton
                ]}
                onPress={() => handleExportOptionChange('quality', quality)}
              >
                <Text style={[
                  styles.formatButtonText,
                  exportOptions.quality === quality && styles.selectedFormatButtonText
                ]}>
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.optionDescription}>
            {getQualityDescription(exportOptions.quality)}
          </Text>
        </View>

        {/* Toggle Options */}
        <View style={styles.optionGroup}>
          <View style={styles.toggleOption}>
            <Text style={styles.toggleLabel}>Include photo metadata</Text>
            <Switch
              value={exportOptions.includeMetadata}
              onValueChange={(value) => handleExportOptionChange('includeMetadata', value)}
              trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
              thumbColor={exportOptions.includeMetadata ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
          <Text style={styles.toggleDescription}>
            Include EXIF data, location, and timestamp information
          </Text>
        </View>

        <View style={styles.optionGroup}>
          <View style={styles.toggleOption}>
            <Text style={styles.toggleLabel}>Include ranking information</Text>
            <Switch
              value={exportOptions.includeRankings}
              onValueChange={(value) => handleExportOptionChange('includeRankings', value)}
              trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
              thumbColor={exportOptions.includeRankings ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
          <Text style={styles.toggleDescription}>
            Add ranking and score information to photo names or metadata
          </Text>
        </View>
      </View>
    );
  };

  const renderPhotoSelection = () => {
    return (
      <View style={styles.selectionContainer}>
        <View style={styles.selectionHeader}>
          <Text style={styles.sectionTitle}>Select Photos</Text>
          <Text style={styles.selectionCount}>
            {selectedPhotos.size} of {curationResult.selectedPhotos.length} selected
          </Text>
        </View>

        <View style={styles.selectionButtons}>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={handleSelectAll}
          >
            <Text style={styles.selectionButtonText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={handleSelectNone}
          >
            <Text style={styles.selectionButtonText}>None</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => handleSelectTop(5)}
          >
            <Text style={styles.selectionButtonText}>Top 5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => handleSelectTop(10)}
          >
            <Text style={styles.selectionButtonText}>Top 10</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.photoList}>
          {curationResult.selectedPhotos.map((rankedPhoto, index) => {
            const isSelected = selectedPhotos.has(rankedPhoto.photo.id);
            
            return (
              <TouchableOpacity
                key={rankedPhoto.photo.id}
                style={[
                  styles.photoItem,
                  isSelected && styles.selectedPhotoItem
                ]}
                onPress={() => handlePhotoToggle(rankedPhoto.photo.id)}
              >
                <View style={styles.photoInfo}>
                  <Text style={styles.photoRank}>#{rankedPhoto.rank}</Text>
                  <View style={styles.photoDetails}>
                    <Text style={styles.photoScore}>
                      Score: {(rankedPhoto.score * 100).toFixed(1)}
                    </Text>
                    <Text style={styles.photoId} numberOfLines={1}>
                      {rankedPhoto.photo.id}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  isSelected && styles.checkedBox
                ]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSummary = () => {
    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Export Summary</Text>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Curation Goal:</Text>
          <Text style={styles.summaryValue}>
            {getGoalDisplayName(curationResult.goal)}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Photos to Export:</Text>
          <Text style={styles.summaryValue}>
            {selectedPhotos.size} photos
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Export Format:</Text>
          <Text style={styles.summaryValue}>
            {exportOptions.format.charAt(0).toUpperCase() + exportOptions.format.slice(1)}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Quality:</Text>
          <Text style={styles.summaryValue}>
            {exportOptions.quality.charAt(0).toUpperCase() + exportOptions.quality.slice(1)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
          >
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Export Curation</Text>
          <TouchableOpacity
            style={[styles.headerButton, styles.exportButton]}
            onPress={handleExport}
            disabled={isExporting || selectedPhotos.size === 0}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={[
                styles.headerButtonText,
                styles.exportButtonText,
                (selectedPhotos.size === 0) && styles.disabledButtonText
              ]}>
                Export
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {renderSummary()}
          {renderExportOptions()}
          {renderPhotoSelection()}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  headerButton: {
    padding: 5
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF'
  },
  exportButton: {
    minWidth: 60,
    alignItems: 'center'
  },
  exportButtonText: {
    fontWeight: '600'
  },
  disabledButtonText: {
    color: '#999'
  },
  content: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    marginBottom: 10
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666'
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  optionsContainer: {
    padding: 20
  },
  optionGroup: {
    marginBottom: 25
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  formatButtons: {
    flexDirection: 'row',
    marginBottom: 8
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center'
  },
  selectedFormatButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  formatButtonText: {
    fontSize: 14,
    color: '#333'
  },
  selectedFormatButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18
  },
  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18
  },
  selectionContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  selectionCount: {
    fontSize: 14,
    color: '#666'
  },
  selectionButtons: {
    flexDirection: 'row',
    marginBottom: 15
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  selectionButtonText: {
    fontSize: 14,
    color: '#333'
  },
  photoList: {
    maxHeight: 300
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  selectedPhotoItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF'
  },
  photoInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  photoRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 15,
    minWidth: 40
  },
  photoDetails: {
    flex: 1
  },
  photoScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  photoId: {
    fontSize: 12,
    color: '#666'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkedBox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});