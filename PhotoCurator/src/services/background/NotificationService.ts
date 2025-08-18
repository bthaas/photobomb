import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { BackgroundTask, TaskStatus, NotificationConfig } from '../../types/background';

export class NotificationService {
  private static instance: NotificationService;
  private config: NotificationConfig = {
    showProgress: true,
    showCompletion: true,
    showErrors: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };
  private progressNotificationId: string | null = null;

  private constructor() {
    this.initializeNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initializeNotifications(): void {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('Notification token:', token);
      },
      onNotification: (notification) => {
        console.log('Notification received:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'photo_processing',
          channelName: 'Photo Processing',
          channelDescription: 'Notifications for photo processing tasks',
          playSound: this.config.soundEnabled,
          soundName: 'default',
          importance: 4,
          vibrate: this.config.vibrationEnabled,
        },
        (created) => console.log(`Notification channel created: ${created}`)
      );
    }
  }

  public updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  public showProgressNotification(
    task: BackgroundTask,
    progress: number,
    stage: string,
    estimatedTimeRemaining?: number
  ): void {
    if (!this.config.showProgress) {
      return;
    }

    const title = this.getTaskTitle(task);
    const message = this.getProgressMessage(progress, stage, estimatedTimeRemaining);

    if (Platform.OS === 'android') {
      // Update existing progress notification or create new one
      const notificationId = this.progressNotificationId || `progress_${task.id}`;
      this.progressNotificationId = notificationId;

      PushNotification.localNotification({
        id: notificationId,
        channelId: 'photo_processing',
        title,
        message,
        ongoing: true,
        autoCancel: false,
        playSound: false,
        vibrate: false,
        progress: {
          max: 100,
          current: Math.round(progress),
          indeterminate: false,
        },
        actions: ['Cancel'],
        invokeApp: false,
      });
    } else {
      // iOS doesn't support progress notifications, so we'll show periodic updates
      if (progress % 25 === 0 || progress === 100) {
        PushNotification.localNotification({
          title,
          message,
          playSound: false,
          vibrate: false,
        });
      }
    }
  }

  public showCompletionNotification(task: BackgroundTask, totalProcessed: number): void {
    if (!this.config.showCompletion) {
      return;
    }

    // Clear progress notification
    this.clearProgressNotification();

    const title = 'Photo Processing Complete';
    const message = this.getCompletionMessage(task, totalProcessed);

    PushNotification.localNotification({
      channelId: Platform.OS === 'android' ? 'photo_processing' : undefined,
      title,
      message,
      playSound: this.config.soundEnabled,
      vibrate: this.config.vibrationEnabled,
      autoCancel: true,
    });
  }

  public showErrorNotification(task: BackgroundTask, error: string): void {
    if (!this.config.showErrors) {
      return;
    }

    // Clear progress notification
    this.clearProgressNotification();

    const title = 'Photo Processing Error';
    const message = this.getErrorMessage(task, error);

    PushNotification.localNotification({
      channelId: Platform.OS === 'android' ? 'photo_processing' : undefined,
      title,
      message,
      playSound: this.config.soundEnabled,
      vibrate: this.config.vibrationEnabled,
      autoCancel: true,
      actions: ['Retry', 'Dismiss'],
    });
  }

  public showBatchCompletionNotification(
    completedTasks: number,
    failedTasks: number,
    totalPhotos: number
  ): void {
    if (!this.config.showCompletion) {
      return;
    }

    const title = 'Batch Processing Complete';
    let message = `Processed ${totalPhotos} photos`;
    
    if (failedTasks > 0) {
      message += ` (${failedTasks} failed)`;
    }

    PushNotification.localNotification({
      channelId: Platform.OS === 'android' ? 'photo_processing' : undefined,
      title,
      message,
      playSound: this.config.soundEnabled,
      vibrate: this.config.vibrationEnabled,
      autoCancel: true,
    });
  }

  public clearProgressNotification(): void {
    if (this.progressNotificationId) {
      PushNotification.cancelLocalNotifications({
        id: this.progressNotificationId,
      });
      this.progressNotificationId = null;
    }
  }

  public clearAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
    this.progressNotificationId = null;
  }

  private getTaskTitle(task: BackgroundTask): string {
    switch (task.type) {
      case 'photo_analysis':
        return 'Analyzing Photos';
      case 'face_detection':
        return 'Detecting Faces';
      case 'clustering':
        return 'Organizing Photos';
      case 'curation':
        return 'Curating Best Shots';
      case 'sync':
        return 'Syncing Photos';
      default:
        return 'Processing Photos';
    }
  }

  private getProgressMessage(
    progress: number,
    stage: string,
    estimatedTimeRemaining?: number
  ): string {
    let message = `${Math.round(progress)}% complete`;
    
    if (stage) {
      message += ` - ${stage}`;
    }
    
    if (estimatedTimeRemaining && estimatedTimeRemaining > 0) {
      const minutes = Math.ceil(estimatedTimeRemaining / 60);
      message += ` (${minutes}m remaining)`;
    }
    
    return message;
  }

  private getCompletionMessage(task: BackgroundTask, totalProcessed: number): string {
    switch (task.type) {
      case 'photo_analysis':
        return `Analyzed ${totalProcessed} photos`;
      case 'face_detection':
        return `Detected faces in ${totalProcessed} photos`;
      case 'clustering':
        return `Organized ${totalProcessed} photos into groups`;
      case 'curation':
        return `Curated best shots from ${totalProcessed} photos`;
      case 'sync':
        return `Synced ${totalProcessed} photos`;
      default:
        return `Processed ${totalProcessed} photos`;
    }
  }

  private getErrorMessage(task: BackgroundTask, error: string): string {
    const taskName = this.getTaskTitle(task).toLowerCase();
    return `Failed ${taskName}: ${error}`;
  }
}