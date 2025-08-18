/**
 * ClusterManagementScreen - Main screen for managing photo clusters
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import { ClusterView } from './ClusterView';
import { ClusteringService, ClusteringConfig } from '../../services/clustering/ClusteringService';
import { PhotoCluster, Photo, ClusteringResult, ProcessingProgress } from '../../types';

interface ClusterManagementScreenProps {
  photos: Photo[];
  onPhotoPress: (photo: Photo) => void;
  onClustersUpdate: (clusters: PhotoCluster[]) => void;
}

export const ClusterManagementScreen: React.FC<ClusterManagementScreenProps> = ({
  photos,
  onPhotoPress,
  onClustersUpdate
}) => {
  const [clusters, setClusters] = useState<PhotoCluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [clusteringService] = useState(() => new ClusteringService());
  const [selectedClusterForMerge, setSelectedClusterForMerge] = useState<string | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<ClusteringConfig>({
    visualSimilarityThreshold: 0.8,
    timeThresholdHours: 2,
    locationThresholdMeters: 100,
    minClusterSize: 2,
    maxClusterSize: 50
  });

  useEffect(() => {
    if (photos.length > 0) {
      performClustering();
    }
  }, [photos]);

  const performClustering = useCallback(async () => {
    if (photos.length === 0) return;

    setIsLoading(true);
    setProgress({ current: 0, total: 100, percentage: 0, stage: 'Initializing...' });

    try {
      // Update progress
      setProgress({ current: 20, total: 100, percentage: 20, stage: 'Analyzing visual similarity...' });
      
      // Perform visual similarity clustering
      const visualResult = await clusteringService.clusterByVisualSimilarity(photos);
      
      setProgress({ current: 60, total: 100, percentage: 60, stage: 'Analyzing time and location...' });
      
      // Perform time/location clustering
      const timeLocationResult = await clusteringService.clusterByTimeAndLocation(photos);
      
      setProgress({ current: 80, total: 100, percentage: 80, stage: 'Combining results...' });
      
      // Combine results (prioritize visual similarity, then time/location)
      const combinedClusters = [...visualResult.clusters];
      
      // Add time/location clusters for photos not already clustered
      const clusteredPhotoIds = new Set(visualResult.clusters.flatMap(c => c.photos.map(p => p.id)));
      const remainingPhotos = photos.filter(p => !clusteredPhotoIds.has(p.id));
      
      if (remainingPhotos.length > 0) {
        const remainingTimeLocationResult = await clusteringService.clusterByTimeAndLocation(remainingPhotos);
        combinedClusters.push(...remainingTimeLocationResult.clusters);
      }
      
      setProgress({ current: 100, total: 100, percentage: 100, stage: 'Complete!' });
      
      setClusters(combinedClusters);
      onClustersUpdate(combinedClusters);
      
    } catch (error) {
      console.error('Clustering failed:', error);
      Alert.alert('Error', 'Failed to cluster photos. Please try again.');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [photos, clusteringService, onClustersUpdate]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await performClustering();
    setIsRefreshing(false);
  }, [performClustering]);

  const handleClusterUpdate = useCallback((updatedCluster: PhotoCluster) => {
    setClusters(prev => prev.map(c => c.id === updatedCluster.id ? updatedCluster : c));
    onClustersUpdate(clusters.map(c => c.id === updatedCluster.id ? updatedCluster : c));
  }, [clusters, onClustersUpdate]);

  const handleMergeRequest = useCallback((clusterId: string) => {
    setSelectedClusterForMerge(clusterId);
    setShowMergeModal(true);
  }, []);

  const handleMergeConfirm = useCallback(async (targetClusterId: string) => {
    if (!selectedClusterForMerge || selectedClusterForMerge === targetClusterId) {
      setShowMergeModal(false);
      setSelectedClusterForMerge(null);
      return;
    }

    try {
      const mergeResult = await clusteringService.mergeClusters(
        [selectedClusterForMerge, targetClusterId],
        clusters
      );

      const updatedClusters = clusters
        .filter(c => !mergeResult.removedClusterIds.includes(c.id))
        .concat(mergeResult.mergedCluster);

      setClusters(updatedClusters);
      onClustersUpdate(updatedClusters);
      
      Alert.alert('Success', 'Clusters merged successfully!');
    } catch (error) {
      console.error('Merge failed:', error);
      Alert.alert('Error', 'Failed to merge clusters. Please try again.');
    }

    setShowMergeModal(false);
    setSelectedClusterForMerge(null);
  }, [selectedClusterForMerge, clusters, clusteringService, onClustersUpdate]);

  const handleSplitRequest = useCallback(async (clusterId: string) => {
    try {
      const splitResult = await clusteringService.splitCluster(clusterId, clusters, 2);
      
      const updatedClusters = clusters
        .filter(c => c.id !== clusterId)
        .concat(splitResult.newClusters);

      setClusters(updatedClusters);
      onClustersUpdate(updatedClusters);
      
      Alert.alert('Success', `Cluster split into ${splitResult.newClusters.length} new clusters!`);
    } catch (error) {
      console.error('Split failed:', error);
      Alert.alert('Error', 'Failed to split cluster. Please try again.');
    }
  }, [clusters, clusteringService, onClustersUpdate]);

  const handleDeleteCluster = useCallback((clusterId: string) => {
    const updatedClusters = clusters.filter(c => c.id !== clusterId);
    setClusters(updatedClusters);
    onClustersUpdate(updatedClusters);
  }, [clusters, onClustersUpdate]);

  const handleConfigSave = useCallback(() => {
    // Create new clustering service with updated config
    const newService = new ClusteringService(config);
    setShowConfigModal(false);
    
    // Re-cluster with new settings
    performClustering();
  }, [config, performClustering]);

  const renderCluster = ({ item }: { item: PhotoCluster }) => (
    <ClusterView
      cluster={item}
      onPhotoPress={onPhotoPress}
      onClusterUpdate={handleClusterUpdate}
      onMergeRequest={handleMergeRequest}
      onSplitRequest={handleSplitRequest}
      onDeleteCluster={handleDeleteCluster}
    />
  );

  const renderMergeOption = ({ item }: { item: PhotoCluster }) => {
    if (item.id === selectedClusterForMerge) return null;
    
    return (
      <TouchableOpacity
        style={styles.mergeOption}
        onPress={() => handleMergeConfirm(item.id)}
      >
        <Text style={styles.mergeOptionText}>
          {item.label || `Cluster with ${item.photos.length} photos`}
        </Text>
        <Text style={styles.mergeOptionSubtext}>
          {item.photos.length} photos • {Math.round(item.confidence * 100)}% confidence
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        {progress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{progress.stage}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
            </View>
            <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Photo Clusters</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.configButton}
            onPress={() => setShowConfigModal(true)}
          >
            <Text style={styles.configButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.statsText}>
          {clusters.length} clusters • {photos.length} total photos
        </Text>
      </View>

      {/* Cluster List */}
      <FlatList
        data={clusters}
        renderItem={renderCluster}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Merge Modal */}
      <Modal
        visible={showMergeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMergeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Cluster to Merge</Text>
            <TouchableOpacity onPress={() => setShowMergeModal(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={clusters}
            renderItem={renderMergeOption}
            keyExtractor={(item) => item.id}
            style={styles.mergeList}
          />
        </View>
      </Modal>

      {/* Config Modal */}
      <Modal
        visible={showConfigModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Clustering Settings</Text>
            <TouchableOpacity onPress={() => setShowConfigModal(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.configContent}>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Visual Similarity Threshold</Text>
              <TextInput
                style={styles.configInput}
                value={config.visualSimilarityThreshold.toString()}
                onChangeText={(text) => setConfig(prev => ({ ...prev, visualSimilarityThreshold: parseFloat(text) || 0.8 }))}
                keyboardType="numeric"
                placeholder="0.8"
              />
            </View>
            
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Time Threshold (hours)</Text>
              <TextInput
                style={styles.configInput}
                value={config.timeThresholdHours.toString()}
                onChangeText={(text) => setConfig(prev => ({ ...prev, timeThresholdHours: parseInt(text) || 2 }))}
                keyboardType="numeric"
                placeholder="2"
              />
            </View>
            
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Location Threshold (meters)</Text>
              <TextInput
                style={styles.configInput}
                value={config.locationThresholdMeters.toString()}
                onChangeText={(text) => setConfig(prev => ({ ...prev, locationThresholdMeters: parseInt(text) || 100 }))}
                keyboardType="numeric"
                placeholder="100"
              />
            </View>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleConfigSave}>
              <Text style={styles.saveButtonText}>Save & Re-cluster</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '80%',
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  configButton: {
    padding: 8,
  },
  configButtonText: {
    fontSize: 20,
  },
  stats: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  mergeList: {
    flex: 1,
  },
  mergeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mergeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  mergeOptionSubtext: {
    fontSize: 12,
    color: '#666',
  },
  configContent: {
    padding: 16,
  },
  configItem: {
    marginBottom: 20,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});