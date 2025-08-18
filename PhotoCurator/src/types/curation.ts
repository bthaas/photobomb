/**
 * Curation and ranking data models
 */

import { Photo } from './photo';
import { PhotoCluster } from './clustering';

export enum CurationGoal {
  BEST_SCENIC = 'best_scenic',
  BEST_PORTRAITS = 'best_portraits',
  MOST_CREATIVE = 'most_creative',
  BEST_TECHNICAL = 'best_technical',
  MOST_EMOTIONAL = 'most_emotional',
  BALANCED = 'balanced'
}

export interface CurationWeights {
  qualityWeight: number;
  compositionWeight: number;
  contentWeight: number;
  uniquenessWeight: number;
  emotionalWeight: number;
}

export interface RankedPhoto {
  photo: Photo;
  rank: number;
  score: number;
  scoreBreakdown: {
    quality: number;
    composition: number;
    content: number;
    uniqueness: number;
    emotional: number;
  };
  reasoning: string[];
}

export interface CurationResult {
  goal: CurationGoal;
  selectedPhotos: RankedPhoto[];
  totalPhotos: number;
  processingTime: number;
  weights: CurationWeights;
  createdAt: Date;
}

export interface UserFeedback {
  photoId: string;
  action: 'keep' | 'discard' | 'favorite';
  context: {
    clusterId?: string;
    curationGoal: CurationGoal;
    originalRank: number;
    originalScore: number;
  };
  timestamp: Date;
}

export interface CurationPreferences {
  userId: string;
  defaultGoal: CurationGoal;
  customWeights?: CurationWeights;
  learningEnabled: boolean;
  feedbackHistory: UserFeedback[];
  updatedAt: Date;
}