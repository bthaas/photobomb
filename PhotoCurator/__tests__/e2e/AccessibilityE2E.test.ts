import { device, element, by, expect as detoxExpect } from 'detox';

describe('Accessibility E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Enable accessibility for testing
    await device.setAccessibilityEnabled(true);
  });

  describe('Screen Reader Navigation', () => {
    it('should navigate through onboarding with screen reader', async () => {
      // Skip login for this test
      await element(by.id('skip-login')).tap();
      
      // Should show onboarding
      await detoxExpect(element(by.id('onboarding-flow'))).toBeVisible();
      
      // Navigate through onboarding steps
      await detoxExpected(element(by.accessibilityLabel(/Step 1 of/))).toBeVisible();
      
      await element(by.id('next-button')).tap();
      await detoxExpected(element(by.accessibilityLabel(/Step 2 of/))).toBeVisible();
      
      await element(by.id('next-button')).tap();
      await detoxExpected(element(by.accessibilityLabel(/Step 3 of/))).toBeVisible();
      
      // Complete onboarding
      await element(by.id('get-started-button')).tap();
      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    });

    it('should provide proper accessibility labels for photos', async () => {
      await element(by.id('library-tab')).tap();
      await detoxExpect(element(by.id('library-screen'))).toBeVisible();
      
      // Check photo accessibility labels
      const firstPhoto = element(by.id('photo-grid-item-0'));
      await detoxExpect(firstPhoto).toHaveAccessibilityLabel(/Photo 1 of/);
      
      // Tap photo to view details
      await firstPhoto.tap();
      await detoxExpect(element(by.id('photo-detail-view'))).toBeVisible();
      
      // Check detail view accessibility
      await detoxExpect(element(by.accessibilityLabel(/Photo details/))).toBeVisible();
    });

    it('should announce important state changes', async () => {
      await element(by.id('curation-tab')).tap();
      await detoxExpect(element(by.id('curation-screen'))).toBeVisible();
      
      // Start curation process
      await element(by.id('start-curation-button')).tap();
      
      // Should announce progress
      await detoxExpect(element(by.accessibilityLabel(/Curation in progress/))).toBeVisible();
      
      // Wait for completion
      await detoxExpect(element(by.accessibilityLabel(/Curation complete/))).toBeVisible();
    });
  });

  describe('High Contrast Mode', () => {
    it('should adapt UI for high contrast mode', async () => {
      // Enable high contrast mode
      await device.setAccessibilityHighContrast(true);
      
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('settings-screen'))).toBeVisible();
      
      // UI should adapt to high contrast
      await detoxExpect(element(by.id('high-contrast-ui'))).toBeVisible();
    });
  });

  describe('Large Text Support', () => {
    it('should scale text appropriately for large text settings', async () => {
      // Enable large text
      await device.setAccessibilityLargeText(true);
      
      await element(by.id('home-screen')).tap();
      
      // Text should be larger and still readable
      await detoxExpect(element(by.id('large-text-content'))).toBeVisible();
    });
  });

  describe('Voice Control', () => {
    it('should support voice control commands', async () => {
      // Enable voice control
      await device.setAccessibilityVoiceControl(true);
      
      // Test voice commands
      await device.sendVoiceCommand('Open library');
      await detoxExpect(element(by.id('library-screen'))).toBeVisible();
      
      await device.sendVoiceCommand('Select first photo');
      await detoxExpect(element(by.id('photo-detail-view'))).toBeVisible();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation', async () => {
      // Connect external keyboard
      await device.setKeyboardEnabled(true);
      
      await element(by.id('library-tab')).tap();
      
      // Navigate with keyboard
      await device.sendKeyEvent('Tab');
      await device.sendKeyEvent('Tab');
      await device.sendKeyEvent('Enter');
      
      // Should navigate to photo detail
      await detoxExpect(element(by.id('photo-detail-view'))).toBeVisible();
    });
  });

  describe('Reduced Motion', () => {
    it('should respect reduced motion preferences', async () => {
      // Enable reduced motion
      await device.setAccessibilityReduceMotion(true);
      
      await element(by.id('library-tab')).tap();
      await element(by.id('photo-grid-item-0')).tap();
      
      // Animations should be reduced or disabled
      await detoxExpect(element(by.id('reduced-motion-ui'))).toBeVisible();
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly during navigation', async () => {
      await element(by.id('library-tab')).tap();
      
      // Focus should be on the first focusable element
      await detoxExpect(element(by.id('photo-grid'))).toBeFocused();
      
      // Navigate to photo detail
      await element(by.id('photo-grid-item-0')).tap();
      
      // Focus should move to photo detail
      await detoxExpect(element(by.id('photo-detail-view'))).toBeFocused();
      
      // Go back
      await element(by.id('back-button')).tap();
      
      // Focus should return to grid
      await detoxExpect(element(by.id('photo-grid'))).toBeFocused();
    });
  });

  describe('Error Accessibility', () => {
    it('should announce errors accessibly', async () => {
      // Trigger an error condition
      await element(by.id('import-tab')).tap();
      await element(by.id('import-invalid-source')).tap();
      
      // Error should be announced
      await detoxExpect(element(by.accessibilityLabel(/Error:/))).toBeVisible();
      
      // Error should be focusable
      await detoxExpect(element(by.id('error-message'))).toBeFocused();
    });
  });

  afterEach(async () => {
    // Reset accessibility settings
    await device.setAccessibilityEnabled(false);
    await device.setAccessibilityHighContrast(false);
    await device.setAccessibilityLargeText(false);
    await device.setAccessibilityVoiceControl(false);
    await device.setAccessibilityReduceMotion(false);
    await device.setKeyboardEnabled(false);
  });
});