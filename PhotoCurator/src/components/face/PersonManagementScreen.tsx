import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { PersonCluster } from '../../types';
import { PersonManagementService, PersonSearchOptions, PersonStats } from '../../services/ai/PersonManagementService';
import { FaceClusteringService } from '../../services/ai/FaceClusteringService';
import { PersonClusterView } from './PersonClusterView';

interface PersonManagementScreenProps {
  clusters: PersonCluster[];
  onClustersUpdate: (clusters: PersonCluster[]) => void;
}

export const PersonManagementScreen: React.FC<PersonManagementScreenProps> = ({
  clusters,
  onClustersUpdate,
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredClusters, setFilteredClusters] = useState<PersonCluster[]>(clusters);
  const [selectedCluster, setSelectedCluster] = useState<PersonCluster | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<PersonStats | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'photoCount' | 'confidence'>('photoCount');

  const personManagementService = PersonManagementService.getInstance();
  const faceClusteringService = FaceClusteringService.getInstance();

  // Update filtered clusters when search or sort changes
  useEffect(() => {
    const searchOptions: PersonSearchOptions = {
      name: searchText,
      sortBy,
      sortOrder: 'desc',
    };

    const filtered = personManagementService.searchPeople(clusters, searchOptions);
    setFilteredClusters(filtered);
  }, [clusters, searchText, sortBy, personManagementService]);

  // Update stats when clusters change
  useEffect(() => {
    const newStats = personManagementService.getPersonStats(clusters);
    setStats(newStats);
  }, [clusters, personManagementService]);

  const handleClusterUpdate = useCallback((updatedCluster: PersonCluster) => {
    const updatedClusters = clusters.map(cluster =>
      cluster.id === updatedCluster.id ? updatedCluster : cluster
    );
    onClustersUpdate(updatedClusters);
  }, [clusters, onClustersUpdate]);

  const handleMergeRequest = useCallback(async (cluster: PersonCluster) => {
    // Find potential merge candidates
    setIsLoading(true);
    try {
      const mergeCandidates = await personManagementService.suggestMergeCandidates(
        clusters.filter(c => c.id !== cluster.id),
        0.7
      );

      if (mergeCandidates.length === 0) {
        Alert.alert('No Merge Candidates', 'No similar people found to merge with.');
        return;
      }

      // Show merge options
      const options = mergeCandidates.slice(0, 5).map((candidate, index) => {
        const label = personManagementService.getPersonLabel(candidate.cluster2.id);
        return {
          text: `${label?.name || 'Unnamed'} (${Math.round(candidate.similarity * 100)}% similar)`,
          onPress: () => performMerge(cluster, candidate.cluster2),
        };
      });

      Alert.alert(
        'Merge with Person',
        'Select a person to merge with:',
        [
          ...options,
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error finding merge candidates:', error);
      Alert.alert('Error', 'Failed to find merge candidates');
    } finally {
      setIsLoading(false);
    }
  }, [clusters, personManagementService]);

  const performMerge = useCallback(async (cluster1: PersonCluster, cluster2: PersonCluster) => {
    setIsLoading(true);
    try {
      const mergedCluster = await personManagementService.mergePersonClusters(cluster1, cluster2);
      
      const updatedClusters = clusters
        .filter(c => c.id !== cluster1.id && c.id !== cluster2.id)
        .concat(mergedCluster);
      
      onClustersUpdate(updatedClusters);
      Alert.alert('Success', 'People merged successfully');
    } catch (error) {
      console.error('Error merging clusters:', error);
      Alert.alert('Error', 'Failed to merge people');
    } finally {
      setIsLoading(false);
    }
  }, [clusters, onClustersUpdate, personManagementService]);

  const handleSplitRequest = useCallback(async (cluster: PersonCluster) => {
    if (cluster.faces.length < 4) {
      Alert.alert('Cannot Split', 'Need at least 4 faces to split a person.');
      return;
    }

    Alert.alert(
      'Split Person',
      'This will split the person into multiple people based on face similarity. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Split',
          onPress: async () => {
            setIsLoading(true);
            try {
              const splitClusters = await personManagementService.splitPersonCluster(cluster);
              
              const updatedClusters = clusters
                .filter(c => c.id !== cluster.id)
                .concat(splitClusters);
              
              onClustersUpdate(updatedClusters);
              Alert.alert('Success', `Person split into ${splitClusters.length} people`);
            } catch (error) {
              console.error('Error splitting cluster:', error);
              Alert.alert('Error', 'Failed to split person');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  }, [clusters, onClustersUpdate, personManagementService]);

  const renderClusterItem = useCallback(({ item: cluster }: { item: PersonCluster }) => {
    const label = personManagementService.getPersonLabel(cluster.id);
    const representativeFace = personManagementService.getBestRepresentativeFace(cluster);

    return (
      <TouchableOpacity
        style={styles.clusterItem}
        onPress={() => setSelectedCluster(cluster)}
      >
        <View style={styles.clusterFace}>
          <Text style={styles.clusterFaceText}>
            {label?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        
        <View style={styles.clusterInfo}>
          <Text style={styles.clusterName}>
            {label?.name || 'Unnamed Person'}
          </Text>
          <Text style={styles.clusterStats}>
            {cluster.faces.length} faces • {cluster.photos.length} photos
          </Text>
          <Text style={styles.clusterConfidence}>
            {Math.round(cluster.confidence * 100)}% confidence
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [personManagementService]);

  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>People Overview</Text>
      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalPeople}</Text>
            <Text style={styles.statLabel}>Total People</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.labeledPeople}</Text>
            <Text style={styles.statLabel}>Named</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.unlabeledClusters}</Text>
            <Text style={styles.statLabel}>Unnamed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(stats.averagePhotosPerPerson)}</Text>
            <Text style={styles.statLabel}>Avg Photos</Text>
          </View>
        </View>
      )}
    </View>
  );

  if (selectedCluster) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCluster(null)}
        >
          <Text style={styles.backButtonText}>← Back to People</Text>
        </TouchableOpacity>
        
        <PersonClusterView
          cluster={selectedCluster}
          onClusterUpdate={handleClusterUpdate}
          onMergeRequest={handleMergeRequest}
          onSplitRequest={handleSplitRequest}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderStatsHeader()}
      
      {/* Search and Sort */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          value={searchText}
          onChangeText={setSearchText}
        />
        
        <View style={styles.sortButtons}>
          {(['name', 'photoCount', 'confidence'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.sortButton,
                sortBy === option && styles.sortButtonActive
              ]}
              onPress={() => setSortBy(option)}
            >
              <Text style={[
                styles.sortButtonText,
                sortBy === option && styles.sortButtonTextActive
              ]}>
                {option === 'photoCount' ? 'Photos' : 
                 option === 'confidence' ? 'Quality' : 'Name'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* People List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClusters}
          renderItem={renderClusterItem}
          keyExtractor={(cluster) => cluster.id}
          contentContainerStyle={styles.clusterList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  clusterList: {
    padding: 16,
  },
  clusterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clusterFace: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  clusterFaceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  clusterInfo: {
    flex: 1,
  },
  clusterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clusterStats: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clusterConfidence: {
    fontSize: 12,
    color: '#888',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});