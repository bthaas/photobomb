import HapticFeedback, { HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { Platform } from 'react-native';

export interface HapticOptions {
  enableVibrateFallback?: boolean;
  ignoreAndroidSystemSettings?: boolean;
}

export class HapticService {
  private static defaultOptions: HapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  };

  /**
   * Light haptic feedback for subtle interactions
   */
  static light(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.impactLight, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.keyboardTap, opts);
    }
  }

  /**
   * Medium haptic feedback for standard interactions
   */
  static medium(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.impactMedium, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.contextClick, opts);
    }
  }

  /**
   * Heavy haptic feedback for important interactions
   */
  static heavy(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.impactHeavy, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.longPress, opts);
    }
  }

  /**
   * Success haptic feedback
   */
  static success(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.notificationSuccess, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.effectDoubleClick, opts);
    }
  }

  /**
   * Warning haptic feedback
   */
  static warning(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.notificationWarning, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.effectHeavyClick, opts);
    }
  }

  /**
   * Error haptic feedback
   */
  static error(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.notificationError, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.effectDoubleClick, opts);
    }
  }

  /**
   * Selection haptic feedback for photo selection
   */
  static selection(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.selection, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.clockTick, opts);
    }
  }

  /**
   * Rigid haptic feedback for strong interactions
   */
  static rigid(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.rigid, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.effectTick, opts);
    }
  }

  /**
   * Soft haptic feedback for gentle interactions
   */
  static soft(options?: HapticOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'ios') {
      HapticFeedback.trigger(HapticFeedbackTypes.soft, opts);
    } else {
      HapticFeedback.trigger(HapticFeedbackTypes.virtualKey, opts);
    }
  }
}