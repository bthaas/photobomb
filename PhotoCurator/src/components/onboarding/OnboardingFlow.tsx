import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { useAccessibility } from '../accessibility/AccessibilityProvider';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  illustration: string;
  accessibilityDescription: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AI Photo Curator',
    description: 'Organize and enhance your photos with the power of AI, all processed securely on your device.',
    illustration: '📸',
    accessibilityDescription: 'Welcome screen with camera icon'
  },
  {
    id: 'import',
    title: 'Import Your Photos',
    description: 'Connect your camera roll, Google Photos, or iCloud to bring all your memories into one place.',
    illustration: '📱',
    accessibilityDescription: 'Import screen showing phone with photos'
  },
  {
    id: 'organize',
    title: 'Smart Organization',
    description: 'Our AI automatically groups similar photos, identifies people, and organizes by events and locations.',
    illustration: '🗂️',
    accessibilityDescription: 'Organization screen with folder icon'
  },
  {
    id: 'curate',
    title: 'Find Your Best Shots',
    description: 'AI analyzes quality, composition, and content to suggest your best photos from each group.',
    illustration: '⭐',
    accessibilityDescription: 'Curation screen with star icon'
  },
  {
    id: 'enhance',
    title: 'AI-Powered Editing',
    description: 'One-tap enhancements, smart cropping, and background removal make your photos shine.',
    illustration: '✨',
    accessibilityDescription: 'Enhancement screen with sparkle icon'
  },
  {
    id: 'privacy',
    title: 'Your Privacy Matters',
    description: 'All AI processing happens on your device. Your photos stay private and under your control.',
    illustration: '🔒',
    accessibilityDescription: 'Privacy screen with lock icon'
  }
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { isScreenReaderEnabled, announceForAccessibility } = useAccessibility();

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      const nextStep = currentStep + 1;
      
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({ x: nextStep * screenWidth, animated: true });
      
      if (isScreenReaderEnabled) {
        announceForAccessibility(
          `Step ${nextStep + 1} of ${onboardingSteps.length}. ${onboardingSteps[nextStep].title}`
        );
      }
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      scrollViewRef.current?.scrollTo({ x: prevStep * screenWidth, animated: true });
      
      if (isScreenReaderEnabled) {
        announceForAccessibility(
          `Step ${prevStep + 1} of ${onboardingSteps.length}. ${onboardingSteps[prevStep].title}`
        );
      }
    }
  };

  const handleSkip = () => {
    if (isScreenReaderEnabled) {
      announceForAccessibility('Skipping onboarding');
    }
    onComplete();
  };

  const renderStep = (step: OnboardingStep, index: number) => (
    <View key={step.id} style={styles.stepContainer}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.illustrationContainer}>
          <Text 
            style={styles.illustration}
            accessible={true}
            accessibilityLabel={step.accessibilityDescription}
          >
            {step.illustration}
          </Text>
        </View>
        
        <Text 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
        >
          {step.title}
        </Text>
        
        <Text 
          style={styles.description}
          accessible={true}
        >
          {step.description}
        </Text>
      </Animated.View>
    </View>
  );

  const renderProgressIndicator = () => (
    <View 
      style={styles.progressContainer}
      accessible={true}
      accessibilityLabel={`Step ${currentStep + 1} of ${onboardingSteps.length}`}
    >
      {onboardingSteps.map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index === currentStep && styles.progressDotActive
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {onboardingSteps.map(renderStep)}
      </ScrollView>

      {renderProgressIndicator()}

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.skipButton]}
          onPress={handleSkip}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>

        <View style={styles.navigationButtons}>
          {currentStep > 0 && (
            <Pressable
              style={[styles.button, styles.previousButton]}
              onPress={handlePrevious}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Previous step"
            >
              <Text style={styles.previousButtonText}>Previous</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.button, styles.nextButton]}
            onPress={handleNext}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={currentStep === onboardingSteps.length - 1 ? 'Get started' : 'Next step'}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  stepContainer: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  illustrationContainer: {
    marginBottom: 32,
  },
  illustration: {
    fontSize: 80,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  skipButton: {
    backgroundColor: 'transparent',
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
  },
  previousButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});