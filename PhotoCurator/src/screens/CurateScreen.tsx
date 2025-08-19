import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/appStore';
import { curationEngine } from '../services/ai/CurationEngine';
import { Photo, CurationGoal } from '../types';

const { width: screenWidth } = Dimensions.get('window');

export const CurateScreen: React.FC = () => {
  const {
    photos,
    preferences,
    selectedPhotos,
    togglePhotoSelection,
    clearSelection,
    setCurrentView,
  } = useAppStore();

  const [curatedPhotos, setCuratedPhotos] = useState<Photo[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<CurationGoal>(
    preferences.curationGoals.find(g => g.id === preferences.defaultGoalId) ||
    preferences.curationGoals[0]
  );
  const [isCurating, setIsCurating] = useState(false);

  const analyzedPhotos = photos.filter(photo => photo.aiAnalysis?.isAnalyzed);

  useEffect(() => {
    if (analyzedPhotos.length > 0) {
      startCuration();
    }
  }, [selectedGoal, analyzedPhotos.length]);

  const startCuration = async () => {
    if (analyzedPhotos.length === 0) return;

    setIsCurating(true);
    try {
      const curated = await curationEngine.curatePhotos(
        analyzedPhotos,
        selectedGoal,
        Math.min(20, Math.ceil(analyzedPhotos.length * 0.3)) // Max 20 or 30% of photos
      );
      setCuratedPhotos(curated);
    } catch (error) {
      console.error('Curation failed:', error);
      Alert.alert('Curation Failed', 'Failed to curate photos. Please try again.');
    } finally {
      setIsCurating(false);
    }
  };

  const handleGoalChange = (goal: CurationGoal) => {
    setSelectedGoal(goal);
    clearSelection();
  };

  const proceedToReview = () => {
    if (selectedPhotos.length === 0) {
      Alert.alert(
        'No Photos Selected',
        'Please select at least one photo to proceed to review.',
        [{ text: 'OK' }]
      );
      return;
    }
    setCurrentView('review');
  };

  const selectAllCurated = () => {
    curatedPhotos.forEach(photo => {
      if (!selectedPhotos.includes(photo.id)) {
        togglePhotoSelection(photo.id);
      }
    });
  };

  const renderGoalSelector = () => (
    <View style={styles.goalSelector}>
      <Text style={styles.sectionTitle}>Curation Goal</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {preferences.curationGoals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
              selectedGoal.id === goal.id && styles.goalCardSelected,
            ]}
            onPress={() => handleGoalChange(goal)}
          >
            <Text style={[
              styles.goalTitle,
              selectedGoal.id === goal.id && styles.goalTitleSelected,
            ]}>
              {goal.name}
            </Text>
            <Text style={[
              styles.goalDescription,
              selectedGoal.id === goal.id && styles.goalDescriptionSelected,
            ]}>
              {goal.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPhotoGrid = () => {
    if (curatedPhotos.length === 0) return null;

    const itemSize = (screenWidth - 60) / 2; // 2 columns with padding

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Curated Selection ({curatedPhotos.length})
          </Text>
          <TouchableOpacity onPress={selectAllCurated}>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.grid}>
          {curatedPhotos.map((photo) => {
            const isSelected = selectedPhotos.includes(photo.id);
            return (
              <TouchableOpacity
                key={photo.id}
                style={[
                  styles.gridItem,
                  { width: itemSize, height: itemSize },
                  isSelected && styles.gridItemSelected,
                ]}
                onPress={() => togglePhotoSelection(photo.id)}
              >
                <Image source={{ uri: photo.uri }} style={styles.gridImage} />
                
                {/* Score overlay */}
                <View style={styles.scoreOverlay}>
                  <Text style={styles.scoreText}>
                    {Math.round((photo.aiAnalysis?.overallScore || 0) * 100)}
                  </Text>
                </View>

                {/* Selection indicator */}
                {isSelected && (
                  <View style={styles.selectionOverlay}>
                    <View style={styles.selectionIndicator}>
                      <Text style={styles.selectionCheckmark}>✓</Text>
                    </View>
                  </View>
                )}

                {/* Photo info */}
                <View style={styles.photoInfo}>
                  <Text style={styles.photoFilename} numberOfLines={1}>
                    {photo.filename}
                  </Text>
                  {photo.aiAnalysis && (
                    <View style={styles.photoStats}>
                      {photo.aiAnalysis.faceCount > 0 && (
                        <Text style={styles.photoStat}>
                          👥 {photo.aiAnalysis.faceCount}
                        </Text>
                      )}
                      <Text style={styles.photoStat}>
                        📐 {photo.width}×{photo.height}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (analyzedPhotos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧠</Text>
          <Text style={styles.emptyTitle}>No Analyzed Photos</Text>
          <Text style={styles.emptyDescription}>
            Analyze your photos first to start the curation process
          </Text>
          <Button
            title="Go to Analysis"
            onPress={() => setCurrentView('analyze')}
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
          <Text style={styles.title}>Smart Curation</Text>
          <Text style={styles.subtitle}>
            AI has selected the best photos based on your chosen criteria
          </Text>
        </View>

        {renderGoalSelector()}

        {isCurating ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingIcon}>✨</Text>
            <Text style={styles.loadingTitle}>Curating Your Photos...</Text>
            <Text style={styles.loadingDescription}>
              AI is analyzing {analyzedPhotos.length} photos to find the best ones
            </Text>
          </View>
        ) : (
          <>
            {renderPhotoGrid()}

            {curatedPhotos.length > 0 && (
              <View style={styles.actions}>
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionText}>
                    {selectedPhotos.length} of {curatedPhotos.length} photos selected
                  </Text>
                </View>

                <Button
                  title="Proceed to Review"
                  onPress={proceedToReview}
                  disabled={selectedPhotos.length === 0}
                  size="large"
                  style={styles.button}
                />

                <Button
                  title="Clear Selection"
                  onPress={clearSelection}
                  variant="outline"
                  size="medium"
                />
              </View>
            )}
          </>
        )}
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
  goalSelector: {
    marginBottom: 32,
  },
  goalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  goalTitleSelected: {
    color: '#007AFF',
  },
  goalDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  goalDescriptionSelected: {
    color: '#66A3FF',
  },
  loadingState: {
    alignItems: 'center',
    padding: 40,
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  loadingDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  selectAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridItemSelected: {
    borderColor: '#007AFF',
  },
  gridImage: {
    width: '100%',
    height: '70%',
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
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheckmark: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  photoInfo: {
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
    marginBottom: 2,
  },
  photoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoStat: {
    fontSize: 10,
    color: '#8E8E93',
  },
  actions: {
    marginTop: 20,
  },
  selectionInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectionText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  button: {
    marginBottom: 12,
  },
});