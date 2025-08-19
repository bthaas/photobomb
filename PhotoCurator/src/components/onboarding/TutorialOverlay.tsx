import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useAccessibility } from '../accessibility/AccessibilityProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface TutorialOverlayProps {
  visible: boolean;
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  visible,
  steps,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const { isScreenReaderEnabled, announceForAccessibility } = useAccessibility();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      if (isScreenReaderEnabled && steps[currentStep]) {
        announceForAccessibility(
          `Tutorial step ${currentStep + 1} of ${steps.length}. ${steps[currentStep].title}`
        );
      }
    }
  }, [visible, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  };

  const handleSkip = () => {
    if (isScreenReaderEnabled) {
      announceForAccessibility('Skipping tutorial');
    }
    handleComplete();
  };

  if (!visible || !steps[currentStep]) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const { position } = currentStepData;

  // Calculate tooltip position
  const tooltipY = position.y + position.height + 20;
  const isTooltipAtBottom = tooltipY + 200 > screenHeight;
  const finalTooltipY = isTooltipAtBottom 
    ? position.y - 220 
    : tooltipY;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View 
        style={[styles.overlay, { opacity: fadeAnim }]}
        accessible={false}
      >
        {/* Backdrop with spotlight */}
        <View style={styles.backdrop}>
          {/* Spotlight hole */}
          <View
            style={[
              styles.spotlight,
              {
                left: position.x - 8,
                top: position.y - 8,
                width: position.width + 16,
                height: position.height + 16,
              },
            ]}
          />
        </View>

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            {
              left: 20,
              right: 20,
              top: finalTooltipY,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.tooltipHeader}>
            <Text 
              style={styles.tooltipTitle}
              accessible={true}
              accessibilityRole="header"
            >
              {currentStepData.title}
            </Text>
            <Text 
              style={styles.stepCounter}
              accessible={true}
              accessibilityLabel={`Step ${currentStep + 1} of ${steps.length}`}
            >
              {currentStep + 1}/{steps.length}
            </Text>
          </View>

          <Text 
            style={styles.tooltipDescription}
            accessible={true}
          >
            {currentStepData.description}
          </Text>

          <View style={styles.tooltipButtons}>
            <Pressable
              style={styles.skipButton}
              onPress={handleSkip}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Skip tutorial"
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>

            <View style={styles.navigationButtons}>
              {currentStep > 0 && (
                <Pressable
                  style={styles.previousButton}
                  onPress={handlePrevious}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Previous step"
                >
                  <Text style={styles.previousButtonText}>Previous</Text>
                </Pressable>
              )}

              <Pressable
                style={styles.nextButton}
                onPress={handleNext}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  currentStep === steps.length - 1 ? 'Finish tutorial' : 'Next step'
                }
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Arrow pointing to target */}
        {!isTooltipAtBottom && (
          <View
            style={[
              styles.arrow,
              {
                left: position.x + position.width / 2 - 8,
                top: position.y + position.height + 8,
              },
            ]}
          />
        )}
        {isTooltipAtBottom && (
          <View
            style={[
              styles.arrowUp,
              {
                left: position.x + position.width / 2 - 8,
                top: position.y - 16,
              },
            ]}
          />
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 8,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  stepCounter: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tooltipDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  previousButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  previousButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
  arrowUp: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
  },
});