import { Photo, CurationGoal, PhotoCluster, CurationSession } from '../../types';
import { aiService } from './AIService';

export class CurationEngine {
  private static instance: CurationEngine;

  private constructor() {}

  public static getInstance(): CurationEngine {
    if (!CurationEngine.instance) {
      CurationEngine.instance = new CurationEngine();
    }
    return CurationEngine.instance;
  }

  /**
   * Curate photos based on a specific goal
   */
  async curatePhotos(
    photos: Photo[],
    goal: CurationGoal,
    targetCount?: number
  ): Promise<Photo[]> {
    // Filter photos based on goal criteria
    const filteredPhotos = this.applyGoalFilters(photos, goal);
    
    // Score photos based on goal weights
    const scoredPhotos = this.scorePhotos(filteredPhotos, goal);
    
    // Sort by score (highest first)
    const sortedPhotos = scoredPhotos.sort((a, b) => {
      const scoreA = this.calculatePhotoScore(a, goal);
      const scoreB = this.calculatePhotoScore(b, goal);
      return scoreB - scoreA;
    });
    
    // Return top photos
    if (targetCount && targetCount < sortedPhotos.length) {
      return sortedPhotos.slice(0, targetCount);
    }
    
    return sortedPhotos;
  }

  /**
   * Cluster photos by similarity (event, location, visual similarity)
   */
  async clusterPhotos(photos: Photo[]): Promise<PhotoCluster[]> {
    const clusters: PhotoCluster[] = [];
    
    // Group by time (events)
    const eventClusters = this.clusterByTime(photos);
    clusters.push(...eventClusters);
    
    // Group by location
    const locationClusters = this.clusterByLocation(photos);
    clusters.push(...locationClusters);
    
    // Group by visual similarity
    const visualClusters = await this.clusterByVisualSimilarity(photos);
    clusters.push(...visualClusters);
    
    return clusters;
  }

  /**
   * Suggest the best photos from each cluster
   */
  async suggestBestFromClusters(
    clusters: PhotoCluster[],
    goal: CurationGoal,
    photosPerCluster: number = 1
  ): Promise<Photo[]> {
    const suggestions: Photo[] = [];
    
    for (const cluster of clusters) {
      const bestPhotos = await this.curatePhotos(
        cluster.photos,
        goal,
        photosPerCluster
      );
      suggestions.push(...bestPhotos);
    }
    
    return suggestions;
  }

  /**
   * Create a smart selection based on diversity and quality
   */
  async createSmartSelection(
    photos: Photo[],
    goal: CurationGoal,
    targetCount: number
  ): Promise<Photo[]> {
    // First, cluster photos to ensure diversity
    const clusters = await this.clusterPhotos(photos);
    
    // Calculate how many photos to take from each cluster
    const photosPerCluster = Math.max(1, Math.floor(targetCount / clusters.length));
    const remainingPhotos = targetCount - (photosPerCluster * clusters.length);
    
    const selection: Photo[] = [];
    
    // Get best photos from each cluster
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const count = i < remainingPhotos ? photosPerCluster + 1 : photosPerCluster;
      
      const bestFromCluster = await this.curatePhotos(
        cluster.photos,
        goal,
        count
      );
      
      selection.push(...bestFromCluster);
    }
    
    // If we still need more photos, add the highest scoring remaining ones
    if (selection.length < targetCount) {
      const remainingCandidates = photos.filter(
        photo => !selection.some(selected => selected.id === photo.id)
      );
      
      const additionalPhotos = await this.curatePhotos(
        remainingCandidates,
        goal,
        targetCount - selection.length
      );
      
      selection.push(...additionalPhotos);
    }
    
    return selection.slice(0, targetCount);
  }

  /**
   * Learn from user feedback to improve future curation
   */
  async learnFromFeedback(
    originalSelection: Photo[],
    userSelection: Photo[],
    goal: CurationGoal
  ): Promise<void> {
    // This would implement machine learning to adjust weights based on user preferences
    // For now, we'll just log the feedback
    
    const accepted = userSelection.filter(photo =>
      originalSelection.some(orig => orig.id === photo.id)
    );
    
    const rejected = originalSelection.filter(photo =>
      !userSelection.some(user => user.id === photo.id)
    );
    
    const manuallyAdded = userSelection.filter(photo =>
      !originalSelection.some(orig => orig.id === photo.id)
    );
    
    console.log('Curation Feedback:', {
      goalId: goal.id,
      acceptanceRate: accepted.length / originalSelection.length,
      rejectedCount: rejected.length,
      manuallyAddedCount: manuallyAdded.length,
    });
    
    // TODO: Implement actual learning algorithm
    // This could adjust goal weights or create personalized scoring models
  }

  // Private helper methods

  private applyGoalFilters(photos: Photo[], goal: CurationGoal): Photo[] {
    return photos.filter(photo => {
      const analysis = photo.aiAnalysis;
      if (!analysis) return false;
      
      const filters = goal.filters;
      
      // Face count filters
      if (filters.minFaces !== undefined && analysis.faceCount < filters.minFaces) {
        return false;
      }
      
      if (filters.maxFaces !== undefined && analysis.faceCount > filters.maxFaces) {
        return false;
      }
      
      // Smile requirement
      if (filters.requireSmiles && analysis.smileScore < 0.7) {
        return false;
      }
      
      // Orientation filters
      if (filters.landscapeOnly && photo.width <= photo.height) {
        return false;
      }
      
      if (filters.portraitOnly && photo.width >= photo.height) {
        return false;
      }
      
      return true;
    });
  }

  private scorePhotos(photos: Photo[], goal: CurationGoal): Photo[] {
    return photos.map(photo => ({
      ...photo,
      curationScore: this.calculatePhotoScore(photo, goal),
    }));
  }

  private calculatePhotoScore(photo: Photo, goal: CurationGoal): number {
    const analysis = photo.aiAnalysis;
    if (!analysis) return 0;
    
    const weights = goal.weights;
    
    // Technical score
    const technicalScore = (
      analysis.sharpnessScore * 0.4 +
      analysis.exposureScore * 0.3 +
      analysis.colorBalanceScore * 0.3
    );
    
    // Compositional score
    const compositionalScore = (
      analysis.compositionScore * 0.6 +
      analysis.ruleOfThirdsScore * 0.4
    );
    
    // Content score
    const contentScore = (
      analysis.smileScore * 0.3 +
      analysis.eyesOpenScore * 0.3 +
      analysis.emotionalScore * 0.4
    );
    
    // Personal score (based on user preferences - placeholder)
    const personalScore = photo.isFavorite ? 1.0 : 0.5;
    
    return (
      technicalScore * weights.technical +
      compositionalScore * weights.compositional +
      contentScore * weights.content +
      personalScore * weights.personal
    );
  }

  private clusterByTime(photos: Photo[], timeWindowHours: number = 2): PhotoCluster[] {
    const clusters: PhotoCluster[] = [];
    const sortedPhotos = [...photos].sort((a, b) => a.timestamp - b.timestamp);
    
    let currentCluster: Photo[] = [];
    let lastTimestamp = 0;
    
    for (const photo of sortedPhotos) {
      const timeDiff = (photo.timestamp - lastTimestamp) / (1000 * 60 * 60); // hours
      
      if (timeDiff > timeWindowHours && currentCluster.length > 0) {
        // Start new cluster
        clusters.push({
          id: `event_${clusters.length}`,
          name: `Event ${clusters.length + 1}`,
          photos: currentCluster,
          clusterType: 'event',
          timestamp: currentCluster[0].timestamp,
        });
        currentCluster = [photo];
      } else {
        currentCluster.push(photo);
      }
      
      lastTimestamp = photo.timestamp;
    }
    
    // Add final cluster
    if (currentCluster.length > 0) {
      clusters.push({
        id: `event_${clusters.length}`,
        name: `Event ${clusters.length + 1}`,
        photos: currentCluster,
        clusterType: 'event',
        timestamp: currentCluster[0].timestamp,
      });
    }
    
    return clusters;
  }

  private clusterByLocation(photos: Photo[], radiusKm: number = 1): PhotoCluster[] {
    const clusters: PhotoCluster[] = [];
    const photosWithLocation = photos.filter(photo => photo.location);
    
    if (photosWithLocation.length === 0) return clusters;
    
    const processed = new Set<string>();
    
    for (const photo of photosWithLocation) {
      if (processed.has(photo.id)) continue;
      
      const clusterPhotos = [photo];
      processed.add(photo.id);
      
      for (const other of photosWithLocation) {
        if (processed.has(other.id)) continue;
        
        const distance = this.calculateDistance(
          photo.location!,
          other.location!
        );
        
        if (distance <= radiusKm) {
          clusterPhotos.push(other);
          processed.add(other.id);
        }
      }
      
      if (clusterPhotos.length > 1) {
        clusters.push({
          id: `location_${clusters.length}`,
          name: `Location ${clusters.length + 1}`,
          photos: clusterPhotos,
          clusterType: 'location',
          timestamp: Math.min(...clusterPhotos.map(p => p.timestamp)),
          location: photo.location,
        });
      }
    }
    
    return clusters;
  }

  private async clusterByVisualSimilarity(
    photos: Photo[],
    similarityThreshold: number = 0.8
  ): Promise<PhotoCluster[]> {
    const clusters: PhotoCluster[] = [];
    const photosWithEmbeddings = photos.filter(
      photo => photo.aiAnalysis?.visualEmbedding
    );
    
    if (photosWithEmbeddings.length === 0) return clusters;
    
    const processed = new Set<string>();
    
    for (const photo of photosWithEmbeddings) {
      if (processed.has(photo.id)) continue;
      
      const clusterPhotos = [photo];
      processed.add(photo.id);
      
      for (const other of photosWithEmbeddings) {
        if (processed.has(other.id)) continue;
        
        const similarity = this.cosineSimilarity(
          photo.aiAnalysis!.visualEmbedding,
          other.aiAnalysis!.visualEmbedding
        );
        
        if (similarity >= similarityThreshold) {
          clusterPhotos.push(other);
          processed.add(other.id);
        }
      }
      
      if (clusterPhotos.length > 1) {
        clusters.push({
          id: `visual_${clusters.length}`,
          name: `Similar Photos ${clusters.length + 1}`,
          photos: clusterPhotos,
          clusterType: 'visual_similarity',
          timestamp: Math.min(...clusterPhotos.map(p => p.timestamp)),
        });
      }
    }
    
    return clusters;
  }

  private calculateDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) *
      Math.cos(this.toRadians(loc2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const curationEngine = CurationEngine.getInstance();