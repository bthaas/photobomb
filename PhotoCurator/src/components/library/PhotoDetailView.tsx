import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { Photo, Face } from '../../types';

interface PhotoDetailViewProps {
  photo: Photo;
  visible: boolean;
  onClose: () => void;
  onEdit?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  onShare?: (photo: Photo) => void;
}

interface ScoreBarProps {
  label: string;
  score: number;
  color?: string;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ label, score, color = '#007AFF' }) => {
  const percentage = Math.round(score * 100);
  
  return (
    <View style={styles.scoreContainer}>
      <View style={styles.scoreHeader}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.scoreValue}>{percentage}%</Text>
      </View>
      <View style={styles.scoreBarBackground}>
        <View 
          style={[
            styles.scoreBarFill, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
};

export const PhotoDetailView: React.FC<PhotoDetailViewProps> = ({
  photo,
  visible,
  onClose,
  onEdit,
  onDelete,
  onShare,
}) => {
  const [showFullMetadata, setShowFullMetadata] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare(photo);
    } else {
      try {
        await Share.share({
          url: photo.uri,
          message: `Photo taken on ${photo.createdAt.toLocaleDateString()}`,
        });
      } catch (error) {
        console.error('Error sharing photo:', error);
      }
    }
  }, [photo, onShare]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(photo),
        },
      ]
    );
  }, [photo, onDelete]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return '#34C759'; // Green
    if (score >= 0.6) return '#FF9500'; // Orange
    return '#FF3B30'; // Red
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Photo Details</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            
            {onEdit && (
              <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(photo)}>
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Photo */}
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: photo.uri }}
              style={[
                styles.photo,
                {
                  width: screenWidth - 32,
                  height: (screenWidth - 32) * (photo.metadata.height / photo.metadata.width),
                  maxHeight: screenHeight * 0.4,
                }
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date Taken</Text>
              <Text style={styles.infoValue}>{formatDate(photo.createdAt)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dimensions</Text>
              <Text style={styles.infoValue}>
                {photo.metadata.width} × {photo.metadata.height}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>File Size</Text>
              <Text style={styles.infoValue}>{formatFileSize(photo.metadata.fileSize)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Format</Text>
              <Text style={styles.infoValue}>{photo.metadata.format.toUpperCase()}</Text>
            </View>

            {photo.metadata.location && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {photo.metadata.location.latitude.toFixed(6)}, {photo.metadata.location.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>

          {/* AI Analysis Results */}
          {(photo.qualityScore || photo.compositionScore || photo.contentScore) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Analysis</Text>
              
              {photo.qualityScore && (
                <View style={styles.analysisGroup}>
                  <Text style={styles.analysisGroupTitle}>Quality Analysis</Text>
                  <ScoreBar 
                    label="Overall Quality" 
                    score={photo.qualityScore.overall}
                    color={getQualityColor(photo.qualityScore.overall)}
                  />
                  <ScoreBar label="Sharpness" score={photo.qualityScore.sharpness} />
                  <ScoreBar label="Exposure" score={photo.qualityScore.exposure} />
                  <ScoreBar label="Color Balance" score={photo.qualityScore.colorBalance} />
                  <ScoreBar label="Noise Level" score={1 - photo.qualityScore.noise} />
                </View>
              )}

              {photo.compositionScore && (
                <View style={styles.analysisGroup}>
                  <Text style={styles.analysisGroupTitle}>Composition Analysis</Text>
                  <ScoreBar label="Overall Composition" score={photo.compositionScore.overall} />
                  <ScoreBar label="Rule of Thirds" score={photo.compositionScore.ruleOfThirds} />
                  <ScoreBar label="Leading Lines" score={photo.compositionScore.leadingLines} />
                  <ScoreBar label="Symmetry" score={photo.compositionScore.symmetry} />
                  <ScoreBar label="Subject Placement" score={photo.compositionScore.subjectPlacement} />
                </View>
              )}

              {photo.contentScore && (
                <View style={styles.analysisGroup}>
                  <Text style={styles.analysisGroupTitle}>Content Analysis</Text>
                  <ScoreBar label="Overall Content" score={photo.contentScore.overall} />
                  <ScoreBar label="Face Quality" score={photo.contentScore.faceQuality} />
                  <ScoreBar label="Emotional Sentiment" score={photo.contentScore.emotionalSentiment} />
                  <ScoreBar label="Interestingness" score={photo.contentScore.interestingness} />
                </View>
              )}
            </View>
          )}

          {/* Faces */}
          {photo.faces && photo.faces.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detected Faces ({photo.faces.length})</Text>
              
              {photo.faces.map((face, index) => (
                <View key={face.id} style={styles.faceInfo}>
                  <Text style={styles.faceTitle}>Face {index + 1}</Text>
                  <View style={styles.faceDetails}>
                    <Text style={styles.faceDetail}>
                      Confidence: {Math.round(face.confidence * 100)}%
                    </Text>
                    {face.attributes.age && (
                      <Text style={styles.faceDetail}>Age: ~{face.attributes.age}</Text>
                    )}
                    {face.attributes.gender && (
                      <Text style={styles.faceDetail}>Gender: {face.attributes.gender}</Text>
                    )}
                    {face.attributes.emotion && (
                      <Text style={styles.faceDetail}>Emotion: {face.attributes.emotion}</Text>
                    )}
                    {face.attributes.smile !== undefined && (
                      <Text style={styles.faceDetail}>
                        Smile: {Math.round(face.attributes.smile * 100)}%
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Detected Objects and Scenes */}
          {photo.features && (photo.features.objects.length > 0 || photo.features.scenes.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detected Content</Text>
              
              {photo.features.objects.length > 0 && (
                <View style={styles.contentGroup}>
                  <Text style={styles.contentGroupTitle}>Objects</Text>
                  <View style={styles.tagContainer}>
                    {photo.features.objects.map((obj, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>
                          {obj.label} ({Math.round(obj.confidence * 100)}%)
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {photo.features.scenes.length > 0 && (
                <View style={styles.contentGroup}>
                  <Text style={styles.contentGroupTitle}>Scenes</Text>
                  <View style={styles.tagContainer}>
                    {photo.features.scenes.map((scene, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>
                          {scene.label} ({Math.round(scene.confidence * 100)}%)
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* EXIF Data */}
          {photo.metadata.exif && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowFullMetadata(!showFullMetadata)}
              >
                <Text style={styles.sectionTitle}>Camera Settings</Text>
                <Text style={styles.expandIcon}>
                  {showFullMetadata ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              
              {showFullMetadata && (
                <View style={styles.exifContainer}>
                  {photo.metadata.exif.make && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Camera</Text>
                      <Text style={styles.infoValue}>
                        {photo.metadata.exif.make} {photo.metadata.exif.model}
                      </Text>
                    </View>
                  )}
                  
                  {photo.metadata.exif.exposureTime && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Exposure</Text>
                      <Text style={styles.infoValue}>1/{Math.round(1/photo.metadata.exif.exposureTime)}s</Text>
                    </View>
                  )}
                  
                  {photo.metadata.exif.fNumber && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Aperture</Text>
                      <Text style={styles.infoValue}>f/{photo.metadata.exif.fNumber}</Text>
                    </View>
                  )}
                  
                  {photo.metadata.exif.iso && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>ISO</Text>
                      <Text style={styles.infoValue}>{photo.metadata.exif.iso}</Text>
                    </View>
                  )}
                  
                  {photo.metadata.exif.focalLength && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Focal Length</Text>
                      <Text style={styles.infoValue}>{photo.metadata.exif.focalLength}mm</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Delete Button */}
          {onDelete && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  photo: {
    borderRadius: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  expandIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  analysisGroup: {
    marginBottom: 20,
  },
  analysisGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scoreContainer: {
    marginBottom: 12,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  scoreBarBackground: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  faceInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  faceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faceDetails: {
    gap: 4,
  },
  faceDetail: {
    fontSize: 14,
    color: '#666',
  },
  contentGroup: {
    marginBottom: 16,
  },
  contentGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  exifContainer: {
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhotoDetailView;