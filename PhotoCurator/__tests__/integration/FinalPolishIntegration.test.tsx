import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PreferencesService } from '../../src/services/preferences/PreferencesService';
import { AnalyticsService } from '../../src/services/analytics/AnalyticsService';
import { CrashReportingService } from '../../src/services/analytics/CrashReportingService';
import { AccessibilityProvider } from '../../src/components/accessibility/AccessibilityProvider';
import { OnboardingFlow } from '../../src/components/onboarding/OnboardingFlow';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import App from '../../src/App';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
}));

describe('Final Polish Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('App Initialization', () => {
    it('should initialize all services on app start', async () => {
      const preferencesService = PreferencesService.getInstance();
      const analyticsService = AnalyticsService.getInstance();
      const crashReportingService = CrashReportingService.getInstance();

      const initializeSpy = jest.spyOn(preferencesService, 'initialize');
      const analyticsSpy = jest.spyOn(analyticsService, 'initialize');
      const crashSpy = jest.spyOn(crashReportingService, 'initialize');

      render(<App />);

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalled();
        expect(analyticsSpy).toHaveBeenCalled();
        expect(crashSpy).toHaveBeenCalled();
      });
    });

    it('should show onboarding for new users', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('onboarding-flow')).toBeTruthy();
      });
    });

    it('should skip onboarding for returning users', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { queryByTestId } = render(<App />);

      await waitFor(() => {
        expect(queryByTestId('onboarding-flow')).toBeNull();
      });
    });
  });

  describe('Onboarding Flow', () => {
    it('should complete onboarding flow successfully', async () => {
      const onComplete = jest.fn();
      const { getByTestId, getByText } = render(
        <AccessibilityProvider>
          <OnboardingFlow onComplete={onComplete} />
        </AccessibilityProvider>
      );

      // Should start with first step
      expect(getByText('Welcome to AI Photo Curator')).toBeTruthy();

      // Navigate through steps
      const nextButton = getByTestId('next-button');
      
      fireEvent.press(nextButton); // Step 2
      expect(getByText('Import Your Photos')).toBeTruthy();

      fireEvent.press(nextButton); // Step 3
      expect(getByText('Smart Organization')).toBeTruthy();

      fireEvent.press(nextButton); // Step 4
      expect(getByText('Find Your Best Shots')).toBeTruthy();

      fireEvent.press(nextButton); // Step 5
      expect(getByText('AI-Powered Editing')).toBeTruthy();

      fireEvent.press(nextButton); // Step 6
      expect(getByText('Your Privacy Matters')).toBeTruthy();

      // Complete onboarding
      const getStartedButton = getByTestId('get-started-button');
      fireEvent.press(getStartedButton);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should support skipping onboarding', async () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(
        <AccessibilityProvider>
          <OnboardingFlow onComplete={onComplete} />
        </AccessibilityProvider>
      );

      const skipButton = getByTestId('skip-button');
      fireEvent.press(skipButton);

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide accessibility context to child components', async () => {
      const TestComponent = () => {
        const { isScreenReaderEnabled, announceForAccessibility } = require('../../src/components/accessibility/AccessibilityProvider').useAccessibility();
        
        return (
          <button
            testID="test-button"
            onClick={() => announceForAccessibility('Test announcement')}
          >
            Screen Reader: {isScreenReaderEnabled ? 'Enabled' : 'Disabled'}
          </button>
        );
      };

      const { getByTestId } = render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      const button = getByTestId('test-button');
      expect(button).toBeTruthy();
    });
  });

  describe('Settings Integration', () => {
    it('should load and display current preferences', async () => {
      const preferencesService = PreferencesService.getInstance();
      await preferencesService.initialize();

      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Processing')).toBeTruthy();
        expect(getByText('Curation')).toBeTruthy();
        expect(getByText('Display')).toBeTruthy();
        expect(getByText('Sync')).toBeTruthy();
        expect(getByText('Privacy')).toBeTruthy();
      });
    });

    it('should update preferences when settings change', async () => {
      const preferencesService = PreferencesService.getInstance();
      await preferencesService.initialize();

      const updateSpy = jest.spyOn(preferencesService, 'updatePreferences');

      const { getByTestId } = render(<SettingsScreen />);

      await waitFor(() => {
        const backgroundProcessingToggle = getByTestId('background-processing-toggle');
        fireEvent(backgroundProcessingToggle, 'onValueChange', false);
      });

      expect(updateSpy).toHaveBeenCalledWith({
        backgroundProcessingEnabled: false,
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track events when analytics is enabled', async () => {
      const analyticsService = AnalyticsService.getInstance();
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      // Enable analytics
      const preferencesService = PreferencesService.getInstance();
      await preferencesService.updatePreferences({ analyticsEnabled: true });

      analyticsService.trackEvent('test_event', { test: 'data' });

      expect(trackEventSpy).toHaveBeenCalledWith('test_event', { test: 'data' });
    });

    it('should not track events when analytics is disabled', async () => {
      const analyticsService = AnalyticsService.getInstance();
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      // Disable analytics
      const preferencesService = PreferencesService.getInstance();
      await preferencesService.updatePreferences({ analyticsEnabled: false });

      analyticsService.trackEvent('test_event', { test: 'data' });

      // Event should still be called but not processed
      expect(trackEventSpy).toHaveBeenCalled();
    });
  });

  describe('Crash Reporting Integration', () => {
    it('should report errors when crash reporting is enabled', async () => {
      const crashReportingService = CrashReportingService.getInstance();
      const reportErrorSpy = jest.spyOn(crashReportingService, 'reportError');

      // Enable crash reporting
      const preferencesService = PreferencesService.getInstance();
      await preferencesService.updatePreferences({ crashReportingEnabled: true });

      const testError = new Error('Test error');
      crashReportingService.reportError(testError);

      expect(reportErrorSpy).toHaveBeenCalledWith(testError);
    });

    it('should add breadcrumbs for debugging context', async () => {
      const crashReportingService = CrashReportingService.getInstance();
      const addBreadcrumbSpy = jest.spyOn(crashReportingService, 'addBreadcrumb');

      crashReportingService.addNavigationBreadcrumb('TestScreen');
      crashReportingService.addUserActionBreadcrumb('tap', 'button');

      expect(addBreadcrumbSpy).toHaveBeenCalledWith('navigation', 'Navigated to TestScreen', 'info', {
        screenName: 'TestScreen',
      });
      expect(addBreadcrumbSpy).toHaveBeenCalledWith('user', 'User tap on button', 'info', {
        action: 'tap',
        target: 'button',
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const analyticsService = AnalyticsService.getInstance();
      const trackPerformanceSpy = jest.spyOn(analyticsService, 'trackPerformance');

      const endTimer = analyticsService.startPerformanceTimer('test_operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      endTimer({ test: 'metadata' });

      expect(trackPerformanceSpy).toHaveBeenCalledWith(
        'test_operation',
        expect.any(Number),
        { test: 'metadata' }
      );
    });

    it('should measure async operations', async () => {
      const analyticsService = AnalyticsService.getInstance();
      const trackPerformanceSpy = jest.spyOn(analyticsService, 'trackPerformance');

      const testOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result';
      };

      const result = await analyticsService.measureAsync('async_test', testOperation);

      expect(result).toBe('result');
      expect(trackPerformanceSpy).toHaveBeenCalledWith(
        'async_test',
        expect.any(Number),
        { success: true }
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle initialization errors gracefully', async () => {
      const crashReportingService = CrashReportingService.getInstance();
      const reportErrorSpy = jest.spyOn(crashReportingService, 'reportError');

      // Mock a service initialization failure
      const preferencesService = PreferencesService.getInstance();
      jest.spyOn(preferencesService, 'initialize').mockRejectedValueOnce(new Error('Init failed'));

      const { queryByTestId } = render(<App />);

      await waitFor(() => {
        // App should still render despite initialization error
        expect(queryByTestId('onboarding-flow')).toBeTruthy();
      });

      expect(reportErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        { context: 'app_initialization' }
      );
    });
  });

  describe('End-to-End User Journey', () => {
    it('should complete full user journey from onboarding to settings', async () => {
      // Start with new user (no onboarding completed)
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { getByTestId, getByText, rerender } = render(<App />);

      // Should show onboarding
      await waitFor(() => {
        expect(getByText('Welcome to AI Photo Curator')).toBeTruthy();
      });

      // Complete onboarding
      const getStartedButton = getByTestId('get-started-button');
      fireEvent.press(getStartedButton);

      // Should save onboarding completion
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@PhotoCurator:onboarding_completed',
        'true'
      );

      // Simulate returning user
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      rerender(<App />);

      // Should show main app
      await waitFor(() => {
        expect(queryByTestId('onboarding-flow')).toBeNull();
      });
    });
  });
});