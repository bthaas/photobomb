import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface LoadingStateProps {
  type?: 'spinner' | 'dots' | 'pulse' | 'wave' | 'skeleton';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  message?: string;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  size = 'medium',
  color = '#007AFF',
  message,
  style,
}) => {
  const animationValue = useSharedValue(0);

  useEffect(() => {
    switch (type) {
      case 'spinner':
        animationValue.value = withRepeat(
          withTiming(360, { duration: 1000, easing: Easing.linear }),
          -1,
          false
        );
        break;
      case 'dots':
      case 'pulse':
      case 'wave':
        animationValue.value = withRepeat(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
        break;
      default:
        animationValue.value = withRepeat(
          withTiming(1, { duration: 1000 }),
          -1,
          true
        );
    }
  }, [type, animationValue]);

  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 48;
      default:
        return 32;
    }
  };

  const renderSpinner = () => {
    const sizeValue = getSizeValue();
    
    const spinnerStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${animationValue.value}deg` }],
    }));

    return (
      <Animated.View
        style={[
          styles.spinner,
          {
            width: sizeValue,
            height: sizeValue,
            borderColor: `${color}20`,
            borderTopColor: color,
            borderWidth: sizeValue / 8,
          },
          spinnerStyle,
        ]}
      />
    );
  };

  const renderDots = () => {
    const sizeValue = getSizeValue() / 4;
    
    const dots = Array.from({ length: 3 }, (_, index) => {
      const dotStyle = useAnimatedStyle(() => {
        const delay = index * 0.2;
        const opacity = interpolate(
          animationValue.value,
          [0, 0.5, 1],
          [0.3, 1, 0.3]
        );
        const scale = interpolate(
          animationValue.value,
          [0, 0.5, 1],
          [0.8, 1.2, 0.8]
        );
        
        return {
          opacity: opacity,
          transform: [{ scale }],
        };
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              width: sizeValue,
              height: sizeValue,
              backgroundColor: color,
              marginHorizontal: sizeValue / 2,
            },
            dotStyle,
          ]}
        />
      );
    });

    return <View style={styles.dotsContainer}>{dots}</View>;
  };

  const renderPulse = () => {
    const sizeValue = getSizeValue();
    
    const pulseStyle = useAnimatedStyle(() => {
      const scale = interpolate(animationValue.value, [0, 1], [0.8, 1.2]);
      const opacity = interpolate(animationValue.value, [0, 1], [1, 0.3]);
      
      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <Animated.View
        style={[
          styles.pulse,
          {
            width: sizeValue,
            height: sizeValue,
            backgroundColor: color,
          },
          pulseStyle,
        ]}
      />
    );
  };

  const renderWave = () => {
    const sizeValue = getSizeValue() / 6;
    
    const bars = Array.from({ length: 5 }, (_, index) => {
      const barStyle = useAnimatedStyle(() => {
        const delay = index * 0.1;
        const adjustedValue = (animationValue.value + delay) % 1;
        const height = interpolate(
          adjustedValue,
          [0, 0.5, 1],
          [sizeValue, sizeValue * 3, sizeValue]
        );
        
        return {
          height,
        };
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              width: sizeValue,
              backgroundColor: color,
              marginHorizontal: sizeValue / 4,
            },
            barStyle,
          ]}
        />
      );
    });

    return <View style={styles.waveContainer}>{bars}</View>;
  };

  const renderSkeleton = () => {
    const skeletonStyle = useAnimatedStyle(() => {
      const opacity = interpolate(animationValue.value, [0, 1], [0.3, 0.7]);
      return { opacity };
    });

    return (
      <View style={styles.skeletonContainer}>
        <Animated.View style={[styles.skeletonLine, styles.skeletonTitle, skeletonStyle]} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonSubtitle, skeletonStyle]} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonContent, skeletonStyle]} />
      </View>
    );
  };

  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return renderSpinner();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'wave':
        return renderWave();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {renderLoader()}
      {message && (
        <Text style={[styles.message, { color }]}>{message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinner: {
    borderRadius: 50,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    borderRadius: 50,
  },
  pulse: {
    borderRadius: 50,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'end',
    height: 40,
  },
  waveBar: {
    borderRadius: 2,
  },
  skeletonContainer: {
    width: 200,
  },
  skeletonLine: {
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTitle: {
    height: 20,
    width: '80%',
  },
  skeletonSubtitle: {
    height: 16,
    width: '60%',
  },
  skeletonContent: {
    height: 14,
    width: '90%',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoadingState;