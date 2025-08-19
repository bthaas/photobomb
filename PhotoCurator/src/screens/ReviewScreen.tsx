import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/appStore';

const { width: screenWidth } = Dimensions.get('window');

export const ReviewScreen: React.FC = () => {
  const {
    photos,
    selectedPhotos,
    togglePhotoSelection,
    clearSelection,
    setCurrentView,
  } = useAppStore();

  const selectedPhotoObjects = photos.filter(photo => 
    selectedPhotos.includes(photo.id)
  );

  const exportPhotos = async () => {
    if (selectedPhotoObjects.length === 0) {
      Alert.alert('No Photos Selected', 'Please select photos to export.');
      return;
    }

    try {
      // In a real app, this would save photos to the device or export them
      Alert.alert(
        'Export Complete',
        `Successfully exported ${selectedPhotoObjects.length} curated photos!`,
        [
          {
            text: 'Start New Curation',
            onPress: () => {
              clearSelection();
              setCurrentView('import');
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Failed to export photos. Please try again.');
    }
  };

  const shareSelection = async () => {
    try {
      await Share.share({
        message: `I curated ${selectedPhotoObjects.length} amazing photos using AI Photo Curator! 📸✨`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const renderPhotoGrid = () => {
    const itemSize = (screenWidth - 60) / 2; // 2 columns with padding

    return (
      <View style={styles.grid}>
        {selectedPhotoObjects.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            style={[styles.gridItem, { width: itemSize, height: itemSize }]}
            onPress={() => togglePhotoSelection(photo.id)}
          >
            <Image source={{ uri: photo.uri }} style={styles.gridImage} />
            
            {/* Quality score */}
            <View style={styles.scoreOverlay}>
              <Text style={styles.scoreText}>
                {Math.round((photo.aiAnalysis?.overallScore || 0) * 100)}
              </Text>
            </View>

            {/* Photo details */}
            <View style={styles.photoDetails}>
              <Text style={styles.photoFilename} numberOfLines={1}>
                {photo.filename}
              </Text>
              <View style={styles.photoMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Quality</Text>
                  <Text style={styles.metricValue}>
                    {Math.round((photo.aiAnalysis?.overallScore || 0) * 100)}%
                  </Text>
                </View>
                {photo.aiAnalysis && photo.aiAnalysis.faceCount > 0 && (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Faces</Text>
                    <Text style={styles.metricValue}>
                      {photo.aiAnalysis.faceCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Remove button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => togglePhotoSelection(photo.id)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStats = () => {
    if (selectedPhotoObjects.length === 0) return null;

    const averageScore = selectedPhotoObjects.reduce(
      (sum, photo) => sum + (photo.aiAnalysis?.overallScore || 0),
      0
    ) / selectedPhotoObjects.length;

    const totalFaces = selectedPhotoObjects.reduce(
      (sum, photo) => sum + (photo.aiAnalysis?.faceCount || 0),
      0
    );

    const landscapeCount = selectedPhotoObjects.filter(
      photo => photo.width > photo.height
    ).length;

    const portraitCount = selectedPhotoObjects.length - landscapeCount;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Selection Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{selectedPhotoObjects.length}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round(averageScore * 100)}%
            </Text>
            <Text style={styles.statLabel}>Avg Quality</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalFaces}</Text>
            <Text style={styles.statLabel}>Total Faces</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{landscapeCount}</Text>
            <Text style={styles.statLabel}>Landscape</Text>
          </View>
        </View>
      </View>
    );
  };

  if (selectedPhotoObjects.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Photos to Review</Text>
          <Text style={styles.emptyDescription}>
            Select some photos from the curation screen to review them here
          </Text>
          <Button
            title="Go to Curation"
            onPress={() => setCurrentView('curate')}
            style={styles.emptyButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Final Review</Text>
          <Text style={styles.subtitle}>
            Review your curated selection and make final adjustments
          </Text>
        </View>

        {renderStats()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selected Photos ({selectedPhotoObjects.length})
          </Text>
          {renderPhotoGrid()}
        </View>

        <View style={styles.actions}>
          <Button
            title="Export Photos"
            onPress={exportPhotos}
            size="large"
            style={styles.button}
          />

          <Button
            title="Share Selection"
            onPress={shareSelection}
            variant="secondary"
            size="medium"
            style={styles.button}
          />

          <Button
            title="Back to Curation"
            onPress={() => setCurrentView('curate')}
            variant="outline"
            size="medium"
          />
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>💡 Export Tips</Text>
          <Text style={styles.tip}>
            • Photos will be saved to your device's photo library
          </Text>
          <Text style={styles.tip}>
            • Original quality is preserved during export
          </Text>
          <Text style={styles.tip}>
            • You can share your curation results with friends
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    minWidth: 200,
  },
  statsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  gridImage: {
    width: '100%',
    height: '60%',
    resizeMode: 'cover',
  },
  scoreOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  photoDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
  },
  photoFilename: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 4,
  },
  photoMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  actions: {
    marginBottom: 32,
  },
  button: {
    marginBottom: 12,
  },
  tips: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  tip: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    lineHeight: 20,
  },
});