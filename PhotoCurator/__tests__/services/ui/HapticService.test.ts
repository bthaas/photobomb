import { HapticService } from '../../../src/services/ui/HapticService';
import HapticFeedback from 'react-native-haptic-feedback';
import { Platform } from 'react-native';

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError',
    selection: 'selection',
    rigid: 'rigid',
    soft: 'soft',
    keyboardTap: 'keyboardTap',
    contextClick: 'contextClick',
    longPress: 'longPress',
    effectDoubleClick: 'effectDoubleClick',
    effectHeavyClick: 'effectHeavyClick',
    clockTick: 'clockTick',
    effectTick: 'effectTick',
    virtualKey: 'virtualKey',
  },
}));

describe('HapticService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('light haptic feedback', () => {
    it('should trigger impactLight on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.light();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactLight',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });

    it('should trigger keyboardTap on Android', () => {
      Platform.OS = 'android';
      
      HapticService.light();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'keyboardTap',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });

    it('should use custom options when provided', () => {
      Platform.OS = 'ios';
      const customOptions = {
        enableVibrateFallback: false,
        ignoreAndroidSystemSettings: true,
      };
      
      HapticService.light(customOptions);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactLight',
        customOptions
      );
    });
  });

  describe('medium haptic feedback', () => {
    it('should trigger impactMedium on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.medium();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactMedium',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });

    it('should trigger contextClick on Android', () => {
      Platform.OS = 'android';
      
      HapticService.medium();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'contextClick',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });
  });

  describe('heavy haptic feedback', () => {
    it('should trigger impactHeavy on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.heavy();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactHeavy',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });

    it('should trigger longPress on Android', () => {
      Platform.OS = 'android';
      
      HapticService.heavy();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'longPress',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });
  });

  describe('success haptic feedback', () => {
    it('should trigger notificationSuccess on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.success();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationSuccess',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });

    it('should trigger effectDoubleClick on Android', () => {
      Platform.OS = 'android';
      
      HapticService.success();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'effectDoubleClick',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });
  });

  describe('warning haptic feedback', () => {
    it('should trigger notificationWarning on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.warning();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationWarning',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });
  });

  describe('error haptic feedback', () => {
    it('should trigger notificationError on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.error();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationError',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });
  });

  describe('selection haptic feedback', () => {
    it('should trigger selection on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.selection();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'selection',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });

    it('should trigger clockTick on Android', () => {
      Platform.OS = 'android';
      
      HapticService.selection();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'clockTick',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });
  });

  describe('rigid haptic feedback', () => {
    it('should trigger rigid on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.rigid();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'rigid',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });
  });

  describe('soft haptic feedback', () => {
    it('should trigger soft on iOS', () => {
      Platform.OS = 'ios';
      
      HapticService.soft();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'soft',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    });
  });
});