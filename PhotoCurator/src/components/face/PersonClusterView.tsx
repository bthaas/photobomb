import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { PersonCluster, Face } from '../../types';
import { PersonManagementService } from '../../services/ai/PersonManagementService';

interface PersonClusterViewProps {
  cluster: PersonCluster;
  onClusterUpdate: (updatedCluster: PersonCluster) => void;
  onMergeRequest: (cluster: PersonCluster) => void;
  onSplitRequest: (cluster: PersonCluster) => void;
}

export const PersonClusterView: React.FC<PersonClusterViewProps> = ({
  cluster,
  onClusterUpdate,
  onMergeRequest,
  onSplitRequest,
}) => {
  const [isLabelModalVisible, setIsLabelModalVisible] = useState(false);
  const [labelText, setLabelText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const personManagementService = PersonManagementService.getInstance();
  const personLabel = personManagementService.getPersonLabel(cluster.id);

  const handleLabelPerson = useCallback(async () => {
    if (!labelText.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    setIsLoading(true);
    try {
      await personManagementService.labelPerson(cluster.id, labelText.trim());
      setIsLabelModalVisible(false);
      setLabelText('');
      
      // Notify parent of update
      onClusterUpdate({
        ...cluster,
        name: labelText.trim(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error labeling person:', error);
      Alert.alert('Error', 'Failed to label person');
    } finally {
      setIsLoading(false);
    }
  }, [labelText, cluster, personManagementService, onClusterUpdate]);

  const handleUnlabelPerson = useCallback(async () => {
    Alert.alert(
      'Remove Label',
      'Are you sure you want to remove this person\'s label?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await personManagementService.unlabelPerson(cluster.id);
              onClusterUpdate({
                ...cluster,
                name: undefined,
                updatedAt: new Date()
              });
            } catch (error) {
              console.error('Error removing label:', error);
              Alert.alert('Error', 'Failed to remove label');
            }
          }
        }
      ]
    );
  }, [cluster, personManagementService, onClusterUpdate]);

  const renderFace = useCallback(({ item: face }: { item: Face }) => (
    <View style={styles.faceContainer}>
      <View style={styles.facePlaceholder}>
        <Text style={styles.faceText}>Face</Text>
      </View>
      <Text style={styles.faceConfidence}>
        {Math.round(face.confidence * 100)}%
      </Text>
    </View>
  ), []);

  const representativeFace = personManagementService.getBestRepresentativeFace(cluster);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.representativeFaceContainer}>
          <View style={styles.representativeFace}>
            <Text style={styles.representativeFaceText}>
              {personLabel?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.personName}>
            {personLabel?.name || 'Unnamed Person'}
          </Text>
          <Text style={styles.clusterStats}>
            {cluster.faces.length} faces • {cluster.photos.length} photos
          </Text>
          <Text style={styles.confidence}>
            Confidence: {Math.round(cluster.confidence * 100)}%
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setLabelText(personLabel?.name || '');
            setIsLabelModalVisible(true);
          }}
        >
          <Text style={styles.actionButtonText}>
            {personLabel ? 'Edit Name' : 'Add Name'}
          </Text>
        </TouchableOpacity>

        {personLabel && (
          <TouchableOpacity
            style={[styles.actionButton, styles.destructiveButton]}
            onPress={handleUnlabelPerson}
          >
            <Text style={[styles.actionButtonText, styles.destructiveButtonText]}>
              Remove Name
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onMergeRequest(cluster)}
        >
          <Text style={styles.actionButtonText}>Merge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onSplitRequest(cluster)}
        >
          <Text style={styles.actionButtonText}>Split</Text>
        </TouchableOpacity>
      </View>

      {/* Face Grid */}
      <Text style={styles.sectionTitle}>All Faces</Text>
      <FlatList
        data={cluster.faces}
        renderItem={renderFace}
        keyExtractor={(face) => face.id}
        numColumns={4}
        contentContainerStyle={styles.faceGrid}
        showsVerticalScrollIndicator={false}
      />

      {/* Label Modal */}
      <Modal
        visible={isLabelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsLabelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {personLabel ? 'Edit Person Name' : 'Add Person Name'}
            </Text>
            
            <TextInput
              style={styles.textInput}
              value={labelText}
              onChangeText={setLabelText}
              placeholder="Enter person's name"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleLabelPerson}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsLabelModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleLabelPerson}
                disabled={isLoading || !labelText.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  representativeFaceContainer: {
    marginRight: 16,
  },
  representativeFace: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  representativeFaceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  headerInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clusterStats: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  confidence: {
    fontSize: 14,
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  destructiveButtonText: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  faceGrid: {
    paddingBottom: 20,
  },
  faceContainer: {
    flex: 1,
    margin: 4,
    alignItems: 'center',
  },
  facePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  faceText: {
    fontSize: 10,
    color: '#666',
  },
  faceConfidence: {
    fontSize: 10,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});