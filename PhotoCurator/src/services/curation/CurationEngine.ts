/**
 * CurationEngine - Core service for photo ranking and curation
 */

import {
  Photo,
  PhotoCluster,
  CurationGoal,
  CurationWeights,
  RankedPhoto,
  CurationResult,
  UserFeedback,
  CurationPreferences,
  QualityScore,
  CompositionScore,
  ContentScore
} from '../../types';

export class CurationEngine {
  private defaultWeights: Record<CurationGoal, CurationWeights> = {
    [CurationGoal.BEST_SCENIC]: {
      qualityWeight: 0.3,
      compositionWeight: 0.4,
      contentWeight: 0.1,
      uniquenessWeight: 0.15,
      emotionalWeight: 0.05
    },
    [CurationGoal.BEST_PORTRAITS]: {
      qualityWeight: 0.25,
      compositionWeight: 0.2,
      contentWeight: 0.4,
      uniquenessWeight: 0.1,
      emotionalWeight: 0.05
    },
    [CurationGoal.MOST_CREATIVE]: {
      qualityWeight: 0.15,
      compositionWeight: 0.35,
      contentWeight: 0.2,
      uniquenessWeight: 0.25,
      emotionalWeight: 0.05
    },
    [CurationGoal.BEST_TECHNICAL]: {
      qualityWeight: 0.5,
      compositionWeight: 0.3,
      contentWeight: 0.1,
      uniquenessWeight: 0.05,
      emotionalWeight: 0.05
    },
    [CurationGoal.MOST_EMOTIONAL]: {
      qualityWeight: 0.2,
      compositionWeight: 0.15,
      contentWeight: 0.5,
      uniquenessWeight: 0.1,
      emotionalWeight: 0.05
    },
    [CurationGoal.BALANCED]: {
      qualityWeight: 0.25,
      compositionWeight: 0.25,
      contentWeight: 0.25,
      uniquenessWeight: 0.15,
      emotionalWeight: 0.1
    }
  };

  private userPreferences: Map<string, CurationPreferences> = new Map();

  /**
   * Rank photos within a cluster based on curation goal
   */
  async rankPhotos(
    cluster: PhotoCluster,
    goal: CurationGoal,
    customWeights?: CurationWeights
  ): Promise<RankedPhoto[]> {
    const startTime = Date.now();
    
    const weights = customWeights || this.defaultWeights[goal];
    const rankedPhotos: RankedPhoto[] = [];

    for (const photo of cluster.photos) {
      const score = await this.calculatePhotoScore(photo, weights, cluster);
      const reasoning = this.generateReasoning(photo, score.scoreBreakdown, goal);

      rankedPhotos.push({
        photo,
        rank: 0, // Will be set after sorting
        score: score.overall,
        scoreBreakdown: score.scoreBreakdown,
        reasoning
      });
    }

    // Sort by score (highest first) and assign ranks
    rankedPhotos.sort((a, b) => b.score - a.score);
    rankedPhotos.forEach((rankedPhoto, index) => {
      rankedPhoto.rank = index + 1;
    });

    console.log(`Ranked ${rankedPhotos.length} photos in ${Date.now() - startTime}ms`);
    return rankedPhotos;
  }

  /**
   * Select best shots from a cluster
   */
  async selectBestShots(
    cluster: PhotoCluster,
    count: number,
    goal: CurationGoal = CurationGoal.BALANCED,
    customWeights?: CurationWeights
  ): Promise<Photo[]> {
    const rankedPhotos = await this.rankPhotos(cluster, goal, customWeights);
    return rankedPhotos.slice(0, count).map(rp => rp.photo);
  }

  /**
   * Process user feedback to improve future recommendations
   */
  async learnFromUserFeedback(feedback: UserFeedback): Promise<void> {
    // Store feedback for learning
    const userId = 'default'; // In real app, get from auth context
    let preferences = this.userPreferences.get(userId);
    
    if (!preferences) {
      preferences = {
        userId,
        defaultGoal: CurationGoal.BALANCED,
        learningEnabled: true,
        feedbackHistory: [],
        updatedAt: new Date()
      };
    }

    preferences.feedbackHistory.push(feedback);
    preferences.updatedAt = new Date();
    
    // Limit feedback history to last 1000 entries
    if (preferences.feedbackHistory.length > 1000) {
      preferences.feedbackHistory = preferences.feedbackHistory.slice(-1000);
    }

    this.userPreferences.set(userId, preferences);

    // Update weights based on feedback patterns
    await this.updateWeightsFromFeedback(preferences);
  }

  /**
   * Update curation weights based on goal
   */
  async updateCurationWeights(goal: CurationGoal, customWeights: CurationWeights): Promise<void> {
    this.defaultWeights[goal] = { ...customWeights };
  }

  /**
   * Get curation weights for a goal
   */
  getCurationWeights(goal: CurationGoal): CurationWeights {
    return { ...this.defaultWeights[goal] };
  }

  /**
   * Calculate comprehensive photo score
   */
  private async calculatePhotoScore(
    photo: Photo,
    weights: CurationWeights,
    cluster: PhotoCluster
  ): Promise<{
    overall: number;
    scoreBreakdown: {
      quality: number;
      composition: number;
      content: number;
      uniqueness: number;
      emotional: number;
    };
  }> {
    const quality = this.calculateQualityScore(photo.qualityScore);
    const composition = this.calculateCompositionScore(photo.compositionScore);
    const content = this.calculateContentScore(photo.contentScore);
    const uniqueness = await this.calculateUniquenessScore(photo, cluster);
    const emotional = this.calculateEmotionalScore(photo);

    const overall = (
      quality * weights.qualityWeight +
      composition * weights.compositionWeight +
      content * weights.contentWeight +
      uniqueness * weights.uniquenessWeight +
      emotional * weights.emotionalWeight
    );

    return {
      overall,
      scoreBreakdown: {
        quality,
        composition,
        content,
        uniqueness,
        emotional
      }
    };
  }

  /**
   * Calculate quality score from photo analysis
   */
  private calculateQualityScore(qualityScore?: QualityScore): number {
    if (!qualityScore) return 0.5; // Default neutral score
    
    return qualityScore.overall;
  }

  /**
   * Calculate composition score from photo analysis
   */
  private calculateCompositionScore(compositionScore?: CompositionScore): number {
    if (!compositionScore) return 0.5; // Default neutral score
    
    return compositionScore.overall;
  }

  /**
   * Calculate content score from photo analysis
   */
  private calculateContentScore(contentScore?: ContentScore): number {
    if (!contentScore) return 0.5; // Default neutral score
    
    return contentScore.overall;
  }

  /**
   * Calculate uniqueness score within cluster
   */
  private async calculateUniquenessScore(photo: Photo, cluster: PhotoCluster): Promise<number> {
    if (!photo.features?.embedding || cluster.photos.length <= 1) {
      return 0.5; // Default score for photos without features or single-photo clusters
    }

    let totalSimilarity = 0;
    let comparisons = 0;

    for (const otherPhoto of cluster.photos) {
      if (otherPhoto.id === photo.id || !otherPhoto.features?.embedding) {
        continue;
      }

      const similarity = this.calculateCosineSimilarity(
        photo.features.embedding,
        otherPhoto.features.embedding
      );
      
      totalSimilarity += similarity;
      comparisons++;
    }

    if (comparisons === 0) return 0.5;

    const averageSimilarity = totalSimilarity / comparisons;
    // Convert similarity to uniqueness (inverse relationship)
    return Math.max(0, 1 - averageSimilarity);
  }

  /**
   * Calculate emotional score from faces and content
   */
  private calculateEmotionalScore(photo: Photo): number {
    if (!photo.faces || photo.faces.length === 0) {
      return 0.5; // Neutral score for photos without faces
    }

    let totalEmotionalScore = 0;
    let faceCount = 0;

    for (const face of photo.faces) {
      if (face.attributes.smile !== undefined) {
        totalEmotionalScore += face.attributes.smile;
        faceCount++;
      }
    }

    if (faceCount === 0) return 0.5;

    return totalEmotionalScore / faceCount;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Generate human-readable reasoning for photo ranking
   */
  private generateReasoning(
    photo: Photo,
    scoreBreakdown: any,
    goal: CurationGoal
  ): string[] {
    const reasoning: string[] = [];

    // Quality reasoning
    if (scoreBreakdown.quality > 0.8) {
      reasoning.push('Excellent technical quality with sharp focus and good exposure');
    } else if (scoreBreakdown.quality < 0.3) {
      reasoning.push('Lower technical quality due to blur, poor exposure, or noise');
    }

    // Composition reasoning
    if (scoreBreakdown.composition > 0.8) {
      reasoning.push('Strong composition following photographic principles');
    } else if (scoreBreakdown.composition < 0.3) {
      reasoning.push('Composition could be improved');
    }

    // Content reasoning based on goal
    if (goal === CurationGoal.BEST_PORTRAITS && photo.faces && photo.faces.length > 0) {
      const smileScore = photo.faces.reduce((sum, face) => sum + (face.attributes.smile || 0), 0) / photo.faces.length;
      if (smileScore > 0.7) {
        reasoning.push('Great portrait with natural smiles');
      }
    }

    // Uniqueness reasoning
    if (scoreBreakdown.uniqueness > 0.7) {
      reasoning.push('Unique shot that stands out from similar photos');
    } else if (scoreBreakdown.uniqueness < 0.3) {
      reasoning.push('Similar to other photos in this group');
    }

    return reasoning.length > 0 ? reasoning : ['Standard photo quality'];
  }

  /**
   * Update weights based on user feedback patterns
   */
  private async updateWeightsFromFeedback(preferences: CurationPreferences): Promise<void> {
    if (!preferences.learningEnabled || preferences.feedbackHistory.length < 10) {
      return; // Need sufficient feedback to learn
    }

    // Analyze feedback patterns and adjust weights
    // This is a simplified learning algorithm - in production, you'd use more sophisticated ML
    const recentFeedback = preferences.feedbackHistory.slice(-50); // Last 50 feedback items
    
    // Count positive vs negative feedback by goal
    const goalFeedback: Record<CurationGoal, { positive: number; negative: number }> = {
      [CurationGoal.BEST_SCENIC]: { positive: 0, negative: 0 },
      [CurationGoal.BEST_PORTRAITS]: { positive: 0, negative: 0 },
      [CurationGoal.MOST_CREATIVE]: { positive: 0, negative: 0 },
      [CurationGoal.BEST_TECHNICAL]: { positive: 0, negative: 0 },
      [CurationGoal.MOST_EMOTIONAL]: { positive: 0, negative: 0 },
      [CurationGoal.BALANCED]: { positive: 0, negative: 0 }
    };

    for (const feedback of recentFeedback) {
      const isPositive = feedback.action === 'keep' || feedback.action === 'favorite';
      if (isPositive) {
        goalFeedback[feedback.context.curationGoal].positive++;
      } else {
        goalFeedback[feedback.context.curationGoal].negative++;
      }
    }

    // Adjust weights based on feedback patterns
    // This is a basic implementation - real ML would be more sophisticated
    for (const [goal, feedback] of Object.entries(goalFeedback)) {
      const total = feedback.positive + feedback.negative;
      if (total > 5) { // Only adjust if we have enough data
        const successRate = feedback.positive / total;
        if (successRate < 0.6) {
          // Poor success rate, slightly adjust weights
          // In a real implementation, you'd analyze which score components correlate with user preferences
        }
      }
    }
  }
}