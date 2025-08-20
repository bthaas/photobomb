import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoAnalysisService } from '../services/api';
import { Photo, AnalysisResult } from '../types';

export const HomeScreen: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const selectPhotos = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      selectionLimit: 20,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets) {
        const selectedPhotos: Photo[] = response.assets.map((asset) => ({
          uri: asset.uri!,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          type: asset.type,
        }));

        setPhotos(selectedPhotos);
        setAnalysisResult(null); // Reset previous results
      }
    });
  };

  const analyzePhotos = async () => {
    if (photos.length < 2) {
      Alert.alert('Error', 'Please select at least 2 photos to compare');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await PhotoAnalysisService.analyzePhotos(photos);
      setAnalysisResult(result);
      
      Alert.alert(
        'Analysis Complete! 🎉',
        `AI selected photo ${result.bestPhotoIndex + 1} as the best shot.\n\n${result.reasoning}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetSelection = () => {
    setPhotos([]);
    setAnalysisResult(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <View style={styles.header}>
        <Text style={styles.title}>📸 AI Photo Curator</Text>
        <Text style={styles.subtitle}>Select your best shot with AI</Text>
      </View>

      <View style={styles.content}>
        {photos.length > 0 ? (
          <>
            <PhotoGrid
              photos={photos}
              selectedPhotoIndex={analysisResult?.bestPhotoIndex}
              onPhotoPress={(index) => {
                if (analysisResult) {
                  Alert.alert(
                    'Photo Info',
                    index === analysisResult.bestPhotoIndex
                      ? `✓ This is the AI-selected best photo!\n\n${analysisResult.reasoning}`
                      : 'This photo was not selected as the best shot.',
                    [{ text: 'OK' }]
                  );
                }
              }}
            />
            
            <View style={styles.stats}>
              <Text style={styles.statsText}>
                {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
              </Text>
              {analysisResult && (
                <Text style={styles.resultText}>
                  ✓ Best shot: Photo {analysisResult.bestPhotoIndex + 1}
                </Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Select multiple photos to get started
            </Text>
            <Text style={styles.placeholderSubtext}>
              AI will analyze and pick the best one
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {photos.length === 0 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={selectPhotos}>
            <Text style={styles.primaryButtonText}>Select Photos</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetSelection}>
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </TouchableOpacity>
            
            {!analysisResult && (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
                onPress={analyzePhotos}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.primaryButtonText}>Analyzing...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Find Best Shot</Text>
                )}
              </TouchableOpacity>
            )}
            
            {analysisResult && (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
                onPress={selectPhotos}
              >
                <Text style={styles.primaryButtonText}>Select New Photos</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  stats: {
    padding: 20,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  secondaryButtonText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});