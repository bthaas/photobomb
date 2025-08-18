/**
 * Synchronization and cloud data models
 */

import { Photo, PhotoMetadata } from './photo';

export interface SyncConflict {
  id: string;
  photoId: string;
  type: 'metadata_mismatch' | 'version_conflict' | 'deletion_conflict';
  localVersion: Photo | null;
  remoteVersion: Photo | null;
  conflictDetails: Record<string, any>;
  createdAt: Date;
}

export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'metadata_sync';
  photoId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  error?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  operations: SyncOperation[];
  conflicts: SyncConflict[];
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  summary: {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    conflictsResolved: number;
    bytesTransferred: number;
  };
}

export interface CloudPhoto {
  id: string;
  userId: string;
  originalPhotoId: string;
  cloudUrl: string;
  thumbnailUrl: string;
  metadata: PhotoMetadata;
  uploadedAt: Date;
  lastModified: Date;
  tags: string[];
  isPublic: boolean;
}