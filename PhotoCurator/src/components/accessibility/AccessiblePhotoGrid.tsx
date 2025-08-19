import React from 'react';
import { View, FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { Photo } from '../../types/photo';
import { useAccessibility } from './AccessibilityProvider';

interface AccessiblePhotoGridProps {
  photos: Photo[];
  onPhotoPress: (photo: Photo) => void;
  onPhotoLongPress?: (photo: Photo) => void;
}

export const AccessiblePhotoGrid: React.FC<AccessiblePhotoGridProps> = ({
  photos,
  onPhotoPress,
  onPhotoLongPress,
}) => {
  const { isScreenReaderEnabled, announceForAccessibility } = useAccessibility();

  const getPhotoAccessibilityLabel = (photo: Photo, index: number): string => {
    const baseLabel = `Photo ${index + 1} of ${photos.length}`;
    
    if (photo.metadata?.timestamp) {
      const date = new Date(photo.metadata.timestamp).toLocaleDateString();
      return `${baseLabel}, taken on ${date}`;
    }
    
    if (photo.faces && photo.faces.length > 0) {
      const faceCount = photo.faces.length;
      const faceText = faceCount === 1 ? 'person' : 'people';
      return `${baseLabel}, contains ${faceCount} ${faceText}`;
    }
    
    return baseLabel;
  };

  const getPhotoAccessibilityHint = (photo: Photo): string => {
    let hints = ['Double tap to view details'];
    
    if (onPhotoLongPress) {
      hints.push('Long press for more options');
    }
    
    if (photo.qualityScore) {
      const quality = photo.qualityScore.overall > 0.8 ? 'high' : 
                     photo.qualityScore.overall > 0.6 ? 'medium' : 'low';
      hints.push(`Quality: ${quality}`);
    }
    
    return hints.join('. ');
  };

  const handlePhotoPress = (photo: Photo, index: number) => {
    if (isScreenReaderEnabled) {
      announceForAccessibility(`Opening photo ${index + 1}`);
    }
    onPhotoPress(photo);
  };

  const renderPhoto = ({ item: photo, index }: { item: Photo; index: number }) => (
    <Pressable
      style={styles.photoContainer}
      onPress={() => handlePhotoPress(photo, index)}
      onLongPress={() => onPhotoLongPress?.(photo)}
      accessible={true}
      accessibilityRole="imagebutton"
      accessibilityLabel={getPhotoAccessibilityLabel(photo, index)}
      accessibilityHint={getPhotoAccessibilityHint(photo)}
    >
      <View style={styles.photoPlaceholder}>
        <Text style={styles.photoText}>Photo {index + 1}</Text>
        {photo.qualityScore && (
          <Text style={styles.qualityText}>
            Quality: {Math.round(photo.qualityScore.overall * 100)}%
          </Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <FlatList
      data={photos}
      renderItem={renderPhoto}
      numColumns={isScreenReaderEnabled ? 1 : 3}
      key={isScreenReaderEnabled ? 'single' : 'grid'}
      contentContainerStyle={styles.container}
      accessible={false}
      accessibilityLabel={`Photo grid with ${photos.length} photos`}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  photoContainer: {
    flex: 1,
    margin: 4,
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  photoText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  qualityText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});