import { AppState, AppStateStatus } from 'react-native';
import { 
  BackgroundTask, 
  TaskType, 
  TaskPriority, 
  TaskStatus, 
  ProcessingSettings, 
  ProcessingIntensity,
  BackgroundProcessingState,
  TaskResult,
  TaskProgressUpdate
} from '../../types/background';
import { ResourceMonitorService } from './ResourceMonitor';
import { TaskQueue, TaskQueueEvent } from './TaskQueue';
import { NotificationService } from './NotificationService';
import { AIAnalysisEngine } from '../ai/AIAnalysisEngine';
import { FaceDetectionService } from '../ai/FaceDetectionService';
import { ClusteringService } from '../clustering/ClusteringService';
import { CurationEngine } from '../curation/CurationEngine';
import { Photo } from '../../types/photo';

export class BackgroundProcessingService {
  private static instance: BackgroundProcessingService;
  private resourceMonitor: ResourceMonitorService;
  private taskQueue: TaskQueue;
  private notificationService: NotificationService;
  private aiAnalysisEngine: AIAnalysisEngine;
  private faceDetectionService: FaceDetectionService;
  private clusteringService: ClusteringService;
  private curationEngine: CurationEngine;
  
  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  private listeners: ((state: BackgroundProcessingState) => void)[] = [];
  
  private settings: ProcessingSettings = {
    intensity: ProcessingIntensity.MEDIUM,
    pauseOnLowBattery: true,
    pauseOnHighMemory: true,
    pauseOnThermalThrottling: true,
    maxConcurrentTasks: 2,
    batteryThreshold: 0.2,
    memoryThreshold: 0.8,
  };

  private stats = {
    completedTasks: 0,
    failedTasks: 0,
    totalProcessingTime: 0,
  };

  private constructor() {
    this.resourceMonitor = ResourceMonitorService.getInstance();
    this.taskQueue = new TaskQueue(this.settings.maxConcurrentTasks);
    this.notificationService = NotificationService.getInstance();
    this.aiAnalysisEngine = new AIAnalysisEngine();
    this.faceDetectionService = new FaceDetectionService();
    this.clusteringService = new ClusteringService();
    this.curationEngine = new CurationEngine();
    
    this.setupListeners();
  }

  public static getInstance(): BackgroundProcessingService {
    if (!BackgroundProcessingService.instance) {
      BackgroundProcessingService.instance = new BackgroundProcessingService();
    }
    return BackgroundProcessingService.instance;
  }

  public async initialize(): Promise<void> {
    // Initialize AI services
    await this.aiAnalysisEngine.initialize();
    await this.faceDetectionService.initialize();
    
    // Start resource monitoring
    this.resourceMonitor.startMonitoring();
    
    // Start processing loop
    this.startProcessing();
  }

  public updateSettings(newSettings: Partial<ProcessingSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.taskQueue.setMaxConcurrentTasks(this.settings.maxConcurrentTasks);
    
    // Update processing intensity
    this.updateProcessingIntensity();
    
    this.notifyStateChange();
  }

  public getSettings(): ProcessingSettings {
    return { ...this.settings };
  }

  public addPhotoAnalysisTask(photos: Photo[], priority: TaskPriority = TaskPriority.NORMAL): string {
    return this.taskQueue.addTask({
      type: TaskType.PHOTO_ANALYSIS,
      priority,
      data: { photos },
      maxRetries: 3,
    });
  }

  public addFaceDetectionTask(photos: Photo[], priority: TaskPriority = TaskPriority.NORMAL): string {
    return this.taskQueue.addTask({
      type: TaskType.FACE_DETECTION,
      priority,
      data: { photos },
      maxRetries: 3,
    });
  }

  public addClusteringTask(photos: Photo[], priority: TaskPriority = TaskPriority.LOW): string {
    return this.taskQueue.addTask({
      type: TaskType.CLUSTERING,
      priority,
      data: { photos },
      maxRetries: 2,
    });
  }

  public addCurationTask(photos: Photo[], priority: TaskPriority = TaskPriority.LOW): string {
    return this.taskQueue.addTask({
      type: TaskType.CURATION,
      priority,
      data: { photos },
      maxRetries: 2,
    });
  }

  public pauseProcessing(): void {
    this.isPaused = true;
    this.notifyStateChange();
  }

  public resumeProcessing(): void {
    this.isPaused = false;
    this.notifyStateChange();
  }

  public cancelTask(taskId: string): boolean {
    return this.taskQueue.cancelTask(taskId);
  }

  public getState(): BackgroundProcessingState {
    const currentTask = this.getCurrentTask();
    const queueLength = this.taskQueue.getQueueLength();
    const runningTaskCount = this.taskQueue.getRunningTaskCount();
    
    return {
      isProcessing: this.isProcessing && !this.isPaused,
      currentTask,
      queueLength,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      totalProgress: this.calculateTotalProgress(),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(),
      settings: this.settings,
      resourceStatus: this.resourceMonitor.getCurrentResources(),
    };
  }

  public addStateListener(callback: (state: BackgroundProcessingState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public clearQueue(): void {
    this.taskQueue.clear();
    this.notifyStateChange();
  }

  public getTaskStats(): { completed: number; failed: number; totalTime: number } {
    return {
      completed: this.stats.completedTasks,
      failed: this.stats.failedTasks,
      totalTime: this.stats.totalProcessingTime,
    };
  }

  private setupListeners(): void {
    // Task queue events
    this.taskQueue.addListener((event: TaskQueueEvent) => {
      this.handleTaskQueueEvent(event);
    });

    // Resource monitor events
    this.resourceMonitor.addListener((resources) => {
      this.handleResourceChange();
    });

    // App state changes
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleTaskQueueEvent(event: TaskQueueEvent): void {
    switch (event.type) {
      case 'task_started':
        if (event.task) {
          this.notificationService.showProgressNotification(
            event.task,
            0,
            'Starting...'
          );
        }
        break;
        
      case 'task_completed':
        if (event.task) {
          this.stats.completedTasks++;
          if (event.result) {
            this.stats.totalProcessingTime += event.result.processingTime;
          }
          this.notificationService.showCompletionNotification(event.task, 1);
        }
        break;
        
      case 'task_failed':
        if (event.task) {
          this.stats.failedTasks++;
          this.notificationService.showErrorNotification(
            event.task,
            event.result?.error || 'Unknown error'
          );
        }
        break;
        
      case 'task_progress':
        if (event.task && event.progress !== undefined) {
          this.notificationService.showProgressNotification(
            event.task,
            event.progress,
            event.stage || 'Processing...'
          );
        }
        break;
    }
    
    this.notifyStateChange();
  }

  private handleResourceChange(): void {
    const shouldPause = this.resourceMonitor.shouldPauseProcessing(
      this.settings.batteryThreshold,
      this.settings.memoryThreshold
    );

    if (shouldPause && !this.isPaused) {
      console.log('Pausing processing due to resource constraints');
      this.pauseProcessing();
    } else if (!shouldPause && this.isPaused) {
      console.log('Resuming processing - resources available');
      this.resumeProcessing();
    }
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background') {
      // App went to background - continue processing but reduce intensity
      this.updateProcessingIntensity();
    } else if (nextAppState === 'active') {
      // App became active - restore normal processing
      this.updateProcessingIntensity();
    }
  }

  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processNextTask();
    }, this.getProcessingInterval());
    
    this.notifyStateChange();
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    this.isProcessing = false;
    this.notifyStateChange();
  }

  private async processNextTask(): Promise<void> {
    if (this.isPaused || this.resourceMonitor.shouldPauseProcessing(
      this.settings.batteryThreshold,
      this.settings.memoryThreshold
    )) {
      return;
    }

    const task = this.taskQueue.getNextTask();
    if (!task) {
      return;
    }

    try {
      const result = await this.executeTask(task);
      this.taskQueue.completeTask(task.id, result);
    } catch (error) {
      const errorResult: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: 0,
        resourcesUsed: { memory: 0, cpu: 0, battery: 0 },
      };
      this.taskQueue.completeTask(task.id, errorResult);
    }
  }

  private async executeTask(task: BackgroundTask): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (task.type) {
        case TaskType.PHOTO_ANALYSIS:
          result = await this.executePhotoAnalysis(task);
          break;
        case TaskType.FACE_DETECTION:
          result = await this.executeFaceDetection(task);
          break;
        case TaskType.CLUSTERING:
          result = await this.executeClustering(task);
          break;
        case TaskType.CURATION:
          result = await this.executeCuration(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        processingTime,
        resourcesUsed: {
          memory: 0, // Would be measured in real implementation
          cpu: 0,
          battery: 0,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        resourcesUsed: {
          memory: 0,
          cpu: 0,
          battery: 0,
        },
      };
    }
  }

  private async executePhotoAnalysis(task: BackgroundTask): Promise<any> {
    const { photos } = task.data;
    const results = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const progress = (i / photos.length) * 100;
      
      this.taskQueue.updateTaskProgress(task.id, progress, `Analyzing photo ${i + 1}/${photos.length}`);
      
      const features = await this.aiAnalysisEngine.extractFeatures(photo);
      const qualityScore = await this.aiAnalysisEngine.analyzeQuality(photo);
      const compositionScore = await this.aiAnalysisEngine.analyzeComposition(photo);
      const contentScore = await this.aiAnalysisEngine.analyzeContent(photo);
      
      results.push({
        photoId: photo.id,
        features,
        qualityScore,
        compositionScore,
        contentScore,
      });
    }
    
    return results;
  }

  private async executeFaceDetection(task: BackgroundTask): Promise<any> {
    const { photos } = task.data;
    const results = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const progress = (i / photos.length) * 100;
      
      this.taskQueue.updateTaskProgress(task.id, progress, `Detecting faces ${i + 1}/${photos.length}`);
      
      const faces = await this.faceDetectionService.detectFaces(photo);
      
      results.push({
        photoId: photo.id,
        faces,
      });
    }
    
    return results;
  }

  private async executeClustering(task: BackgroundTask): Promise<any> {
    const { photos } = task.data;
    
    this.taskQueue.updateTaskProgress(task.id, 25, 'Clustering by visual similarity');
    const visualClusters = await this.clusteringService.clusterByVisualSimilarity(photos);
    
    this.taskQueue.updateTaskProgress(task.id, 50, 'Clustering by time and location');
    const eventClusters = await this.clusteringService.clusterByTimeAndLocation(photos);
    
    this.taskQueue.updateTaskProgress(task.id, 75, 'Finalizing clusters');
    
    return {
      visualClusters,
      eventClusters,
    };
  }

  private async executeCuration(task: BackgroundTask): Promise<any> {
    const { photos } = task.data;
    
    this.taskQueue.updateTaskProgress(task.id, 50, 'Ranking photos');
    const rankedPhotos = await this.curationEngine.rankPhotos(photos, { type: 'best_overall' });
    
    return {
      rankedPhotos,
    };
  }

  private getCurrentTask(): BackgroundTask | undefined {
    const runningTasks = this.taskQueue.getTasksByStatus(TaskStatus.RUNNING);
    return runningTasks[0];
  }

  private calculateTotalProgress(): number {
    const allTasks = this.taskQueue.getAllTasks();
    if (allTasks.length === 0) {
      return 0;
    }
    
    const totalProgress = allTasks.reduce((sum, task) => sum + task.progress, 0);
    return totalProgress / allTasks.length;
  }

  private calculateEstimatedTimeRemaining(): number | undefined {
    const runningTasks = this.taskQueue.getTasksByStatus(TaskStatus.RUNNING);
    const pendingTasks = this.taskQueue.getTasksByStatus(TaskStatus.PENDING);
    
    if (runningTasks.length === 0 && pendingTasks.length === 0) {
      return undefined;
    }
    
    // Simple estimation based on average processing time
    const avgProcessingTime = this.stats.completedTasks > 0 
      ? this.stats.totalProcessingTime / this.stats.completedTasks 
      : 30000; // 30 seconds default
    
    const remainingTasks = runningTasks.length + pendingTasks.length;
    return (remainingTasks * avgProcessingTime) / 1000; // Convert to seconds
  }

  private getProcessingInterval(): number {
    switch (this.settings.intensity) {
      case ProcessingIntensity.LOW:
        return 2000; // 2 seconds
      case ProcessingIntensity.MEDIUM:
        return 1000; // 1 second
      case ProcessingIntensity.HIGH:
        return 500; // 0.5 seconds
      case ProcessingIntensity.AGGRESSIVE:
        return 100; // 0.1 seconds
      default:
        return 1000;
    }
  }

  private updateProcessingIntensity(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = setInterval(() => {
        this.processNextTask();
      }, this.getProcessingInterval());
    }
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.warn('Error in background processing state listener:', error);
      }
    });
  }

  public destroy(): void {
    this.stopProcessing();
    this.resourceMonitor.stopMonitoring();
    this.notificationService.clearAllNotifications();
    this.listeners = [];
  }
}