import { useState, useEffect, useCallback } from 'react';
import { 
  BackgroundProcessingService 
} from '../services/background/BackgroundProcessingService';
import { 
  BackgroundProcessingState, 
  ProcessingSettings, 
  TaskPriority 
} from '../types/background';
import { Photo } from '../types/photo';

export const useBackgroundProcessing = () => {
  const [state, setState] = useState<BackgroundProcessingState | null>(null);
  const [service] = useState(() => BackgroundProcessingService.getInstance());

  useEffect(() => {
    // Initialize service
    service.initialize().catch(console.error);

    // Subscribe to state changes
    const unsubscribe = service.addStateListener(setState);

    // Get initial state
    setState(service.getState());

    return unsubscribe;
  }, [service]);

  const updateSettings = useCallback((settings: Partial<ProcessingSettings>) => {
    service.updateSettings(settings);
  }, [service]);

  const addPhotoAnalysisTask = useCallback((photos: Photo[], priority?: TaskPriority) => {
    return service.addPhotoAnalysisTask(photos, priority);
  }, [service]);

  const addFaceDetectionTask = useCallback((photos: Photo[], priority?: TaskPriority) => {
    return service.addFaceDetectionTask(photos, priority);
  }, [service]);

  const addClusteringTask = useCallback((photos: Photo[], priority?: TaskPriority) => {
    return service.addClusteringTask(photos, priority);
  }, [service]);

  const addCurationTask = useCallback((photos: Photo[], priority?: TaskPriority) => {
    return service.addCurationTask(photos, priority);
  }, [service]);

  const pauseProcessing = useCallback(() => {
    service.pauseProcessing();
  }, [service]);

  const resumeProcessing = useCallback(() => {
    service.resumeProcessing();
  }, [service]);

  const cancelTask = useCallback((taskId: string) => {
    return service.cancelTask(taskId);
  }, [service]);

  const clearQueue = useCallback(() => {
    service.clearQueue();
  }, [service]);

  const getTaskStats = useCallback(() => {
    return service.getTaskStats();
  }, [service]);

  return {
    state,
    updateSettings,
    addPhotoAnalysisTask,
    addFaceDetectionTask,
    addClusteringTask,
    addCurationTask,
    pauseProcessing,
    resumeProcessing,
    cancelTask,
    clearQueue,
    getTaskStats,
  };
};