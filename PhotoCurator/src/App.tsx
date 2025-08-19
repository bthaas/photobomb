import React, { useEffect, useState } from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet, Platform, View, Text, ActivityIndicator} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {AppNavigator} from './navigation/AppNavigator';
import { AIService } from './services/ai';
import { GlobalErrorBoundary } from './components/error';
import { ErrorProvider } from './hooks/useErrorHandler';
import { AccessibilityProvider } from './components/accessibility/AccessibilityProvider';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { PreferencesService } from './services/preferences/PreferencesService';
import { AnalyticsService } from './services/analytics/AnalyticsService';
import { CrashReportingService } from './services/analytics/CrashReportingService';
import { PerformanceMonitor } from './services/performance/PerformanceMonitor';

const ONBOARDING_COMPLETED_KEY = '@PhotoCurator:onboarding_completed';

const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>Initializing PhotoCurator...</Text>
  </View>
);

const App: React.FC = () => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize core services
      const preferencesService = PreferencesService.getInstance();
      const analyticsService = AnalyticsService.getInstance();
      const crashReportingService = CrashReportingService.getInstance();
      const performanceMonitor = PerformanceMonitor.getInstance();

      await Promise.all([
        preferencesService.initialize(),
        performanceMonitor.initialize(),
      ]);

      // Initialize analytics and crash reporting
      await analyticsService.initialize({
        platform: Platform.OS,
        appVersion: '1.0.0',
        deviceModel: Platform.constants.Model || 'Unknown',
        osVersion: Platform.Version.toString(),
      });

      crashReportingService.initialize({
        platform: Platform.OS,
        appVersion: '1.0.0',
        deviceModel: Platform.constants.Model || 'Unknown',
        osVersion: Platform.Version.toString(),
      });

      // Initialize AI service (non-blocking)
      try {
        const aiService = AIService.getInstance();
        await aiService.initialize();
        console.log('AI Service initialized successfully');
        
        // Preload essential models in background
        aiService.preloadEssentialModels().catch(error => {
          console.warn('Failed to preload AI models:', error);
        });
      } catch (error) {
        console.warn('AI Service initialization failed, continuing without AI features:', error);
      }

      // Check onboarding status
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      setIsOnboardingCompleted(onboardingCompleted === 'true');

      // Track app initialization
      analyticsService.trackEvent('app_initialized', {
        initialization_time: Date.now(),
      });

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      
      // Still allow app to start even if initialization fails
      setIsOnboardingCompleted(true);
      setIsInitialized(true);
      
      // Report initialization error
      const crashReportingService = CrashReportingService.getInstance();
      crashReportingService.reportError(error as Error, {
        context: 'app_initialization',
      });
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      setIsOnboardingCompleted(true);
      
      // Track onboarding completion
      const analyticsService = AnalyticsService.getInstance();
      analyticsService.trackEvent('onboarding_completed');
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      setIsOnboardingCompleted(true); // Continue anyway
    }
  };

  // Show loading state while initializing
  if (!isInitialized || isOnboardingCompleted === null) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <LoadingScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Show onboarding if not completed
  if (!isOnboardingCompleted) {
    return (
      <AccessibilityProvider>
        <GlobalErrorBoundary>
          <GestureHandlerRootView style={styles.container}>
            <SafeAreaProvider>
              <OnboardingFlow onComplete={handleOnboardingComplete} />
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </GlobalErrorBoundary>
      </AccessibilityProvider>
    );
  }

  // Show main app
  return (
    <AccessibilityProvider>
      <GlobalErrorBoundary>
        <ErrorProvider>
          <GestureHandlerRootView style={styles.container}>
            <SafeAreaProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </ErrorProvider>
      </GlobalErrorBoundary>
    </AccessibilityProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333333',
  },
});

export default App;
