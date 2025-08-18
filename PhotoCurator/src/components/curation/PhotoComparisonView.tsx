/**
 * PhotoComparisonView - Component for comparing similar photos in clusters
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
  Modal
} from 'react-native';
import {
  RankedPhoto,
  PhotoCluster,
  UserFeedback,
  CurationGoal
} from '../../types';

interface PhotoComparisonViewProps {
  cluster: PhotoCluster;
  rankedPhotos: RankedPhoto[];
  onFeedback?: (feedback: UserFeedback) => void;
  onPhotoSelect?: (photo: RankedPhoto) => void;
  curationGoal: CurationGoal;
}

const { width: screenWidth } = Dimensions.get('window');
const photoWidth = screenWidth - 40;
const thumbnailSize = 80;

export const PhotoComparisonView: React.FC<PhotoComparisonViewProps> = ({
  cluster,
  rankedPhotos,
  onFeedback,
  onPhotoSelect,
  curationGoal
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPhotos, setComparisonPhotos] = useState<RankedPhoto[]>([]);

  const selectedPhoto = rankedPhotos[selectedPhotoIndex];

  const handlePhotoSelect = (index: number) => {
    setSelectedPhotoIndex(index);
    onPhotoSelect?.(rankedPhotos[index]);
  };

  const handleComparePhotos = () => {
    // Select top 3 photos for comparison
    const topPhotos = rankedPhotos.slice(0, Math.min(3, rankedPhotos.length));
    setComparisonPhotos(topPhotos);
    setShowComparison(true);
  };

  const handleFeedback = (action: 'keep' | 'discard' | 'favorite', photo: RankedPhoto) => {
    const feedback: UserFeedback = {
      photoId: photo.photo.id,
      action,
      context: {
        clusterId: cluster.id,
        curationGoal,
        originalRank: photo.rank,
        originalScore: photo.score
      },
      timestamp: new Date()
    };

    onFeedback?.(feedback);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return '#4CAF50';
    if (score >= 0.6) return '#FF9800';
    return '#F44336';
  };

  const renderThumbnailStrip = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.thumbnailStrip}
        contentContainerStyle={styles.thumbnailContainer}
      >
        {rankedPhotos.map((rankedPhoto, index) => (
          <TouchableOpacity
            key={rankedPhoto.photo.id}
            style={[
              styles.thumbnail,
              selectedPhotoIndex === index && styles.selectedThumbnail
            ]}
            onPress={() => handlePhotoSelect(index)}
          >
            <Image
              source={{ uri: rankedPhoto.photo.uri }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            <View style={styles.thumbnailRank}>
              <Text style={styles.thumbnailRankText}>#{rankedPhoto.rank}</Text>
            </View>
            <View style={[
              styles.thumbnailScore,
              { backgroundColor: getScoreColor(rankedPhoto.score) }
            ]}>
              <Text style={styles.thumbnailScoreText}>
                {(rankedPhoto.score * 100).toFixed(0)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderMainPhoto = () => {
    if (!selectedPhoto) return null;

    return (
      <View style={styles.mainPhotoContainer}>
        <Image
          source={{ uri: selectedPhoto.photo.uri }}
          style={styles.mainPhoto}
          resizeMode="contain"
        />
        
        <View style={styles.photoInfo}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoTitle}>
              Rank #{selectedPhoto.rank} - Score: {(selectedPhoto.score * 100).toFixed(1)}
            </Text>
            <TouchableOpacity
              style={styles.compareButton}
              onPress={handleComparePhotos}
            >
              <Text style={styles.compareButtonText}>Compare Top 3</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scoreBreakdown}>
            <Text style={styles.breakdownTitle}>Score Breakdown</Text>
            <View style={styles.scoreGrid}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Quality</Text>
                <Text style={styles.scoreValue}>
                  {(selectedPhoto.scoreBreakdown.quality * 100).toFixed(1)}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Composition</Text>
                <Text style={styles.scoreValue}>
                  {(selectedPhoto.scoreBreakdown.composition * 100).toFixed(1)}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Content</Text>
                <Text style={styles.scoreValue}>
                  {(selectedPhoto.scoreBreakdown.content * 100).toFixed(1)}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Uniqueness</Text>
                <Text style={styles.scoreValue}>
                  {(selectedPhoto.scoreBreakdown.uniqueness * 100).toFixed(1)}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Emotional</Text>
                <Text style={styles.scoreValue}>
                  {(selectedPhoto.scoreBreakdown.emotional * 100).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>

          {selectedPhoto.reasoning.length > 0 && (
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

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.discardButton]}
            onPress={() => handleFeedback('discard', selectedPhoto)}
          >
            <Text style={styles.actionButtonText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.keepButton]}
            onPress={() => handleFeedback('keep', selectedPhoto)}
          >
            <Text style={styles.actionButtonText}>Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.favoriteButton]}
            onPress={() => handleFeedback('favorite', selectedPhoto)}
          >
            <Text style={styles.actionButtonText}>Favorite</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderComparisonModal = () => {
    return (
      <Modal
        visible={showComparison}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowComparison(false)}
      >
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowComparison(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.comparisonTitle}>Photo Comparison</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.comparisonContent}>
            <Text style={styles.comparisonSubtitle}>
              Top {comparisonPhotos.length} photos from this cluster
            </Text>

            {comparisonPhotos.map((rankedPhoto, index) => (
              <View key={rankedPhoto.photo.id} style={styles.comparisonItem}>
                <View style={styles.comparisonPhotoContainer}>
                  <Image
                    source={{ uri: rankedPhoto.photo.uri }}
                    style={styles.comparisonPhoto}
                    resizeMode="contain"
                  />
                  <View style={styles.comparisonRank}>
                    <Text style={styles.comparisonRankText}>#{rankedPhoto.rank}</Text>
                  </View>
                </View>

                <View style={styles.comparisonDetails}>
                  <Text style={styles.comparisonScore}>
                    Score: {(rankedPhoto.score * 100).toFixed(1)}
                  </Text>
                  
                  <View style={styles.comparisonScoreGrid}>
                    <View style={styles.comparisonScoreItem}>
                      <Text style={styles.comparisonScoreLabel}>Quality</Text>
                      <Text style={styles.comparisonScoreValue}>
                        {(rankedPhoto.scoreBreakdown.quality * 100).toFixed(0)}
                      </Text>
                    </View>
                    <View style={styles.comparisonScoreItem}>
                      <Text style={styles.comparisonScoreLabel}>Composition</Text>
                      <Text style={styles.comparisonScoreValue}>
                        {(rankedPhoto.scoreBreakdown.composition * 100).toFixed(0)}
                      </Text>
                    </View>
                    <View style={styles.comparisonScoreItem}>
                      <Text style={styles.comparisonScoreLabel}>Content</Text>
                      <Text style={styles.comparisonScoreValue}>
                        {(rankedPhoto.scoreBreakdown.content * 100).toFixed(0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.comparisonActions}>
                    <TouchableOpacity
                      style={[styles.comparisonActionButton, styles.discardButton]}
                      onPress={() => handleFeedback('discard', rankedPhoto)}
                    >
                      <Text style={styles.comparisonActionText}>Discard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.comparisonActionButton, styles.keepButton]}
                      onPress={() => handleFeedback('keep', rankedPhoto)}
                    >
                      <Text style={styles.comparisonActionText}>Keep</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.comparisonActionButton, styles.favoriteButton]}
                      onPress={() => handleFeedback('favorite', rankedPhoto)}
                    >
                      <Text style={styles.comparisonActionText}>Favorite</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Cluster: {cluster.label || `${cluster.type} Group`}
        </Text>
        <Text style={styles.subtitle}>
          {rankedPhotos.length} photos • Confidence: {(cluster.confidence * 100).toFixed(0)}%
        </Text>
      </View>

      {renderThumbnailStrip()}
      {renderMainPhoto()}
      {renderComparisonModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  thumbnailStrip: {
    backgroundColor: 'white',
    paddingVertical: 15
  },
  thumbnailContainer: {
    paddingHorizontal: 15
  },
  thumbnail: {
    width: thumbnailSize,
    height: thumbnailSize,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedThumbnail: {
    borderColor: '#007AFF'
  },
  thumbnailImage: {
    width: '100%',
    height: '100%'
  },
  thumbnailRank: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  thumbnailRankText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  thumbnailScore: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1
  },
  thumbnailScoreText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold'
  },
  mainPhotoContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 10
  },
  mainPhoto: {
    width: photoWidth,
    height: 300,
    alignSelf: 'center',
    marginVertical: 20
  },
  photoInfo: {
    padding: 20
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  compareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  compareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  scoreBreakdown: {
    marginBottom: 20
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  scoreItem: {
    width: '48%',
    marginBottom: 10
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  reasoningContainer: {
    marginTop: 10
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  reasoningText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5
  },
  actionButtonText: {
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
  comparisonContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  closeButton: {
    padding: 5
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF'
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  placeholder: {
    width: 50
  },
  comparisonContent: {
    flex: 1
  },
  comparisonSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20
  },
  comparisonItem: {
    marginBottom: 30,
    paddingHorizontal: 20
  },
  comparisonPhotoContainer: {
    position: 'relative',
    marginBottom: 15
  },
  comparisonPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8
  },
  comparisonRank: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  comparisonRankText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  comparisonDetails: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8
  },
  comparisonScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center'
  },
  comparisonScoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15
  },
  comparisonScoreItem: {
    alignItems: 'center'
  },
  comparisonScoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  comparisonScoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  comparisonActions: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  comparisonActionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80
  },
  comparisonActionText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: 'white'
  }
});