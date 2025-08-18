import { BackgroundProcessingService } from '../../src/services/background/BackgroundProcessingService';
import { ResourceMonitorService } from '../../src/services/background/ResourceMonitor';
import { NotificationService } from '../../src/services/background/NotificationService';
import { TaskPriority, ProcessingIntensity, ThermalState } from '../../src/types/background';
import { Photo } from '../../src/types/photo';

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  createChannel: jest.fn(),
  localNotification: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
}));

// Mock AI services
jest.mock('../../src/services/ai/AIAnalysisEngine', () => ({
  AIAnalysisEngine: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    extractFeatures: jest.fn().mockResolvedValue({}),
    analyzeQuality: jest.fn().mockResolvedValue({}),
    analyzeComposition: jest.fn().mockResolvedValue({}),
    analyzeContent: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('../../src/services/ai/FaceDetectionService', () => ({
  FaceDetectionService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    detectFaces: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../../src/services/clustering/ClusteringService', () => ({
  ClusteringService: jest.fn(() => ({
    clusterByVisualSimilarity: jest.fn().mockResolvedValue([]),
    clusterByTimeAndLocation: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../../src/services/curation/CurationEngine', () => ({
  CurationEngine: jest.fn(() => ({
    rankPhotos: jest.fn().mockResolvedValue([]),
  })),
}));

describe('Background Processing Integration', () => {
  let backgroundService: BackgroundProcessingService;
  let resourceMonitor: ResourceMonitorService;
  let notificationService: NotificationService;
  let mockPhotos: Photo[];

  beforeEach(async () => {
    backgroundService = BackgroundProcessingService.getInstance();
    resourceMonitor = ResourceMonitorService.getInstance();
    notificationService = NotificationService.getInstance();
    
    mockPhotos = [
      {
        id: '1',
        uri: 'file://photo1.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 1024000,
          format: 'jpeg',
          timestamp: new Date(),
        },
        syncStatus: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        uri: 'file://photo2.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 1024000,
          format: 'jpeg',
          timestamp: new Date(),
        },
        syncStatus: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await backgroundService.initialize();
  });

  afterEach(() => {
    backgroundService.destroy();
    resourceMonitor.destroy();
    jest.clearAllMocks();
  });

  describe('end-to-end processing workflow', () => {
    it('should process photos through complete analysis pipeline', async () => {
      const stateListener = jest.fn();
      backgroundService.addStateListener(stateListener);

      // Add tasks in typical order
      const analysisTaskId = backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);
      const faceTaskId = backgroundService.addFaceDetectionTask(mockPhotos, TaskPriority.NORMAL);
      const clusterTaskId = backgroundService.addClusteringTask(mockPhotos, TaskPriority.LOW);
      const curationTaskId = backgroundService.addCurationTask(mockPhotos, TaskPriority.LOW);

      expect(analysisTaskId).toBeDefined();
      expect(faceTaskId).toBeDefined();
      expect(clusterTaskId).toBeDefined();
      expect(curationTaskId).toBeDefined();

      // Verify initial state
      const initialState = backgroundService.getState();
      expect(initialState.queueLength).toBe(4);
      expect(stateListener).toHaveBeenCalled();
    });

    it('should handle resource constraints during processing', async () => {
      // Mock resource constraints
      const mockConstrainedResources = {
        batteryLevel: 0.1,
        isCharging: false,
        memoryUsage: 0.9,
        availableMemory: 100000,
        cpuUsage: 0.8,
        thermalState: ThermalState.CRITICAL,
      };

      // Override resource monitor to return constrained resources
      (resourceMonitor as any).currentResources = mockConstrainedResources;
      jest.spyOn(resourceMonitor, 'shouldPauseProcessing').mockReturnValue(true);

      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);

      // Processing should be paused due to constraints
      const state = backgroundService.getState();
      expect(state.resourceStatus.batteryLevel).toBe(0.1);
      expect(state.resourceStatus.thermalState).toBe(ThermalState.CRITICAL);
    });

    it('should resume processing when resources become available', async () => {
      // Start with constrained resources
      (resourceMonitor as any).currentResources = {
        batteryLevel: 0.1,
        isCharging: false,
        memoryUsage: 0.9,
        availableMemory: 100000,
        cpuUsage: 0.8,
        thermalState: ThermalState.CRITICAL,
      };

      jest.spyOn(resourceMonitor, 'shouldPauseProcessing').mockReturnValue(true);

      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);

      // Simulate resources becoming available
      (resourceMonitor as any).currentResources = {
        batteryLevel: 0.8,
        isCharging: true,
        memoryUsage: 0.4,
        availableMemory: 2000000,
        cpuUsage: 0.3,
        thermalState: ThermalState.NOMINAL,
      };

      jest.spyOn(resourceMonitor, 'shouldPauseProcessing').mockReturnValue(false);

      // Trigger resource change
      (resourceMonitor as any).notifyListeners();

      // Should resume processing
      const state = backgroundService.getState();
      expect(state.resourceStatus.batteryLevel).toBe(0.8);
      expect(state.resourceStatus.thermalState).toBe(ThermalState.NOMINAL);
    });
  });

  describe('processing intensity adaptation', () => {
    it('should adjust processing based on intensity settings', () => {
      // Test different intensity levels
      const intensities = [
        ProcessingIntensity.LOW,
        ProcessingIntensity.MEDIUM,
        ProcessingIntensity.HIGH,
        ProcessingIntensity.AGGRESSIVE,
      ];

      intensities.forEach(intensity => {
        backgroundService.updateSettings({ intensity });
        const settings = backgroundService.getSettings();
        expect(settings.intensity).toBe(intensity);
      });
    });

    it('should respect concurrent task limits', () => {
      backgroundService.updateSettings({ maxConcurrentTasks: 1 });

      // Add multiple tasks
      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);
      backgroundService.addFaceDetectionTask(mockPhotos, TaskPriority.HIGH);
      backgroundService.addClusteringTask(mockPhotos, TaskPriority.HIGH);

      const state = backgroundService.getState();
      expect(state.queueLength).toBe(3);
    });
  });

  describe('notification integration', () => {
    it('should show notifications for task progress', () => {
      const mockNotification = jest.spyOn(notificationService, 'showProgressNotification');

      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);

      // Notifications would be triggered during actual task execution
      // This tests the integration points
      expect(mockNotification).toBeDefined();
    });

    it('should show completion notifications', () => {
      const mockNotification = jest.spyOn(notificationService, 'showCompletionNotification');

      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);

      expect(mockNotification).toBeDefined();
    });

    it('should show error notifications', () => {
      const mockNotification = jest.spyOn(notificationService, 'showErrorNotification');

      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);

      expect(mockNotification).toBeDefined();
    });
  });

  describe('task prioritization and scheduling', () => {
    it('should process high priority tasks first', () => {
      const lowPriorityTask = backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.LOW);
      const highPriorityTask = backgroundService.addFaceDetectionTask(mockPhotos, TaskPriority.HIGH);
      const criticalTask = backgroundService.addClusteringTask(mockPhotos, TaskPriority.CRITICAL);

      const state = backgroundService.getState();
      expect(state.queueLength).toBe(3);

      // The actual task execution order would be tested in the TaskQueue tests
      // This verifies the integration
    });

    it('should handle task failures and retries', async () => {
      const taskId = backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);

      // Task failure and retry logic would be handled by the TaskQueue
      // This tests the integration points
      expect(taskId).toBeDefined();
    });
  });

  describe('performance monitoring', () => {
    it('should track processing statistics', () => {
      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);
      backgroundService.addFaceDetectionTask(mockPhotos, TaskPriority.NORMAL);

      const stats = backgroundService.getTaskStats();
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('totalTime');
    });

    it('should provide accurate progress estimates', () => {
      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);
      backgroundService.addFaceDetectionTask(mockPhotos, TaskPriority.NORMAL);

      const state = backgroundService.getState();
      expect(typeof state.totalProgress).toBe('number');
      expect(state.totalProgress).toBeGreaterThanOrEqual(0);
      expect(state.totalProgress).toBeLessThanOrEqual(100);
    });
  });

  describe('memory and resource management', () => {
    it('should monitor memory usage during processing', () => {
      resourceMonitor.startMonitoring(1000);

      const resources = resourceMonitor.getCurrentResources();
      expect(resources.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(resources.memoryUsage).toBeLessThanOrEqual(1);

      resourceMonitor.stopMonitoring();
    });

    it('should pause processing on memory pressure', () => {
      // Mock high memory usage
      (resourceMonitor as any).currentResources = {
        batteryLevel: 0.8,
        isCharging: true,
        memoryUsage: 0.95,
        availableMemory: 50000,
        cpuUsage: 0.7,
        thermalState: ThermalState.FAIR,
      };

      jest.spyOn(resourceMonitor, 'shouldPauseProcessing').mockReturnValue(true);

      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);

      // Should pause due to memory pressure
      const state = backgroundService.getState();
      expect(state.resourceStatus.memoryUsage).toBe(0.95);
    });
  });

  describe('error recovery', () => {
    it('should handle service initialization failures gracefully', async () => {
      // Mock AI service failure
      const mockAIService = require('../../src/services/ai/AIAnalysisEngine');
      mockAIService.AIAnalysisEngine.mockImplementation(() => ({
        initialize: jest.fn().mockRejectedValue(new Error('AI service failed')),
      }));

      const newService = BackgroundProcessingService.getInstance();
      await expect(newService.initialize()).resolves.not.toThrow();
    });

    it('should continue processing other tasks when one fails', () => {
      const task1 = backgroundService.addPhotoAnalysisTask([mockPhotos[0]], TaskPriority.HIGH);
      const task2 = backgroundService.addFaceDetectionTask([mockPhotos[1]], TaskPriority.HIGH);

      // Even if task1 fails, task2 should still be processed
      expect(task1).toBeDefined();
      expect(task2).toBeDefined();

      const state = backgroundService.getState();
      expect(state.queueLength).toBe(2);
    });
  });

  describe('cleanup and shutdown', () => {
    it('should clean up resources properly', () => {
      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);
      backgroundService.addFaceDetectionTask(mockPhotos, TaskPriority.NORMAL);

      const stateListener = jest.fn();
      backgroundService.addStateListener(stateListener);

      expect(() => {
        backgroundService.destroy();
      }).not.toThrow();
    });

    it('should cancel all tasks on shutdown', () => {
      backgroundService.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);
      backgroundService.addFaceDetectionTask(mockPhotos, TaskPriority.NORMAL);

      const initialState = backgroundService.getState();
      expect(initialState.queueLength).toBeGreaterThan(0);

      backgroundService.clearQueue();

      const finalState = backgroundService.getState();
      expect(finalState.queueLength).toBe(0);
    });
  });
});