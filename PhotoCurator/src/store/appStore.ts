import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  AppState, 
  Photo, 
  PhotoCluster, 
  CurationSession, 
  UserPreferences, 
  AIModel,
  CurationGoal 
} from '../types';

// Default curation goals
const defaultCurationGoals: CurationGoal[] = [
  {
    id: 'best_shots',
    name: 'Best Shots',
    description: 'Select the highest quality photos with good composition and technical quality',
    weights: {
      technical: 0.4,
      compositional: 0.3,
      content: 0.2,
      personal: 0.1,
    },
    filters: {},
  },
  {
    id: 'best_portraits',
    name: 'Best Portraits',
    description: 'Focus on photos with people, prioritizing smiles and good facial composition',
    weights: {
      technical: 0.3,
      compositional: 0.2,
      content: 0.4,
      personal: 0.1,
    },
    filters: {
      minFaces: 1,
      requireSmiles: true,
    },
  },
  {
    id: 'scenic_shots',
    name: 'Scenic Shots',
    description: 'Beautiful landscape and scenic photos with great composition',
    weights: {
      technical: 0.3,
      compositional: 0.5,
      content: 0.1,
      personal: 0.1,
    },
    filters: {
      maxFaces: 0,
      landscapeOnly: true,
    },
  },
];

const defaultPreferences: UserPreferences = {
  curationGoals: defaultCurationGoals,
  defaultGoalId: 'best_shots',
  autoAnalyze: true,
  backgroundProcessing: true,
  hapticFeedback: true,
  cloudSync: false,
  privacyMode: false,
};

interface AppStore extends AppState {
  // Photo Management Actions
  addPhotos: (photos: Photo[]) => void;
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  deletePhoto: (photoId: string) => void;
  selectPhoto: (photoId: string) => void;
  deselectPhoto: (photoId: string) => void;
  togglePhotoSelection: (photoId: string) => void;
  clearSelection: () => void;
  
  // Cluster Management
  addCluster: (cluster: PhotoCluster) => void;
  updateCluster: (clusterId: string, updates: Partial<PhotoCluster>) => void;
  
  // Curation Session Management
  startCurationSession: (goalId: string, photos: Photo[]) => CurationSession;
  updateCurationSession: (sessionId: string, updates: Partial<CurationSession>) => void;
  completeCurationSession: (sessionId: string) => void;
  
  // AI Model Management
  updateModelStatus: (modelName: string, updates: Partial<AIModel>) => void;
  setModelLoading: (loading: boolean) => void;
  
  // Analysis State
  setAnalyzing: (analyzing: boolean) => void;
  setAnalysisProgress: (progress: number) => void;
  incrementAnalyzedCount: () => void;
  
  // UI State
  setCurrentView: (view: AppState['currentView']) => void;
  
  // Preferences
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  addCurationGoal: (goal: CurationGoal) => void;
  updateCurationGoal: (goalId: string, updates: Partial<CurationGoal>) => void;
  deleteCurationGoal: (goalId: string) => void;
  
  // Utility Actions
  reset: () => void;
  getPhotoById: (photoId: string) => Photo | undefined;
  getSelectedPhotos: () => Photo[];
  getPhotosByCluster: (clusterId: string) => Photo[];
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    photos: [],
    clusters: [],
    currentSession: undefined,
    models: [
      {
        name: 'face_detection',
        version: '1.0.0',
        type: 'face_detection',
        isLoaded: false,
        modelUrl: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/model.json',
        size: 1024 * 1024, // 1MB
      },
      {
        name: 'quality_assessment',
        version: '1.0.0',
        type: 'quality_assessment',
        isLoaded: false,
        modelUrl: '', // Custom model URL will be set later
        size: 2 * 1024 * 1024, // 2MB
      },
    ],
    isModelLoading: false,
    preferences: defaultPreferences,
    isAnalyzing: false,
    analysisProgress: 0,
    selectedPhotos: [],
    currentView: 'import',
    lastAnalysisTime: 0,
    totalPhotosAnalyzed: 0,

    // Photo Management Actions
    addPhotos: (photos) =>
      set((state) => ({
        photos: [...state.photos, ...photos],
      })),

    updatePhoto: (photoId, updates) =>
      set((state) => ({
        photos: state.photos.map((photo) =>
          photo.id === photoId ? { ...photo, ...updates } : photo
        ),
      })),

    deletePhoto: (photoId) =>
      set((state) => ({
        photos: state.photos.filter((photo) => photo.id !== photoId),
        selectedPhotos: state.selectedPhotos.filter((id) => id !== photoId),
      })),

    selectPhoto: (photoId) =>
      set((state) => ({
        selectedPhotos: state.selectedPhotos.includes(photoId)
          ? state.selectedPhotos
          : [...state.selectedPhotos, photoId],
      })),

    deselectPhoto: (photoId) =>
      set((state) => ({
        selectedPhotos: state.selectedPhotos.filter((id) => id !== photoId),
      })),

    togglePhotoSelection: (photoId) => {
      const { selectedPhotos } = get();
      if (selectedPhotos.includes(photoId)) {
        get().deselectPhoto(photoId);
      } else {
        get().selectPhoto(photoId);
      }
    },

    clearSelection: () =>
      set(() => ({
        selectedPhotos: [],
      })),

    // Cluster Management
    addCluster: (cluster) =>
      set((state) => ({
        clusters: [...state.clusters, cluster],
      })),

    updateCluster: (clusterId, updates) =>
      set((state) => ({
        clusters: state.clusters.map((cluster) =>
          cluster.id === clusterId ? { ...cluster, ...updates } : cluster
        ),
      })),

    // Curation Session Management
    startCurationSession: (goalId, photos) => {
      const session: CurationSession = {
        id: `session_${Date.now()}`,
        goalId,
        photos,
        selectedPhotos: [],
        status: 'analyzing',
        progress: 0,
        startTime: Date.now(),
      };

      set(() => ({ currentSession: session }));
      return session;
    },

    updateCurationSession: (sessionId, updates) =>
      set((state) => ({
        currentSession:
          state.currentSession?.id === sessionId
            ? { ...state.currentSession, ...updates }
            : state.currentSession,
      })),

    completeCurationSession: (sessionId) =>
      set((state) => ({
        currentSession:
          state.currentSession?.id === sessionId
            ? { ...state.currentSession, status: 'completed', endTime: Date.now() }
            : state.currentSession,
      })),

    // AI Model Management
    updateModelStatus: (modelName, updates) =>
      set((state) => ({
        models: state.models.map((model) =>
          model.name === modelName ? { ...model, ...updates } : model
        ),
      })),

    setModelLoading: (loading) =>
      set(() => ({
        isModelLoading: loading,
      })),

    // Analysis State
    setAnalyzing: (analyzing) =>
      set(() => ({
        isAnalyzing: analyzing,
      })),

    setAnalysisProgress: (progress) =>
      set(() => ({
        analysisProgress: progress,
      })),

    incrementAnalyzedCount: () =>
      set((state) => ({
        totalPhotosAnalyzed: state.totalPhotosAnalyzed + 1,
      })),

    // UI State
    setCurrentView: (view) =>
      set(() => ({
        currentView: view,
      })),

    // Preferences
    updatePreferences: (updates) =>
      set((state) => ({
        preferences: { ...state.preferences, ...updates },
      })),

    addCurationGoal: (goal) =>
      set((state) => ({
        preferences: {
          ...state.preferences,
          curationGoals: [...state.preferences.curationGoals, goal],
        },
      })),

    updateCurationGoal: (goalId, updates) =>
      set((state) => ({
        preferences: {
          ...state.preferences,
          curationGoals: state.preferences.curationGoals.map((goal) =>
            goal.id === goalId ? { ...goal, ...updates } : goal
          ),
        },
      })),

    deleteCurationGoal: (goalId) =>
      set((state) => ({
        preferences: {
          ...state.preferences,
          curationGoals: state.preferences.curationGoals.filter(
            (goal) => goal.id !== goalId
          ),
        },
      })),

    // Utility Actions
    reset: () =>
      set(() => ({
        photos: [],
        clusters: [],
        currentSession: undefined,
        selectedPhotos: [],
        isAnalyzing: false,
        analysisProgress: 0,
        currentView: 'import',
        totalPhotosAnalyzed: 0,
      })),

    getPhotoById: (photoId) => {
      const { photos } = get();
      return photos.find((photo) => photo.id === photoId);
    },

    getSelectedPhotos: () => {
      const { photos, selectedPhotos } = get();
      return photos.filter((photo) => selectedPhotos.includes(photo.id));
    },

    getPhotosByCluster: (clusterId) => {
      const { photos } = get();
      return photos.filter((photo) => photo.aiAnalysis?.clusterId === clusterId);
    },
  }))
);

// Selectors for optimized re-renders
export const usePhotos = () => useAppStore((state) => state.photos);
export const useSelectedPhotos = () => useAppStore((state) => state.getSelectedPhotos());
export const useClusters = () => useAppStore((state) => state.clusters);
export const useCurrentSession = () => useAppStore((state) => state.currentSession);
export const useIsAnalyzing = () => useAppStore((state) => state.isAnalyzing);
export const useAnalysisProgress = () => useAppStore((state) => state.analysisProgress);
export const usePreferences = () => useAppStore((state) => state.preferences);
export const useCurrentView = () => useAppStore((state) => state.currentView);

// Performance monitoring
useAppStore.subscribe(
  (state) => state.totalPhotosAnalyzed,
  (totalAnalyzed) => {
    if (totalAnalyzed > 0 && totalAnalyzed % 100 === 0) {
      console.log(`Performance: Analyzed ${totalAnalyzed} photos`);
    }
  }
);