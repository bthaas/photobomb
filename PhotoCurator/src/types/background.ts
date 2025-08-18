export interface BackgroundTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  data: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export enum TaskType {
  PHOTO_ANALYSIS = 'photo_analysis',
  FACE_DETECTION = 'face_detection',
  CLUSTERING = 'clustering',
  CURATION = 'curation',
  SYNC = 'sync',
}

export enum TaskPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export interface ResourceMonitor {
  batteryLevel: number;
  isCharging: boolean;
  memoryUsage: number;
  availableMemory: number;
  cpuUsage: number;
  thermalState: ThermalState;
}

export enum ThermalState {
  NOMINAL = 'nominal',
  FAIR = 'fair',
  SERIOUS = 'serious',
  CRITICAL = 'critical',
}

export interface ProcessingSettings {
  intensity: ProcessingIntensity;
  pauseOnLowBattery: boolean;
  pauseOnHighMemory: boolean;
  pauseOnThermalThrottling: boolean;
  maxConcurrentTasks: number;
  batteryThreshold: number;
  memoryThreshold: number;
}

export enum ProcessingIntensity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  AGGRESSIVE = 'aggressive',
}

export interface TaskResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime: number;
  resourcesUsed: {
    memory: number;
    cpu: number;
    battery: number;
  };
}

export interface BackgroundProcessingState {
  isProcessing: boolean;
  currentTask?: BackgroundTask;
  queueLength: number;
  completedTasks: number;
  failedTasks: number;
  totalProgress: number;
  estimatedTimeRemaining?: number;
  settings: ProcessingSettings;
  resourceStatus: ResourceMonitor;
}

export interface TaskProgressUpdate {
  taskId: string;
  progress: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

export interface NotificationConfig {
  showProgress: boolean;
  showCompletion: boolean;
  showErrors: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}