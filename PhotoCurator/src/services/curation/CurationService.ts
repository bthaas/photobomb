/**
 * CurationService - High-level service for photo curation operations
 */

import {
  Photo,
  PhotoCluster,
  CurationGoal,
  CurationWeights,
  CurationResult,
  RankedPhoto,
  UserFeedback,
  CurationPreferences
} from '../../types';
import { CurationEngine } from './CurationEngine';

export class CurationService {
  private curationEngine: CurationEngine;

  constructor() {
    this.curationEngine = new CurationEngine();
  }

  /**
   * Curate photos from multiple clusters
   */
  async curatePhotos(
    clusters: PhotoCluster[],
    goal: CurationGoal,
    maxPhotosPerCluster: number = 3,
    customWeights?: CurationWeights
  ): Promise<CurationResult> {
    const startTime = Date.now();
    const selectedPhotos: RankedPhoto[] = [];
    let totalPhotos = 0;

    for (const cluster of clusters) {
      totalPhotos += cluster.photos.length;
      
      if (cluster.photos.length === 0) continue;

      // Rank photos in this cluster
      const rankedPhotos = await this.curationEngine.rankPhotos(
        cluster,
        goal,
        customWeights
      );

      // Select top photos from this cluster
      const topPhotos = rankedPhotos.slice(0, maxPhotosPerCluster);
      selectedPhotos.push(...topPhotos);
    }

    // Re-rank all selected photos globally
    selectedPhotos.sort((a, b) => b.score - a.score);
    selectedPhotos.forEach((photo, index) => {
      photo.rank = index + 1;
    });

    const processingTime = Date.now() - startTime;
    const weights = customWeights || this.curationEngine.getCurationWeights(goal);

    return {
      goal,
      selectedPhotos,
      totalPhotos,
      processingTime,
      weights,
      createdAt: new Date()
    };
  }

  /**
   * Curate a single cluster
   */
  async curateSingleCluster(
    cluster: PhotoCluster,
    goal: CurationGoal,
    maxPhotos: number = 5,
    customWeights?: CurationWeights
  ): Promise<CurationResult> {
    const startTime = Date.now();
    
    const rankedPhotos = await this.curationEngine.rankPhotos(
      cluster,
      goal,
      customWeights
    );

    const selectedPhotos = rankedPhotos.slice(0, maxPhotos);
    const processingTime = Date.now() - startTime;
    const weights = customWeights || this.curationEngine.getCurationWeights(goal);

    return {
      goal,
      selectedPhotos,
      totalPhotos: cluster.photos.length,
      processingTime,
      weights,
      createdAt: new Date()
    };
  }

  /**
   * Get best shot from a cluster
   */
  async getBestShot(
    cluster: PhotoCluster,
    goal: CurationGoal = CurationGoal.BALANCED,
    customWeights?: CurationWeights
  ): Promise<Photo | null> {
    if (cluster.photos.length === 0) return null;

    const bestShots = await this.curationEngine.selectBestShots(
      cluster,
      1,
      goal,
      customWeights
    );

    return bestShots[0] || null;
  }

  /**
   * Compare photos within a cluster
   */
  async comparePhotos(
    photos: Photo[],
    goal: CurationGoal,
    customWeights?: CurationWeights
  ): Promise<RankedPhoto[]> {
    // Create a temporary cluster for comparison
    const tempCluster: PhotoCluster = {
      id: 'temp-comparison',
      type: 'visual_similarity' as any,
      photos,
      centroid: [],
      confidence: 1.0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.curationEngine.rankPhotos(tempCluster, goal, customWeights);
  }

  /**
   * Process user feedback
   */
  async processFeedback(feedback: UserFeedback): Promise<void> {
    await this.curationEngine.learnFromUserFeedback(feedback);
  }

  /**
   * Get curation weights for a goal
   */
  getCurationWeights(goal: CurationGoal): CurationWeights {
    return this.curationEngine.getCurationWeights(goal);
  }

  /**
   * Update curation weights
   */
  async updateCurationWeights(goal: CurationGoal, weights: CurationWeights): Promise<void> {
    await this.curationEngine.updateCurationWeights(goal, weights);
  }

  /**
   * Get curation statistics
   */
  getCurationStats(result: CurationResult): {
    averageScore: number;
    scoreDistribution: { range: string; count: number }[];
    topReasons: string[];
  } {
    const scores = result.selectedPhotos.map(p => p.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Score distribution
    const scoreDistribution = [
      { range: '0.9-1.0', count: 0 },
      { range: '0.8-0.9', count: 0 },
      { range: '0.7-0.8', count: 0 },
      { range: '0.6-0.7', count: 0 },
      { range: '0.5-0.6', count: 0 },
      { range: '0.0-0.5', count: 0 }
    ];

    scores.forEach(score => {
      if (score >= 0.9) scoreDistribution[0].count++;
      else if (score >= 0.8) scoreDistribution[1].count++;
      else if (score >= 0.7) scoreDistribution[2].count++;
      else if (score >= 0.6) scoreDistribution[3].count++;
      else if (score >= 0.5) scoreDistribution[4].count++;
      else scoreDistribution[5].count++;
    });

    // Top reasons
    const allReasons: string[] = [];
    result.selectedPhotos.forEach(photo => {
      allReasons.push(...photo.reasoning);
    });

    const reasonCounts = allReasons.reduce((counts, reason) => {
      counts[reason] = (counts[reason] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const topReasons = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason]) => reason);

    return {
      averageScore,
      scoreDistribution,
      topReasons
    };
  }
}