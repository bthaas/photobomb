/**
 * Core photo data models and interfaces
 */

import { PhotoEdit } from './editing';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  orientation?: number;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  flash?: boolean;
  whiteBalance?: string;
}

export interface PhotoMetadata {
  width: number;
  height: number;
  fileSize: number;
  format: string;
  exif?: ExifData;
  location?: GeoLocation;
  timestamp: Date;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  hex: string;
  percentage: number;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DetectedScene {
  label: string;
  confidence: number;
}

export interface ImageFeatures {
  embedding: number[];
  dominantColors: Color[];
  objects: DetectedObject[];
  scenes: DetectedScene[];
}

export interface QualityScore {
  overall: number;
  sharpness: number;
  exposure: number;
  colorBalance: number;
  noise: number;
}

export interface CompositionScore {
  overall: number;
  ruleOfThirds: number;
  leadingLines: number;
  symmetry: number;
  subjectPlacement: number;
}

export interface ContentScore {
  overall: number;
  faceQuality: number;
  emotionalSentiment: number;
  interestingness: number;
}

export interface Face {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
  embedding: number[];
  confidence: number;
  attributes: {
    age?: number;
    gender?: 'male' | 'female';
    emotion?: string;
    smile?: number;
    eyesOpen?: number;
  };
}



export enum SyncStatus {
  LOCAL_ONLY = 'local_only',
  PENDING_UPLOAD = 'pending_upload',
  UPLOADING = 'uploading',
  SYNCED = 'synced',
  SYNC_ERROR = 'sync_error'
}

export interface Photo {
  id: string;
  uri: string;
  metadata: PhotoMetadata;
  features?: ImageFeatures;
  qualityScore?: QualityScore;
  compositionScore?: CompositionScore;
  contentScore?: ContentScore;
  clusterId?: string;
  faces?: Face[];
  edits?: PhotoEdit[];
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}