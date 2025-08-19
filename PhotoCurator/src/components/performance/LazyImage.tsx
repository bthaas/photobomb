import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  ImageStyle,
  ViewStyle,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { imageCacheManager } from '../../services/performance/ImageCacheManager';

interface LazyImageProps {
  uri: string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  thumbnail?: boolean;
  fadeInDuration?: number;
  onLoad?: () => void;
  onError?: (error: any) => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export const LazyImage: React.FC<LazyImageProps> = ({
  uri,
  style,
  containerStyle,
  placeholder,
  thumbnail = false,
  fadeInDuration = 300,
  onLoad,
  onError,
  resizeMode = 'cover',
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    loadImage();
  }, [uri, thumbnail]);

  const loadImage = async () => {
    if (!uri) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      // Try to get cached image first
      const cachedUri = await imageCacheManager.getCachedImage(uri, { thumbnail });
      
      if (cachedUri && isMounted.current) {
        setImageUri(cachedUri);
        setIsLoading(false);
        return;
      }

      // Cache the image if not already cached
      const processedUri = await imageCacheManager.cacheImage(uri, { thumbnail });
      
      if (isMounted.current) {
        setImageUri(processedUri);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to load image:', error);
      if (isMounted.current) {
        setHasError(true);
        setIsLoading(false);
        onError?.(error);
      }
    }
  };

  const handleImageLoad = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: fadeInDuration,
      useNativeDriver: true,
    }).start();
    onLoad?.();
  };

  const handleImageError = (error: any) => {
    setHasError(true);
    setIsLoading(false);
    onError?.(error);
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <View
        style={[
          {
            backgroundColor: '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center',
          },
          style,
        ]}
      >
        {isLoading && <ActivityIndicator size="small" color="#666" />}
      </View>
    );
  };

  if (hasError || !imageUri) {
    return <View style={containerStyle}>{renderPlaceholder()}</View>;
  }

  return (
    <View style={containerStyle}>
      {isLoading && renderPlaceholder()}
      <Animated.Image
        source={{ uri: imageUri }}
        style={[
          style,
          {
            opacity: fadeAnim,
            position: isLoading ? 'absolute' : 'relative',
          },
        ]}
        resizeMode={resizeMode}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </View>
  );
};

// Hook for preloading images
export const useImagePreloader = () => {
  const preloadImages = async (uris: string[], options?: { thumbnail?: boolean }) => {
    const promises = uris.map(uri => 
      imageCacheManager.cacheImage(uri, options)
    );
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to preload images:', error);
    }
  };

  return { preloadImages };
};