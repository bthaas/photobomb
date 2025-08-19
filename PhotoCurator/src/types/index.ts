// Core Types for AI Photo Curator

export interface Photo {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  fileSize: number;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  // AI Analysis Results
  aiAnalysis?: PhotoAnalysis;
  // User Actions
  isSelected: boolean;
  isFavorite: boolean;
  isDeleted: boolean;
  tags: string[];
}

export interface PhotoAnalysis {
  // Technical Quality Scores (0-1)
  sharpnessScore: number;
  exposureScore: number;
  colorBalanceScore: number;
  
  // Compositional Quality Scores (0-1)
  compositionScore: number;
  ruleOfThirdsScore: number;
  
  // Content Quality Scores (0-1)
  faceCount: number;
  smileScore: number;
  eyesOpenScore: number;
  emotionalScore: number;
  
  // Overall Quality Score (0-1)
  overallScore: number;
  
  // Detected Features
  faces: FaceDetection[];
  objects: ObjectDetection[];
  
  // Clustering Data
  visualEmbedding: number[];
  clusterId?: string;
  
  // Processing Status
  isAnalyzed: boolean;
  analysisTimestamp: number;
}

export interface FaceDetection {
  id: string;
  boundingBox: BoundingBox;
  confidence: number;
  landmarks?: FaceLandmark[];
  personId?: string; // For face recognition
  emotions?: EmotionScores;
}

export interface ObjectDetection {
  id: string;
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmark {
  type: 'eye_left' | 'eye_right' | 'nose' | 'mouth_left' | 'mouth_right';
  x: number;
  y: number;
}

export interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  neutral: number;
}

export interface PhotoCluster {
  id: string;
  name: string;
  photos: Photo[];
  clusterType: 'event' | 'location' | 'person' | 'visual_similarity';
  centroid?: number[]; // Visual embedding centroid
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface CurationGoal {
  id: string;
  name: string;
  description: string;
  weights: {
    technical: number;
    compositional: number;
    content: number;
    personal: number; // Based on user preferences
  };
  filters: {
    minFaces?: number;
    maxFaces?: number;
    requireSmiles?: boolean;
    landscapeOnly?: boolean;
    portraitOnly?: boolean;
  };
}

export interface CurationSession {
  id: string;
  goalId: string;
  photos: Photo[];
  selectedPhotos: Photo[];
  status: 'analyzing' | 'ready' | 'completed';
  progress: number; // 0-1
  startTime: number;
  endTime?: number;
}

export interface AIModel {
  name: string;
  version: string;
  type: 'face_detection' | 'object_detection' | 'quality_assessment' | 'aesthetic_scoring';
  isLoaded: boolean;
  modelUrl: string;
  size: number; // in bytes
}

export interface UserPreferences {
  curationGoals: CurationGoal[];
  defaultGoalId: string;
  autoAnalyze: boolean;
  backgroundProcessing: boolean;
  hapticFeedback: boolean;
  cloudSync: boolean;
  privacyMode: boolean; // Disable face recognition
}

export interface AppState {
  // Photo Management
  photos: Photo[];
  clusters: PhotoCluster[];
  currentSession?: CurationSession;
  
  // AI Models
  models: AIModel[];
  isModelLoading: boolean;
  
  // User Preferences
  preferences: UserPreferences;
  
  // UI State
  isAnalyzing: boolean;
  analysisProgress: number;
  selectedPhotos: string[];
  currentView: 'import' | 'analyze' | 'curate' | 'review' | 'export';
  
  // Performance
  lastAnalysisTime: number;
  totalPhotosAnalyzed: number;
}

// Navigation Types
export type RootStackParamList = {
  Main: undefined;
  PhotoDetail: { photoId: string };
  CurationSession: { sessionId: string };
  Settings: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Import: undefined;
  Analyze: undefined;
  Curate: undefined;
  Review: undefined;
};

// API Types (for future backend integration)
export interface User {
  id: string;
  email: string;
  createdAt: number;
  preferences: UserPreferences;
  subscription?: {
    type: 'free' | 'premium';
    expiresAt?: number;
  };
}

export interface CloudAlbum {
  id: string;
  name: string;
  photos: string[]; // Photo IDs
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  shareUrl?: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Performance Monitoring
export interface PerformanceMetrics {
  analysisTimePerPhoto: number;
  memoryUsage: number;
  batteryImpact: 'low' | 'medium' | 'high';
  modelInferenceTime: number;
}