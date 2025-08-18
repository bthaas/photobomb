/**
 * CurationResultsView - Display curation results with ranking explanations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  Alert
} from 'react-native';
import {
  CurationResult,
  RankedPhoto,
  CurationGoal,
  UserFeedback,
  PhotoCluster
} from '../../types';
import { PhotoComparisonView } from './PhotoComparisonView';
import { CurationExportView } from './CurationExportView';

interface CurationResultsViewProps {
  result: CurationResult;
  clusters?: PhotoCluster[];
  onPhotoPress?: (photo: RankedPhoto) => void;
  onFeedback?: (feedback: UserFeedback) => void;
  onExport?: (options: any, photos: RankedPhoto[]) => Promise<void>;
  showRankings?: boolean;
  showReasons?: boolean;
  showComparison?: boolean;
  showExport?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const photoSize = (screenWidth - 60) / 3; // 3 photos per row with margins

export const CurationResultsView: React.FC<CurationResultsViewProps> = ({
  result,
  clusters = [],
  onPhotoPress,
  onFeedback,
  onExport,
  showRankings = true,
  showReasons = true,
  showComparison = true,
  showExport = true
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<RankedPhoto | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [showExportView, setShowExportView] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<PhotoCluster | null>(null);

  const handlePhotoPress = (rankedPhoto: RankedPhoto) => {
    setSelectedPhoto(rankedPhoto);
    setShowDetails(true);
    onPhotoPress?.(rankedPhoto);
  };

  const handleFeedback = (action: 'keep' | 'discard' | 'favorite') => {
    if (!selectedPhoto) return;

    const feedback: UserFeedback = {
      photoId: selectedPhoto.photo.id,
      action,
      context: {
        curationGoal: result.goal,
        originalRank: selectedPhoto.rank,
        originalScore: selectedPhoto.score
      },
      timestamp: new Date()
    };

    onFeedback?.(feedback);
    setShowDetails(false);
    setSelectedPhoto(null);

    // Show feedback confirmation
    const actionText = action === 'favorite' ? 'favorited' : 
                      action === 'keep' ? 'kept' : 'discarded';
    Alert.alert('Feedback Received', `Photo ${actionText}. This will help improve future recommendations.`);
  };

  const handleComparePhotos = (photo: RankedPhoto) => {
    // Find the cluster containing this photo
    const cluster = clusters.find(c => 
      c.photos.some(p => p.id === photo.photo.id)
    );
    
    if (cluster) {
      setSelectedCluster(cluster);
      setShowComparisonView(true);
    } else {
      Alert.alert('Comparison Unavailable', 'Cannot find cluster information for this photo.');
    }
  };

  const handleExport = () => {
    setShowExportView(true);
  };

  const getGoalDisplayName = (goal: CurationGoal): string => {
    switch (goal) {
      case CurationGoal.BEST_SCENIC:
        return 'Best Scenic';
      case CurationGoal.BEST_PORTRAITS:
        return 'Best Portraits';
      case CurationGoal.MOST_CREATIVE:
        return 'Most Creative';
      case CurationGoal.BEST_TECHNICAL:
        return 'Best Technical';
      case CurationGoal.MOST_EMOTIONAL:
        return 'Most Emotional';
      case CurationGoal.BALANCED:
        return 'Balanced';
      default:
        return 'Unknown';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return '#4CAF50'; // Green
    if (score >= 0.6) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const renderPhotoGrid = () => {
    return (
      <View style={styles.photoGrid}>
        {result.selectedPhotos.map((rankedPhoto, index) => (
          <TouchableOpacity
            key={rankedPhoto.photo.id}
            style={styles.photoContainer}
            onPress={() => handlePhotoPress(rankedPhoto)}
          >
            <Image
              source={{ uri: rankedPhoto.photo.uri }}
              style={styles.photo}
              resizeMode="cover"
            />
            
            {showRankings && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{rankedPhoto.rank}</Text>
              </View>
            )}
            
            <View style={[
              styles.scoreBadge,
              { backgroundColor: getScoreColor(rankedPhoto.score) }
            ]}>
              <Text style={styles.scoreText}>
                {(rankedPhoto.score * 100).toFixed(0)}
              </Text>
            </View>

            {/* Enhanced ranking indicators */}
            {rankedPhoto.rank <= 3 && (
              <View style={styles.topRankIndicator}>
                <Text style={styles.topRankText}>
                  {rankedPhoto.rank === 1 ? '🥇' : rankedPhoto.rank === 2 ? '🥈' : '🥉'}
                </Text>
              </View>
            )}

            {showComparison && (
              <TouchableOpacity
                style={styles.compareButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleComparePhotos(rankedPhoto);
                }}
              >
                <Text style={styles.compareButtonText}>⚖️</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {getGoalDisplayName(result.goal)} Curation
          </Text>
          <Text style={styles.subtitle}>
            {result.selectedPhotos.length} of {result.totalPhotos} photos selected
          </Text>
          <Text style={styles.processingTime}>
            Processed in {result.processingTime}ms
          </Text>
        </View>
        
        {showExport && (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
          >
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderWeights = () => {
    return (
      <View style={styles.weightsContainer}>
        <Text style={styles.weightsTitle}>Curation Weights</Text>
        <View style={styles.weightsGrid}>
          <View style={styles.weightItem}>
            <Text style={styles.weightLabel}>Quality</Text>
            <Text style={styles.weightValue}>
              {(result.weights.qualityWeight * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.weightItem}>
            <Text style={styles.weightLabel}>Composition</Text>
            <Text style={styles.weightValue}>
              {(result.weights.compositionWeight * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.weightItem}>
            <Text style={styles.weightLabel}>Content</Text>
            <Text style={styles.weightValue}>
              {(result.weights.contentWeight * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.weightItem}>
            <Text style={styles.weightLabel}>Uniqueness</Text>
            <Text style={styles.weightValue}>
              {(result.weights.uniquenessWeight * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.weightItem}>
            <Text style={styles.weightLabel}>Emotional</Text>
            <Text style={styles.weightValue}>
              {(result.weights.emotionalWeight * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPhotoDetails = () => {
    if (!selectedPhoto) return null;

    return (
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Image
              source={{ uri: selectedPhoto.photo.uri }}
              style={styles.modalPhoto}
              resizeMode="contain"
            />

            <View style={styles.photoInfo}>
              <Text style={styles.photoTitle}>
                Rank #{selectedPhoto.rank} - Score: {(selectedPhoto.score * 100).toFixed(1)}
              </Text>

              <View style={styles.scoreBreakdown}>
                <Text style={styles.breakdownTitle}>Score Breakdown</Text>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Quality:</Text>
                  <Text style={styles.breakdownValue}>
                    {(selectedPhoto.scoreBreakdown.quality * 100).toFixed(1)}
                  </Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Composition:</Text>
                  <Text style={styles.breakdownValue}>
                    {(selectedPhoto.scoreBreakdown.composition * 100).toFixed(1)}
                  </Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Content:</Text>
                  <Text style={styles.breakdownValue}>
                    {(selectedPhoto.scoreBreakdown.content * 100).toFixed(1)}
                  </Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Uniqueness:</Text>
                  <Text style={styles.breakdownValue}>
                    {(selectedPhoto.scoreBreakdown.uniqueness * 100).toFixed(1)}
                  </Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Emotional:</Text>
                  <Text style={styles.breakdownValue}>
                    {(selectedPhoto.scoreBreakdown.emotional * 100).toFixed(1)}
                  </Text>
                </View>
              </View>

              {showReasons && selectedPhoto.reasoning.length > 0 && (
                <View style={styles.reasoningContainer}>
                  <Text style={styles.reasoningTitle}>Why this photo ranked well:</Text>
                  {selectedPhoto.reasoning.map((reason, index) => (
                    <Text key={index} style={styles.reasoningText}>
                      • {reason}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.discardButton]}
              onPress={() => handleFeedback('discard')}
            >
              <Text style={styles.feedbackButtonText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.keepButton]}
              onPress={() => handleFeedback('keep')}
            >
              <Text style={styles.feedbackButtonText}>Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.favoriteButton]}
              onPress={() => handleFeedback('favorite')}
            >
              <Text style={styles.feedbackButtonText}>Favorite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {renderHeader()}
      {renderWeights()}
      {renderPhotoGrid()}
      {renderPhotoDetails()}
      
      {/* Comparison View Modal */}
      {selectedCluster && (
        <Modal
          visible={showComparisonView}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowComparisonView(false)}
        >
          <PhotoComparisonView
            cluster={selectedCluster}
            rankedPhotos={result.selectedPhotos.filter(rp => 
              selectedCluster.photos.some(p => p.id === rp.photo.id)
            )}
            onFeedback={onFeedback}
            onPhotoSelect={onPhotoPress}
            curationGoal={result.goal}
          />
          <TouchableOpacity
            style={styles.closeComparisonButton}
            onPress={() => setShowComparisonView(false)}
          >
            <Text style={styles.closeComparisonText}>Close Comparison</Text>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Export View Modal */}
      {showExport && (
        <CurationExportView
          curationResult={result}
          onExport={onExport}
          visible={showExportView}
          onClose={() => setShowExportView(false)}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5
  },
  processingTime: {
    fontSize: 14,
    color: '#999'
  },
  weightsContainer: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 10
  },
  weightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15
  },
  weightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  weightItem: {
    width: '48%',
    marginBottom: 10
  },
  weightLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  weightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between'
  },
  photoContainer: {
    width: photoSize,
    height: photoSize,
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative'
  },
  photo: {
    width: '100%',
    height: '100%'
  },
  rankBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  rankText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  scoreBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  scoreText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  closeButton: {
    padding: 10
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF'
  },
  modalContent: {
    flex: 1
  },
  modalPhoto: {
    width: '100%',
    height: 300
  },
  photoInfo: {
    padding: 20
  },
  photoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20
  },
  scoreBreakdown: {
    marginBottom: 20
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#666'
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  reasoningContainer: {
    marginTop: 20
  },
  reasoningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  reasoningText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    lineHeight: 22
  },
  feedbackButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  feedbackButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5
  },
  feedbackButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  discardButton: {
    backgroundColor: '#F44336'
  },
  keepButton: {
    backgroundColor: '#4CAF50'
  },
  favoriteButton: {
    backgroundColor: '#FF9800'
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  topRankIndicator: {
    position: 'absolute',
    top: 5,
    left: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2
  },
  topRankText: {
    fontSize: 12
  },
  compareButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  compareButtonText: {
    fontSize: 12
  },
  closeComparisonButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  closeComparisonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});