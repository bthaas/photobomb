import { device, element, by, expect as detoxExpect } from 'detox';

describe('Photo Curator E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should complete login flow successfully', async () => {
      // Navigate to login screen
      await detoxExpect(element(by.id('login-screen'))).toBeVisible();
      
      // Enter credentials
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('password123');
      
      // Tap login button
      await element(by.id('login-button')).tap();
      
      // Verify navigation to home screen
      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    });

    it('should handle registration flow', async () => {
      await element(by.id('register-link')).tap();
      await detoxExpect(element(by.id('register-screen'))).toBeVisible();
      
      await element(by.id('register-email-input')).typeText('newuser@example.com');
      await element(by.id('register-password-input')).typeText('newpassword123');
      await element(by.id('register-confirm-password-input')).typeText('newpassword123');
      
      await element(by.id('register-button')).tap();
      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    });
  });

  describe('Photo Import Flow', () => {
    it('should import photos from camera roll', async () => {
      await element(by.id('import-tab')).tap();
      await detoxExpect(element(by.id('photo-import-screen'))).toBeVisible();
      
      await element(by.id('camera-roll-button')).tap();
      await detoxExpect(element(by.id('photo-selection-grid'))).toBeVisible();
      
      // Select first photo
      await element(by.id('photo-item-0')).tap();
      await element(by.id('import-selected-button')).tap();
      
      // Verify import progress
      await detoxExpect(element(by.id('import-progress'))).toBeVisible();
    });
  });

  describe('Photo Library Navigation', () => {
    it('should navigate through photo library', async () => {
      await element(by.id('library-tab')).tap();
      await detoxExpect(element(by.id('library-screen'))).toBeVisible();
      
      // Test grid view
      await detoxExpect(element(by.id('photo-grid'))).toBeVisible();
      
      // Tap on first photo
      await element(by.id('photo-grid-item-0')).tap();
      await detoxExpect(element(by.id('photo-detail-view'))).toBeVisible();
      
      // Test photo zoom
      await element(by.id('photo-zoom-view')).pinch(1.5, 'slow');
      await element(by.id('photo-zoom-view')).pinch(0.5, 'slow');
    });

    it('should switch between view modes', async () => {
      await element(by.id('library-tab')).tap();
      
      // Switch to cluster view
      await element(by.id('cluster-view-button')).tap();
      await detoxExpect(element(by.id('cluster-view'))).toBeVisible();
      
      // Switch back to grid view
      await element(by.id('grid-view-button')).tap();
      await detoxExpect(element(by.id('photo-grid'))).toBeVisible();
    });
  });

  describe('Curation Flow', () => {
    it('should complete photo curation process', async () => {
      await element(by.id('curation-tab')).tap();
      await detoxExpect(element(by.id('curation-screen'))).toBeVisible();
      
      // Select curation goal
      await element(by.id('curation-goal-selector')).tap();
      await element(by.text('Best Portraits')).tap();
      
      // Start curation
      await element(by.id('start-curation-button')).tap();
      
      // Wait for results
      await detoxExpect(element(by.id('curation-results'))).toBeVisible();
      
      // Review suggestions
      await element(by.id('curated-photo-0')).tap();
      await element(by.id('keep-photo-button')).tap();
    });
  });

  describe('Photo Editing Flow', () => {
    it('should edit photos successfully', async () => {
      await element(by.id('library-tab')).tap();
      await element(by.id('photo-grid-item-0')).tap();
      await element(by.id('edit-photo-button')).tap();
      
      await detoxExpect(element(by.id('photo-editing-screen'))).toBeVisible();
      
      // Test one-tap enhancement
      await element(by.id('enhance-button')).tap();
      await detoxExpect(element(by.id('enhancement-preview'))).toBeVisible();
      
      // Test crop
      await element(by.id('crop-button')).tap();
      await element(by.id('crop-overlay')).swipe('right', 'slow', 0.5);
      
      // Save changes
      await element(by.id('save-edit-button')).tap();
      await detoxExpect(element(by.id('photo-detail-view'))).toBeVisible();
    });
  });

  describe('Settings and Preferences', () => {
    it('should navigate settings and update preferences', async () => {
      await element(by.id('settings-tab')).tap();
      await detoxExpect(element(by.id('settings-screen'))).toBeVisible();
      
      // Test background processing settings
      await element(by.id('background-processing-setting')).tap();
      await element(by.id('processing-intensity-slider')).swipe('right', 'slow', 0.3);
      
      // Test sync settings
      await element(by.id('sync-settings')).tap();
      await element(by.id('auto-sync-toggle')).tap();
      
      // Save settings
      await element(by.id('save-settings-button')).tap();
    });
  });

  describe('Offline Mode', () => {
    it('should work in offline mode', async () => {
      await device.setURLBlacklist(['*']);
      
      await element(by.id('library-tab')).tap();
      await detoxExpect(element(by.id('library-screen'))).toBeVisible();
      
      // Verify offline indicator
      await detoxExpect(element(by.id('offline-indicator'))).toBeVisible();
      
      // Test local functionality
      await element(by.id('photo-grid-item-0')).tap();
      await detoxExpect(element(by.id('photo-detail-view'))).toBeVisible();
      
      await device.setURLBlacklist([]);
    });
  });
});