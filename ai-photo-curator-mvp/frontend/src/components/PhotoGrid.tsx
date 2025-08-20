import React from 'react';
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  selectedPhotoIndex?: number;
  onPhotoPress?: (index: number) => void;
}

const { width } = Dimensions.get('window');
const photoSize = (width - 60) / 3; // 3 photos per row with margins

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  selectedPhotoIndex,
  onPhotoPress,
}) => {
  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No photos selected</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.photoContainer,
              selectedPhotoIndex === index && styles.selectedPhoto,
            ]}
            onPress={() => onPhotoPress?.(index)}
            disabled={!onPhotoPress}
          >
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            {selectedPhotoIndex === index && (
              <View style={styles.selectedOverlay}>
                <Text style={styles.selectedText}>✓ BEST SHOT</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
  },
  photoContainer: {
    width: photoSize,
    height: photoSize,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectedPhoto: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  selectedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  selectedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});