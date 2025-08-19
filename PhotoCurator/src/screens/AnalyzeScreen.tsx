import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/appStore';
import { aiService } from '../services/ai/AIService';
import { Photo } from '../types';

const { width: screenWidth } = Dimensions.get('window');

export const AnalyzeScreen: React.FC = () => {
  const {
    photos,
    isAnalyzing,
    analysisProgress,
    setAnalyzing,
    setAnalysisProgress,
    updatePhoto,
    setCurrentView,
    incrementAnalyzedCount,
  } = useAppStore();

  const [currentAnalyzingPhoto, setCurrentAnalyzingPhoto] = useState<Photo | null>(null);

  const unanalyzedPhotos = photos.filter(photo => !photo.aiAnalysis?.isAnalyzed);
  const analyzedPhotos = photos.filter(photo => photo.aiAnalysis?.isAnalyzed);

  useEffect(() => {
    // Initialize AI service when component mounts
    initializeAI();
  }, []);

  const initializeAI = async () => {
    try {
      await aiService.initialize();
      console.log('AI Service initialized');
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
    }
  };

  const startAnalysis = async () => {
    if (unanalyzedPhotos.length === 0) return;

    setAnalyzing(true);
    setAnalysisProgress(0);

    try {
      for (let i = 0; i < unanalyzedPhotos.length; i++) {
        const photo = unanalyzedPhotos[i];
        setCurrentAnalyzingPhoto(photo);

        try {
          const analysis = await aiService.analyzePhoto(photo);
          updatePhoto(photo.id, { aiAnalysis: analysis });
          incrementAnalyzedCount();
        } catch (error) {
          console.error(`Failed to analyze photo ${photo.id}:`, error);
          // Continue with next photo
        }

        const progress = (i + 1) / unanalyzedPhotos.length;
        setAnalysisProgress(progress);

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setCurrentAnalyzingPhoto(null);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const proceedToCuration = () => {
    setCurrentView('curate');
  };

  const renderPhotoGrid = (photoList: Photo[], title: string) => {
    if (photoList.length === 0) return null;

    const itemSize = (screenWidth - 60) / 3; // 3 columns with padding

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title} ({photoList.length})</Text>
        <View style={styles.grid}>
          {photoList.slice(0, 9).map((photo) => ( // Show max 9 photos
            <View key={photo.id} style={[styles.gridItem, { width: itemSize, height: itemSize }]}>
              <Image source={{ uri: photo.uri }} style={styles.gridImage} />
              {photo.aiAnalysis?.isAnalyzed && (
                <View style={styles.scoreOverlay}>
                  <Text style={styles.scoreText}>
                    {Math.round((photo.aiAnalysis.overallScore || 0) * 100)}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {photoList.length > 9 && (
            <View style={[styles.gridItem, styles.moreItem, { width: itemSize, height: itemSize }]}>
              <Text style={styles.moreText}>+{photoList.length - 9}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (photos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No Photos to Analyze</Text>
          <Text style={styles.emptyDescription}>
            Import some photos first to start the AI analysis process
          </Text>
          <Button
            title="Go to Import"
            onPress={() => setCurrentView('import')}
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
          <Text style={styles.title}>AI Analysis</Text>
          <Text style={styles.subtitle}>
            Let AI analyze your photos for quality, composition, and content
          </Text>
        </View>

        {isAnalyzing && (
          <View style={styles.analysisStatus}>
            <Text style={styles.analysisTitle}>Analyzing Photos...</Text>
            {currentAnalyzingPhoto && (
              <View style={styles.currentPhoto}>
                <Image 
                  source={{ uri: currentAnalyzingPhoto.uri }} 
                  style={styles.currentPhotoImage} 
                />
                <Text style={styles.currentPhotoName}>
                  {currentAnalyzingPhoto.filename}
                </Text>
              </View>
            )}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${analysisProgress * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(analysisProgress * 100)}%
              </Text>
            </View>
          </View>
        )}

        {!isAnalyzing && (
          <>
            {renderPhotoGrid(analyzedPhotos, 'Analyzed Photos')}
            {renderPhotoGrid(unanalyzedPhotos, 'Pending Analysis')}

            <View style={styles.actions}>
              {unanalyzedPhotos.length > 0 ? (
                <Button
                  title={`Analyze ${unanalyzedPhotos.length} Photos`}
                  onPress={startAnalysis}
                  size="large"
                  style={styles.button}
                />
              ) : (
                <Button
                  title="Proceed to Curation"
                  onPress={proceedToCuration}
                  size="large"
                  style={styles.button}
                />
              )}
            </View>

            {analyzedPhotos.length > 0 && (
              <View style={styles.stats}>
                <Text style={styles.statsTitle}>Analysis Summary</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{analyzedPhotos.length}</Text>
                    <Text style={styles.statLabel}>Analyzed</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {Math.round(
                        analyzedPhotos.reduce((sum, photo) => 
                          sum + (photo.aiAnalysis?.overallScore || 0), 0
                        ) / analyzedPhotos.length * 100
                      )}
                    </Text>
                    <Text style={styles.statLabel}>Avg Score</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {analyzedPhotos.reduce((sum, photo) => 
                        sum + (photo.aiAnalysis?.faceCount || 0), 0
                      )}
                    </Text>
                    <Text style={styles.statLabel}>Faces Found</Text>
                  </View>
                </View>
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
  analysisStatus: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  currentPhoto: {
    alignItems: 'center',
    marginBottom: 24,
  },
  currentPhotoImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
  currentPhotoName: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  scoreOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
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
  moreItem: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  actions: {
    marginBottom: 32,
  },
  button: {
    marginBottom: 16,
  },
  stats: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
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
});