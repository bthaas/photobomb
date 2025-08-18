/**
 * ClusteringDemoScreen - Demo screen to showcase clustering functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { ClusterManagementScreen } from '../components/clustering/ClusterManagementScreen';
import { ClusteringService } from '../services/clustering/ClusteringService';
import { Photo, PhotoCluster, ClusterType } from '../types';

export const ClusteringDemoScreen: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [clusters, setClusters] = useState<PhotoCluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate mock photos for demo
  const generateMockPhotos = (): Photo[] => {
    const baseTime = new Date('2023-06-15T10:00:00Z');
    const mockPhotos: Photo[] = [];

    // Wedding photos (similar features, same time/location)
    for (let i = 0; i < 5; i++) {
      mockPhotos.push({
        id: `wedding_${i}`,
        uri: `https://picsum.photos/400/300?random=${i + 1}`,
        metadata: {
          width: 400,
          height: 300,
          fileSize: 150000,
          format: 'jpeg',
          timestamp: new Date(baseTime.getTime() + i * 15 * 60 * 1000),
          location: { latitude: 40.7128 + i * 0.0001, longitude: -74.0060 + i * 0.0001 }
        },
        features: {
          embedding: [0.8 + i * 0.02, 0.7 + i * 0.01, 0.9 + i * 0.01], // Similar embeddings
          dominantColors: [
            { r: 255, g: 240, b: 245, hex: '#FFF0F5', percentage: 0.4 },
            { r: 139, g: 69, b: 19, hex: '#8B4513', percentage: 0.6 }
          ],
          objects: [{ label: 'person', confidence: 0.9, boundingBox: { x: 100, y: 50, width: 200, height: 200 } }],
          scenes: [{ label: 'wedding', confidence: 0.95 }]
        },
        syncStatus: 'local_only' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Vacation photos (different features, different time/location)
    for (let i = 0; i < 4; i++) {
      mockPhotos.push({
        id: `vacation_${i}`,
        uri: `https://picsum.photos/400/300?random=${i + 10}`,
        metadata: {
          width: 400,
          height: 300,
          fileSize: 180000,
          format: 'jpeg',
          timestamp: new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000 + i * 30 * 60 * 1000),
          location: { latitude: 25.7617 + i * 0.001, longitude: -80.1918 + i * 0.001 }
        },
        features: {
          embedding: [0.2 + i * 0.05, 0.8 + i * 0.02, 0.3 + i * 0.03], // Different embeddings
          dominantColors: [
            { r: 0, g: 191, b: 255, hex: '#00BFFF', percentage: 0.7 },
            { r: 255, g: 215, b: 0, hex: '#FFD700', percentage: 0.3 }
          ],
          objects: [{ label: 'beach', confidence: 0.85, boundingBox: { x: 0, y: 100, width: 400, height: 200 } }],
          scenes: [{ label: 'outdoor', confidence: 0.9 }]
        },
        syncStatus: 'local_only' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Random photos (dissimilar)
    for (let i = 0; i < 3; i++) {
      mockPhotos.push({
        id: `random_${i}`,
        uri: `https://picsum.photos/400/300?random=${i + 20}`,
        metadata: {
          width: 400,
          height: 300,
          fileSize: 120000,
          format: 'jpeg',
          timestamp: new Date(baseTime.getTime() + (14 + i * 7) * 24 * 60 * 60 * 1000),
        },
        features: {
          embedding: [Math.random(), Math.random(), Math.random()], // Random embeddings
          dominantColors: [
            { r: Math.floor(Math.random() * 255), g: Math.floor(Math.random() * 255), b: Math.floor(Math.random() * 255), hex: '#000000', percentage: 1 }
          ],
          objects: [],
          scenes: [{ label: 'indoor', confidence: 0.6 }]
        },
        syncStatus: 'local_only' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return mockPhotos;
  };

  const handleGeneratePhotos = () => {
    const mockPhotos = generateMockPhotos();
    setPhotos(mockPhotos);
    Alert.alert('Success', `Generated ${mockPhotos.length} mock photos for clustering demo!`);
  };

  const handlePhotoPress = (photo: Photo) => {
    Alert.alert('Photo Selected', `Selected photo: ${photo.id}`);
  };

  const handleClustersUpdate = (updatedClusters: PhotoCluster[]) => {
    setClusters(updatedClusters);
  };

  if (photos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>Clustering Demo</Text>
          <Text style={styles.description}>
            This demo showcases the photo clustering functionality. 
            Generate mock photos to see how the clustering algorithms work.
          </Text>
          
          <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePhotos}>
            <Text style={styles.generateButtonText}>Generate Mock Photos</Text>
          </TouchableOpacity>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Features Demonstrated:</Text>
            <Text style={styles.infoItem}>• Visual similarity clustering</Text>
            <Text style={styles.infoItem}>• Time and location-based clustering</Text>
            <Text style={styles.infoItem}>• Cluster merging and splitting</Text>
            <Text style={styles.infoItem}>• Manual cluster management</Text>
            <Text style={styles.infoItem}>• Configurable clustering parameters</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clustering Demo</Text>
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={() => {
            setPhotos([]);
            setClusters([]);
          }}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ClusterManagementScreen
        photos={photos}
        onPhotoPress={handlePhotoPress}
        onClustersUpdate={handleClustersUpdate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 40,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});