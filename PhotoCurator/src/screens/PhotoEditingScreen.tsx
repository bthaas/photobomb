/**
 * Photo Editing Screen - Main interface for AI-powered photo editing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Photo } from '../types/photo';
import {
  EditedPhoto,
  CropSuggestion,
  BackgroundRemovalResult,
  EnhancementSettings,
} from '../types/editing';
import { PhotoEditor } from '../services/editing/PhotoEditor';
import { ModelManager } from '../services/ai/ModelManager';
import { ModelErrorHandler } from '../services/ai/ModelErrorHandler';

interface PhotoEditingScreenProps {
  photo: Photo;
  onSave: (editedPhoto: EditedPhoto) => void;
  onCancel: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PhotoEditingScreen: React.FC<PhotoEditingScreenProps> = ({
  photo,
  onSave,
  onCancel,
}) => {
  const [currentImageUri, setCurrentImageUri] = useState(photo.uri);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [cropSuggestions, setCropSuggestions] = useState<CropSuggestion[]>([]);
  const [backgroundRemovalResult, setBackgroundRemovalResult] = useState<BackgroundRemovalResult | null>(null);
  const [editHistory, setEditHistory] = useState<EditedPhoto[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  
  const [photoEditor] = useState(() => {
    const modelManager = new ModelManager();
    const errorHandler = new ModelErrorHandler();
    return new PhotoEditor(modelManager, errorHandler);
  });

  useEffect(() => {
    loadCropSuggestions();
  }, []);

  const loadCropSuggestions = useCallback(async () => {
    try {
      setIsProcessing(true);
      setProcessingStage('Analyzing composition...');
      
      const suggestions = await photoEditor.suggestCrop(photo);
      setCropSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load crop suggestions:', error);
      Alert.alert('Error', 'Failed to analyze photo composition');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  }, [photo, photoEditor]);

  const handleOneClickEnhance = useCallback(async () => {
    try {
      setIsProcessing(true);
      setProcessingStage('Enhancing photo...');
      
      const enhancedPhoto = await photoEditor.enhancePhoto(photo);
      setCurrentImageUri(enhancedPhoto.uri);
      setEditHistory(prev => [...prev, enhancedPhoto]);
      setCanUndo(true);
      
      Alert.alert('Success', 'Photo enhanced successfully!');
    } catch (error) {
      console.error('Failed to enhance photo:', error);
      Alert.alert('Error', 'Failed to enhance photo');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  }, [photo, photoEditor]);

  const handleBackgroundRemoval = useCallback(async () => {
    try {
      setIsProcessing(true);
      setProcessingStage('Removing background...');
      
      const result = await photoEditor.removeBackground(photo);
      setBackgroundRemovalResult(result);
      
      if (result.confidence > 0.7) {
        Alert.alert(
          'Background Removal',
          `Background detected with ${Math.round(result.confidence * 100)}% confidence. Choose an option:`,
          [
            { text: 'Blur Background', onPress: () => applyBackgroundBlur(result) },
            { text: 'Remove Background', onPress: () => applyBackgroundRemoval(result) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Low Confidence', 'Background detection confidence is low. Results may not be optimal.');
      }
    } catch (error) {
      console.error('Failed to remove background:', error);
      Alert.alert('Error', 'Failed to process background removal');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  }, [photo, photoEditor]);

  const applyBackgroundBlur = useCallback(async (result: BackgroundRemovalResult) => {
    // Implementation would apply background blur using the mask
    Alert.alert('Feature Coming Soon', 'Background blur will be implemented in the next update');
  }, []);

  const applyBackgroundRemoval = useCallback(async (result: BackgroundRemovalResult) => {
    // Implementation would remove background using the mask
    Alert.alert('Feature Coming Soon', 'Background removal will be implemented in the next update');
  }, []);

  const handleCropSuggestion = useCallback(async (suggestion: CropSuggestion) => {
    try {
      setIsProcessing(true);
      setProcessingStage('Applying crop...');
      
      const croppedPhoto = await photoEditor.applyCrop(photo, suggestion);
      setCurrentImageUri(croppedPhoto.uri);
      setEditHistory(prev => [...prev, croppedPhoto]);
      setCanUndo(true);
      
      Alert.alert('Success', 'Crop applied successfully!');
    } catch (error) {
      console.error('Failed to apply crop:', error);
      Alert.alert('Error', 'Failed to apply crop');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  }, [photo, photoEditor]);

  const handleUndo = useCallback(async () => {
    if (editHistory.length > 0) {
      const previousEdit = editHistory[editHistory.length - 1];
      
      try {
        const originalPhoto = await photoEditor.revertEdits(previousEdit);
        if (originalPhoto) {
          setCurrentImageUri(originalPhoto.uri);
        } else {
          // Revert to original photo
          setCurrentImageUri(photo.uri);
        }
        
        setEditHistory(prev => prev.slice(0, -1));
        setCanUndo(editHistory.length > 1);
      } catch (error) {
        console.error('Failed to undo edit:', error);
        Alert.alert('Error', 'Cannot undo this edit');
      }
    }
  }, [editHistory, photo, photoEditor]);

  const handleSave = useCallback(() => {
    if (editHistory.length > 0) {
      const latestEdit = editHistory[editHistory.length - 1];
      onSave(latestEdit);
    } else {
      Alert.alert('No Changes', 'No edits have been applied to save');
    }
  }, [editHistory, onSave]);

  const renderCropSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.sectionTitle}>Smart Crop Suggestions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {cropSuggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.id}
            style={styles.suggestionCard}
            onPress={() => handleCropSuggestion(suggestion)}
          >
            <Text style={styles.suggestionTitle}>
              {suggestion.aspectRatio === 1 ? 'Square' : 
               suggestion.aspectRatio === 3/4 ? 'Portrait' : 'Landscape'}
            </Text>
            <Text style={styles.suggestionReason}>{suggestion.reasoning}</Text>
            <Text style={styles.suggestionScore}>
              Score: {Math.round(suggestion.compositionScore * 100)}%
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEditingTools = () => (
    <View style={styles.toolsContainer}>
      <TouchableOpacity
        style={styles.toolButton}
        onPress={handleOneClickEnhance}
        disabled={isProcessing}
      >
        <Text style={styles.toolButtonText}>✨ Enhance</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.toolButton}
        onPress={handleBackgroundRemoval}
        disabled={isProcessing}
      >
        <Text style={styles.toolButtonText}>🎭 Background</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.toolButton, !canUndo && styles.toolButtonDisabled]}
        onPress={handleUndo}
        disabled={!canUndo || isProcessing}
      >
        <Text style={styles.toolButtonText}>↶ Undo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionContainer}>
      <TouchableOpacity
        style={[styles.actionButton, styles.cancelButton]}
        onPress={onCancel}
        disabled={isProcessing}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, styles.saveButton]}
        onPress={handleSave}
        disabled={isProcessing || editHistory.length === 0}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Photo Preview */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: currentImageUri }}
          style={styles.image}
          resizeMode="contain"
        />
        
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>{processingStage}</Text>
          </View>
        )}
      </View>

      {/* Editing Tools */}
      <ScrollView style={styles.controlsContainer}>
        {renderEditingTools()}
        {cropSuggestions.length > 0 && renderCropSuggestions()}
      </ScrollView>

      {/* Action Buttons */}
      {renderActionButtons()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.6,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  controlsContainer: {
    backgroundColor: '#1a1a1a',
    maxHeight: screenHeight * 0.3,
  },
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  toolButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  toolButtonDisabled: {
    backgroundColor: '#666',
  },
  toolButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  suggestionCard: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    marginRight: 15,
    minWidth: 120,
  },
  suggestionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  suggestionReason: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 5,
  },
  suggestionScore: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});