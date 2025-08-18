/**
 * Clustering and organization data models
 */

import { Photo, Face, GeoLocation } from './photo';

export enum ClusterType {
  VISUAL_SIMILARITY = 'visual_similarity',
  FACE_GROUP = 'face_group',
  EVENT = 'event',
  LOCATION = 'location',
  TIME_PERIOD = 'time_period'
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface PhotoCluster {
  id: string;
  type: ClusterType;
  photos: Photo[];
  centroid: number[];
  confidence: number;
  label?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonCluster {
  id: string;
  name?: string;
  faces: Face[];
  photos: Photo[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventCluster {
  id: string;
  name?: string;
  photos: Photo[];
  timeRange: TimeRange;
  location?: GeoLocation;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClusteringResult {
  clusters: PhotoCluster[];
  unclusteredPhotos: Photo[];
  processingTime: number;
  algorithm: string;
  parameters: Record<string, any>;
}