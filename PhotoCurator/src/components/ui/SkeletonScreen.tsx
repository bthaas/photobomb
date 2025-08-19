import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface SkeletonItemProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const SkeletonItem: React.FC<SkeletonItemProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
  }, [shimmerValue]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmerValue.value, [0, 1], [0.3, 0.7]);
    return {
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.skeletonItem,
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

interface SkeletonScreenProps {
  type: 'photoGrid' | 'photoDetail' | 'list' | 'custom';
  itemCount?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const SkeletonScreen: React.FC<SkeletonScreenProps> = ({
  type,
  itemCount = 6,
  children,
  style,
}) => {
  const renderPhotoGridSkeleton = () => {
    const items = Array.from({ length: itemCount }, (_, index) => (
      <View key={index} style={styles.photoGridItem}>
        <SkeletonItem width="100%" height={120} borderRadius={8} />
      </View>
    ));

    return <View style={styles.photoGrid}>{items}</View>;
  };

  const renderPhotoDetailSkeleton = () => (
    <View style={styles.photoDetail}>
      {/* Main photo skeleton */}
      <SkeletonItem width="100%" height={300} borderRadius={12} />
      
      {/* Title skeleton */}
      <View style={styles.detailSection}>
        <SkeletonItem width="70%" height={24} />
      </View>
      
      {/* Metadata skeleton */}
      <View style={styles.detailSection}>
        <SkeletonItem width="40%" height={16} />
        <SkeletonItem width="60%" height={16} style={{ marginTop: 8 }} />
        <SkeletonItem width="50%" height={16} style={{ marginTop: 8 }} />
      </View>
      
      {/* Action buttons skeleton */}
      <View style={styles.actionButtons}>
        <SkeletonItem width={80} height={36} borderRadius={18} />
        <SkeletonItem width={80} height={36} borderRadius={18} />
        <SkeletonItem width={80} height={36} borderRadius={18} />
      </View>
    </View>
  );

  const renderListSkeleton = () => {
    const items = Array.from({ length: itemCount }, (_, index) => (
      <View key={index} style={styles.listItem}>
        <SkeletonItem width={60} height={60} borderRadius={8} />
        <View style={styles.listItemContent}>
          <SkeletonItem width="80%" height={18} />
          <SkeletonItem width="60%" height={14} style={{ marginTop: 8 }} />
          <SkeletonItem width="40%" height={14} style={{ marginTop: 4 }} />
        </View>
      </View>
    ));

    return <View style={styles.list}>{items}</View>;
  };

  const renderContent = () => {
    switch (type) {
      case 'photoGrid':
        return renderPhotoGridSkeleton();
      case 'photoDetail':
        return renderPhotoDetailSkeleton();
      case 'list':
        return renderListSkeleton();
      case 'custom':
        return children;
      default:
        return renderPhotoGridSkeleton();
    }
  };

  return <View style={[styles.container, style]}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  skeletonItem: {
    backgroundColor: '#E1E9EE',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoGridItem: {
    width: '48%',
    marginBottom: 16,
  },
  photoDetail: {
    flex: 1,
  },
  detailSection: {
    marginTop: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 16,
  },
});

export default SkeletonScreen;