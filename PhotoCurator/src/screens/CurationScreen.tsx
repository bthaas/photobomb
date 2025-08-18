/**
 * CurationScreen - Main screen for photo curation functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import {
  PhotoCluster,
  CurationGoal,
  CurationWeights,
  CurationResult,
  UserFeedback,
  RankedPhoto
} from '../types';
import { CurationService } from '../services/curation';
import { CurationGoalSelector, CurationResultsView } from '../components/curation';

interface CurationScreenProps {
  clusters: PhotoCluster[];
  onNavigateBack?: () => void;
}

export const CurationScreen: React.FC<CurationScreenProps> = ({
  clusters,
  onNavigateBack
}) => {
  const [curationService] = useState(() => new CurationService());
  const [selectedGoal, setSelectedGoal] = useState<CurationGoal>(CurationGoal.BALANCED);
  const [customWeights, setCustomWeights] = useState<CurationWeights | undefined>();
  const [curationResult, setCurationResult] = useState<CurationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [maxPhotosPerCluster, setMaxPhotosPerCluster] = useState(3);

  useEffect(() => {
    // Auto-curate when component mounts or goal changes
    handleCurate();
  }, [selectedGoal, customWeights, maxPhotosPerCluster]);

  const handleCurate = async () => {
    if (clusters.length === 0) {
      Alert.alert('No Photos', 'No photo clusters available for curation.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await curationService.curatePhotos(
        clusters,
        selectedGoal,
        maxPhotosPerCluster,
        customWeights
      );
      
      setCurationResult(result);
    } catch (error) {
      console.error('Curation failed:', error);
      Alert.alert(
        'Curation Failed',
        'An error occurred while curating photos. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoalChange = (goal: CurationGoal) => {
    setSelectedGoal(goal);
  };

  const handleWeightsChange = (weights: CurationWeights) => {
    setCustomWeights(weights);
  };

  const handleFeedback = async (feedback: UserFeedback) => {
    try {
      await curationService.processFeedback(feedback);
      
      // Show feedback confirmation
      const actionText = feedback.action === 'favorite' ? 'favorited' : 
                        feedback.action === 'keep' ? 'kept' : 'discarded';
      Alert.alert('Feedback Received', `Photo ${actionText}. This will help improve future recommendations.`);
      
      // Optionally re-curate to show updated results
      // handleCurate();
    } catch (error) {
      console.error('Failed to process feedback:', error);
      Alert.alert('Error', 'Failed to process feedback. Please try again.');
    }
  };

  const handlePhotoPress = (rankedPhoto: RankedPhoto) => {
    // Handle photo selection - could navigate to detail view
    console.log('Photo pressed:', rankedPhoto.photo.id);
  };

  const renderStats = () => {
    if (!curationResult) return null;

    const stats = curationService.getCurationStats(curationResult);
    
    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Curation Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(stats.averageScore * 100).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {curationResult.selectedPhotos.length}
            </Text>
            <Text style={styles.statLabel}>Selected</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {curationResult.totalPhotos}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {((curationResult.selectedPhotos.length / curationResult.totalPhotos) * 100).toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Selection Rate</Text>
          </View>
        </View>
        
        {stats.topReasons.length > 0 && (
          <View style={styles.topReasonsContainer}>
            <Text style={styles.topReasonsTitle}>Top Selection Reasons:</Text>
            {stats.topReasons.slice(0, 3).map((reason, index) => (
              <Text key={index} style={styles.topReason}>
                • {reason}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderControls = () => {
    return (
      <View style={styles.controlsContainer}>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Photos per cluster:</Text>
          <View style={styles.controlButtons}>
            {[1, 2, 3, 5].map(count => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.controlButton,
                  maxPhotosPerCluster === count && styles.activeControlButton
                ]}
                onPress={() => setMaxPhotosPerCluster(count)}
              >
                <Text style={[
                  styles.controlButtonText,
                  maxPhotosPerCluster === count && styles.activeControlButtonText
                ]}>
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.recurateButton}
          onPress={handleCurate}
          disabled={isProcessing}
        >
          <Text style={styles.recurateButtonText}>
            {isProcessing ? 'Processing...' : 'Re-curate Photos'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onNavigateBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onNavigateBack}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Photo Curation</Text>
      </View>

      <ScrollView style={styles.content}>
        <CurationGoalSelector
          selectedGoal={selectedGoal}
          onGoalChange={handleGoalChange}
          customWeights={customWeights}
          onWeightsChange={handleWeightsChange}
          showCustomization={true}
        />

        {renderControls()}
        {renderStats()}

        {isProcessing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Curating photos...</Text>
          </View>
        )}

        {curationResult && !isProcessing && (
          <CurationResultsView
            result={curationResult}
            onPhotoPress={handlePhotoPress}
            onFeedback={handleFeedback}
            showRankings={true}
            showReasons={true}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    marginRight: 15
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    flex: 1
  },
  controlsContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  controlLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600'
  },
  controlButtons: {
    flexDirection: 'row'
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9'
  },
  activeControlButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  controlButtonText: {
    fontSize: 14,
    color: '#333'
  },
  activeControlButtonText: {
    color: 'white'
  },
  recurateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  recurateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 14,
    color: '#666'
  },
  topReasonsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  topReasonsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  topReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  }
});