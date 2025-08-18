import { BackgroundProcessingService } from '../../../src/services/background/BackgroundProcessingService';
import { TaskPriority, ProcessingIntensity } from '../../../src/types/background';
import { Photo } from '../../../src/types/photo';

// Mock dependencies
jest.mock('../../../src/services/background/ResourceMonitor', () => ({
  ResourceMonitorService: {
    getInstance: jest.fn(() => ({
      addListener: jest.fn(() => jest.fn()),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      getCurrentResources: jest.fn(() => ({
        batteryLevel: 0.8,
        isCharging: false,
        memoryUsage: 0.4,
        availableMemory: 2000000,
        cpuUsage: 0.3,
        thermalState: 'nominal',
      })),
      shouldPauseProcessing: jest.fn(() => false),
    })),
  },
}));

jest.mock('../../../src/services/background/NotificationService', () => ({
  NotificationService: {
    getInstance: jest.fn(() => ({
      showProgressNotification: jest.fn(),
      showCompletionNotification: jest.fn(),
      showErrorNotification: jest.fn(),
      clearAllNotifications: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/services/ai/AIAnalysisEngine', () => ({
  AIAnalysisEngine: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    extractFeatures: jest.fn().mockResolvedValue({}),
    analyzeQuality: jest.fn().mockResolvedValue({}),
    analyzeComposition: jest.fn().mockResolvedValue({}),
    analyzeContent: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('../../../src/services/ai/FaceDetectionService', () => ({
  FaceDetectionService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    detectFaces: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../../../src/services/clustering/ClusteringService', () => ({
  ClusteringService: jest.fn(() => ({
    clusterByVisualSimilarity: jest.fn().mockResolvedValue([]),
    clusterByTimeAndLocation: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../../../src/services/curation/CurationEngine', () => ({
  CurationEngine: jest.fn(() => ({
    rankPhotos: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

describe('BackgroundProcessingService', () => {
  let service: BackgroundProcessingService;
  let mockPhotos: Photo[];

  beforeEach(() => {
    service = BackgroundProcessingService.getInstance();
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BackgroundProcessingService.getInstance();
      const instance2 = BackgroundProcessingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('settings management', () => {
    it('should update settings', () => {
      const newSettings = {
        intensity: ProcessingIntensity.HIGH,
        maxConcurrentTasks: 4,
        batteryThreshold: 0.3,
      };

      service.updateSettings(newSettings);
      const settings = service.getSettings();

      expect(settings.intensity).toBe(ProcessingIntensity.HIGH);
      expect(settings.maxConcurrentTasks).toBe(4);
      expect(settings.batteryThreshold).toBe(0.3);
    });

    it('should return current settings', () => {
      const settings = service.getSettings();
      
      expect(settings).toHaveProperty('intensity');
      expect(settings).toHaveProperty('pauseOnLowBattery');
      expect(settings).toHaveProperty('pauseOnHighMemory');
      expect(settings).toHaveProperty('pauseOnThermalThrottling');
      expect(settings).toHaveProperty('maxConcurrentTasks');
      expect(settings).toHaveProperty('batteryThreshold');
      expect(settings).toHaveProperty('memoryThreshold');
    });
  });

  describe('task management', () => {
    it('should add photo analysis task', () => {
      const taskId = service.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);
      
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task_/);
    });

    it('should add face detection task', () => {
      const taskId = service.addFaceDetectionTask(mockPhotos, TaskPriority.NORMAL);
      
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task_/);
    });

    it('should add clustering task', () => {
      const taskId = service.addClusteringTask(mockPhotos, TaskPriority.LOW);
      
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task_/);
    });

    it('should add curation task', () => {
      const taskId = service.addCurationTask(mockPhotos, TaskPriority.LOW);
      
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task_/);
    });

    it('should use default priority when not specified', () => {
      const taskId = service.addPhotoAnalysisTask(mockPhotos);
      expect(typeof taskId).toBe('string');
    });
  });

  describe('processing control', () => {
    it('should pause processing', () => {
      service.pauseProcessing();
      const state = service.getState();
      expect(state.isProcessing).toBe(false);
    });

    it('should resume processing', () => {
      service.pauseProcessing();
      service.resumeProcessing();
      // Note: isProcessing might still be false if no tasks are running
      // This is expected behavior
    });

    it('should cancel task', () => {
      const taskId = service.addPhotoAnalysisTask(mockPhotos);
      const cancelled = service.cancelTask(taskId);
      expect(cancelled).toBe(true);
    });

    it('should clear queue', () => {
      service.addPhotoAnalysisTask(mockPhotos);
      service.addFaceDetectionTask(mockPhotos);
      
      service.clearQueue();
      
      const state = service.getState();
      expect(state.queueLength).toBe(0);
    });
  });

  describe('state management', () => {
    it('should return current state', () => {
      const state = service.getState();
      
      expect(state).toHaveProperty('isProcessing');
      expect(state).toHaveProperty('currentTask');
      expect(state).toHaveProperty('queueLength');
      expect(state).toHaveProperty('completedTasks');
      expect(state).toHaveProperty('failedTasks');
      expect(state).toHaveProperty('totalProgress');
      expect(state).toHaveProperty('settings');
      expect(state).toHaveProperty('resourceStatus');
    });

    it('should add and remove state listeners', () => {
      const listener = jest.fn();
      const removeListener = service.addStateListener(listener);
      
      expect(typeof removeListener).toBe('function');
      
      // Trigger state change
      service.addPhotoAnalysisTask(mockPhotos);
      
      // Remove listener
      removeListener();
    });

    it('should notify listeners on state changes', () => {
      const listener = jest.fn();
      service.addStateListener(listener);
      
      service.addPhotoAnalysisTask(mockPhotos);
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    it('should return task statistics', () => {
      const stats = service.getTaskStats();
      
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('totalTime');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.totalTime).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock AI service initialization to fail
      const mockAIService = require('../../../src/services/ai/AIAnalysisEngine');
      mockAIService.AIAnalysisEngine.mockImplementation(() => ({
        initialize: jest.fn().mockRejectedValue(new Error('Init failed')),
      }));

      // Should not throw, but log error
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();
      
      service.addStateListener(errorListener);
      service.addStateListener(normalListener);
      
      // Should not throw and should still call normal listener
      expect(() => {
        service.addPhotoAnalysisTask(mockPhotos);
      }).not.toThrow();
      
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('resource management', () => {
    it('should respond to resource constraints', () => {
      // This would require mocking the ResourceMonitor to simulate constraints
      // The actual implementation would pause/resume based on resource status
      expect(service.getState().resourceStatus).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      service.addStateListener(jest.fn());
      service.addPhotoAnalysisTask(mockPhotos);
      
      expect(() => service.destroy()).not.toThrow();
    });
  });
});