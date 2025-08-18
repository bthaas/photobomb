// Core photo types
export * from './photo';

// Clustering types
export * from './clustering';

// Curation types
export * from './curation';

// Sync types
export * from './sync';

// Editing types
export * from './editing';

// Background processing types
export * from './background';

// Authentication types
export * from './auth';

// Common utility types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ProcessingProgress {
  current: number;
  total: number;
  percentage: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

// Photo source enum
export enum PhotoSource {
  CAMERA_ROLL = 'camera_roll',
  GOOGLE_PHOTOS = 'google_photos',
  ICLOUD = 'icloud',
}
