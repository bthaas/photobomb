import { renderHook, act } from '@testing-library/react-native';
import { useBackgroundProcessing } from '../../src/hooks/useBackgroundProcessing';
import { TaskPriority, ProcessingIntensity } from '../../src/types/background';
import { Photo } from '../../src/types/photo';

// Define mock constants
const mockProcessingIntensity = 'medium';
const mockThermalState = 'nominal';

// Mock the BackgroundProcessingService
jest.mock('../../src/services/background/BackgroundProcessingService', () => ({
  BackgroundProcessingService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      addStateListener: jest.fn((callback) => {
        // Simulate initial state
        setTimeout(() => {
          callback({
            isProcessing: false,
            currentTask: undefined,
            queueLength: 0,
            completedTasks: 0,
            failedTasks: 0,
            totalProgress: 0,
            settings: {
              intensity: mockProcessingIntensity,
              pauseOnLowBattery: true,
              pauseOnHighMemory: true,
              pauseOnThermalThrottling: true,
              maxConcurrentTasks: 2,
              batteryThreshold: 0.2,
              memoryThreshold: 0.8,
            },
            resourceStatus: {
              batteryLevel: 0.8,
              isCharging: false,
              memoryUsage: 0.4,
              availableMemory: 2000000,
              cpuUsage: 0.3,
              thermalState: mockThermalState,
            },
          });
        }, 0);
        return jest.fn(); // Return unsubscribe function
      }),
      getState: jest.fn(() => ({
        isProcessing: false,
        currentTask: undefined,
        queueLength: 0,
        completedTasks: 0,
        failedTasks: 0,
        totalProgress: 0,
        settings: {
          intensity: mockProcessingIntensity,
          pauseOnLowBattery: true,
          pauseOnHighMemory: true,
          pauseOnThermalThrottling: true,
          maxConcurrentTasks: 2,
          batteryThreshold: 0.2,
          memoryThreshold: 0.8,
        },
        resourceStatus: {
          batteryLevel: 0.8,
          isCharging: false,
          memoryUsage: 0.4,
          availableMemory: 2000000,
          cpuUsage: 0.3,
          thermalState: mockThermalState,
        },
      })),
      updateSettings: jest.fn(),
      addPhotoAnalysisTask: jest.fn(() => 'task_123'),
      addFaceDetectionTask: jest.fn(() => 'task_456'),
      addClusteringTask: jest.fn(() => 'task_789'),
      addCurationTask: jest.fn(() => 'task_abc'),
      pauseProcessing: jest.fn(),
      resumeProcessing: jest.fn(),
      cancelTask: jest.fn(() => true),
      clearQueue: jest.fn(),
      getTaskStats: jest.fn(() => ({
        completed: 5,
        failed: 1,
        totalTime: 30000,
      })),
    })),
  },
}));

describe('useBackgroundProcessing', () => {
  const mockPhotos: Photo[] = [
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
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize and return initial state', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBackgroundProcessing());

    expect(result.current.state).toBeNull();

    await waitForNextUpdate();

    expect(result.current.state).toBeDefined();
    expect(result.current.state?.isProcessing).toBe(false);
    expect(result.current.state?.queueLength).toBe(0);
  });

  it('should provide all expected functions', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    expect(typeof result.current.updateSettings).toBe('function');
    expect(typeof result.current.addPhotoAnalysisTask).toBe('function');
    expect(typeof result.current.addFaceDetectionTask).toBe('function');
    expect(typeof result.current.addClusteringTask).toBe('function');
    expect(typeof result.current.addCurationTask).toBe('function');
    expect(typeof result.current.pauseProcessing).toBe('function');
    expect(typeof result.current.resumeProcessing).toBe('function');
    expect(typeof result.current.cancelTask).toBe('function');
    expect(typeof result.current.clearQueue).toBe('function');
    expect(typeof result.current.getTaskStats).toBe('function');
  });

  it('should update settings', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      result.current.updateSettings({
        intensity: ProcessingIntensity.HIGH,
        maxConcurrentTasks: 4,
      });
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.updateSettings).toHaveBeenCalledWith({
      intensity: ProcessingIntensity.HIGH,
      maxConcurrentTasks: 4,
    });
  });

  it('should add photo analysis task', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      const taskId = result.current.addPhotoAnalysisTask(mockPhotos, TaskPriority.HIGH);
      expect(taskId).toBe('task_123');
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.addPhotoAnalysisTask).toHaveBeenCalledWith(mockPhotos, TaskPriority.HIGH);
  });

  it('should add face detection task', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      const taskId = result.current.addFaceDetectionTask(mockPhotos, TaskPriority.NORMAL);
      expect(taskId).toBe('task_456');
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.addFaceDetectionTask).toHaveBeenCalledWith(mockPhotos, TaskPriority.NORMAL);
  });

  it('should add clustering task', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      const taskId = result.current.addClusteringTask(mockPhotos, TaskPriority.LOW);
      expect(taskId).toBe('task_789');
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.addClusteringTask).toHaveBeenCalledWith(mockPhotos, TaskPriority.LOW);
  });

  it('should add curation task', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      const taskId = result.current.addCurationTask(mockPhotos, TaskPriority.LOW);
      expect(taskId).toBe('task_abc');
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.addCurationTask).toHaveBeenCalledWith(mockPhotos, TaskPriority.LOW);
  });

  it('should pause processing', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      result.current.pauseProcessing();
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.pauseProcessing).toHaveBeenCalled();
  });

  it('should resume processing', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      result.current.resumeProcessing();
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.resumeProcessing).toHaveBeenCalled();
  });

  it('should cancel task', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      const cancelled = result.current.cancelTask('task_123');
      expect(cancelled).toBe(true);
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.cancelTask).toHaveBeenCalledWith('task_123');
  });

  it('should clear queue', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      result.current.clearQueue();
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.clearQueue).toHaveBeenCalled();
  });

  it('should get task stats', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      const stats = result.current.getTaskStats();
      expect(stats).toEqual({
        completed: 5,
        failed: 1,
        totalTime: 30000,
      });
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.getTaskStats).toHaveBeenCalled();
  });

  it('should handle default priority when not specified', () => {
    const { result } = renderHook(() => useBackgroundProcessing());

    act(() => {
      result.current.addPhotoAnalysisTask(mockPhotos);
    });

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    expect(mockService.addPhotoAnalysisTask).toHaveBeenCalledWith(mockPhotos, undefined);
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useBackgroundProcessing());

    const mockService = require('../../src/services/background/BackgroundProcessingService')
      .BackgroundProcessingService.getInstance();
    
    const unsubscribe = mockService.addStateListener.mock.results[0].value;

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});