import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/appStore';
import { Photo } from '../types';

export const ImportScreen: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { addPhotos, setCurrentView } = useAppStore();

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Photo Access Permission',
            message: 'AI Photo Curator needs access to your photos to analyze and curate them.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const importFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant photo access to continue.');
      return;
    }

    setIsImporting(true);

    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        selectionLimit: 0, // 0 means unlimited
        quality: 0.8,
        includeBase64: false,
      },
      (response: ImagePickerResponse) => {
        setIsImporting(false);

        if (response.didCancel || response.errorMessage) {
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const photos: Photo[] = response.assets.map((asset, index) => ({
            id: `photo_${Date.now()}_${index}`,
            uri: asset.uri!,
            filename: asset.fileName || `photo_${index}`,
            width: asset.width || 0,
            height: asset.height || 0,
            fileSize: asset.fileSize || 0,
            timestamp: Date.now(),
            isSelected: false,
            isFavorite: false,
            isDeleted: false,
            tags: [],
          }));

          addPhotos(photos);
          setCurrentView('analyze');

          Alert.alert(
            'Photos Imported',
            `Successfully imported ${photos.length} photo(s). Ready to analyze!`,
            [{ text: 'OK' }]
          );
        }
      }
    );
  };

  const importFromCameraRoll = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant photo access to continue.');
      return;
    }

    setIsImporting(true);

    try {
      // Get recent photos from camera roll
      const result = await CameraRoll.getPhotos({
        first: 50, // Get last 50 photos
        assetType: 'Photos',
      });

      const photos: Photo[] = result.edges.map((edge, index) => {
        const node = edge.node;
        return {
          id: `cameraroll_${Date.now()}_${index}`,
          uri: node.image.uri,
          filename: node.image.filename || `photo_${index}`,
          width: node.image.width || 0,
          height: node.image.height || 0,
          fileSize: node.image.fileSize || 0,
          timestamp: new Date(node.timestamp).getTime(),
          location: node.location ? {
            latitude: node.location.latitude,
            longitude: node.location.longitude,
          } : undefined,
          isSelected: false,
          isFavorite: false,
          isDeleted: false,
          tags: [],
        };
      });

      addPhotos(photos);
      setCurrentView('analyze');

      Alert.alert(
        'Photos Imported',
        `Successfully imported ${photos.length} photo(s) from Camera Roll. Ready to analyze!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to import from camera roll:', error);
      Alert.alert('Import Failed', 'Failed to import photos from Camera Roll.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Photo Curator</Text>
          <Text style={styles.subtitle}>
            Import your photos to start the intelligent curation process
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🧠</Text>
            <Text style={styles.featureTitle}>Smart Analysis</Text>
            <Text style={styles.featureDescription}>
              AI analyzes technical quality, composition, and content
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✨</Text>
            <Text style={styles.featureTitle}>Intelligent Curation</Text>
            <Text style={styles.featureDescription}>
              Automatically selects the best photos from your collection
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔒</Text>
            <Text style={styles.featureTitle}>Privacy First</Text>
            <Text style={styles.featureDescription}>
              All processing happens on your device - your photos never leave
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Import from Gallery"
            onPress={importFromGallery}
            loading={isImporting}
            size="large"
            style={styles.button}
          />

          <Button
            title="Import from Camera Roll"
            onPress={importFromCameraRoll}
            loading={isImporting}
            variant="secondary"
            size="large"
            style={styles.button}
          />
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>💡 Tips for Best Results</Text>
          <Text style={styles.tip}>• Import 20-100 photos for optimal curation</Text>
          <Text style={styles.tip}>• Include a variety of photos (portraits, landscapes, events)</Text>
          <Text style={styles.tip}>• The AI works best with high-quality images</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    marginBottom: 40,
  },
  feature: {
    alignItems: 'center',
    marginBottom: 32,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actions: {
    marginBottom: 40,
  },
  button: {
    marginBottom: 16,
  },
  tips: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  tip: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    lineHeight: 20,
  },
});